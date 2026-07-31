import cron from 'node-cron';
import prisma from '../config/database';
import logger from '../config/logger';
import { USASpendingService } from './usaspending.service';
import { SYNC_CONFIG } from '../config/constants';
import { SyncStatus } from '@prisma/client';

export class SyncService {
  private usaSpendingService: USASpendingService;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.usaSpendingService = new USASpendingService();
  }

  startScheduledSync() {
    const interval = process.env.SYNC_INTERVAL_MINUTES || '60';
    const cronExpression = `*/${interval} * * * *`;

    logger.info(`Starting scheduled sync with interval: ${interval} minutes`);

    this.cronJob = cron.schedule(cronExpression, async () => {
      logger.info('Running scheduled sync');
      await this.syncContracts();
    });

    this.cronJob.start();
  }

  stopScheduledSync() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('Scheduled sync stopped');
    }
  }

  async syncContracts() {
    const syncLog = await prisma.syncLog.create({
      data: {
        syncType: 'CONTRACT_SYNC',
        startTime: new Date(),
        status: SyncStatus.IN_PROGRESS,
      },
    });

    try {
      let offset = 0;
      let hasMore = true;
      let totalProcessed = 0;
      let totalCreated = 0;
      let totalUpdated = 0;
      const errors: string[] = [];

      const maxRecords = parseInt(process.env.MAX_RECORDS_PER_SYNC || '100');

      while (hasMore && totalProcessed < maxRecords) {
        try {
          const { awards, hasMore: more } = await this.usaSpendingService.searchAwards({
            limit: Math.min(SYNC_CONFIG.BATCH_SIZE, maxRecords - totalProcessed),
            offset,
          });

          hasMore = more;
          offset += SYNC_CONFIG.BATCH_SIZE;

          for (const rawAward of awards) {
            try {
              const awardData = this.usaSpendingService.transformAwardData(rawAward);
              const result = await this.processAward(awardData);

              totalProcessed++;
              if (result.created) totalCreated++;
              if (result.updated) totalUpdated++;

              if (totalProcessed % 10 === 0) {
                logger.info(`Processed ${totalProcessed} awards`);
              }
            } catch (error) {
              const errorMsg = `Failed to process award: ${error instanceof Error ? error.message : 'Unknown error'}`;
              logger.error(errorMsg, { award: rawAward });
              errors.push(errorMsg);
            }
          }
        } catch (error) {
          const errorMsg = `Failed to fetch awards batch: ${error instanceof Error ? error.message : 'Unknown error'}`;
          logger.error(errorMsg);
          errors.push(errorMsg);
          break;
        }
      }

      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          endTime: new Date(),
          recordsProcessed: totalProcessed,
          recordsCreated: totalCreated,
          recordsUpdated: totalUpdated,
          errors: errors.length > 0 ? JSON.stringify(errors) : null,
          status: errors.length > 0 ? SyncStatus.PARTIAL : SyncStatus.COMPLETED,
        },
      });

      logger.info('Sync completed', {
        processed: totalProcessed,
        created: totalCreated,
        updated: totalUpdated,
        errors: errors.length,
      });

      return {
        success: true,
        processed: totalProcessed,
        created: totalCreated,
        updated: totalUpdated,
        errors,
      };
    } catch (error) {
      await prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          endTime: new Date(),
          errors: error instanceof Error ? error.message : 'Unknown error',
          status: SyncStatus.FAILED,
        },
      });

      logger.error('Sync failed', { error });
      throw error;
    }
  }

  private async processAward(awardData: any) {
    const { awardee, ...contractData } = awardData;

    let awardeeRecord = null;
    if (awardee.uei) {
      awardeeRecord = await prisma.awardee.upsert({
        where: { uei: awardee.uei },
        update: {
          name: awardee.name,
          addressLine1: awardee.addressLine1,
          addressLine2: awardee.addressLine2,
          city: awardee.city,
          state: awardee.state,
          zipCode: awardee.zipCode,
          country: awardee.country,
          businessSize: awardee.businessSize,
        },
        create: awardee,
      });
    } else {
      awardeeRecord = await prisma.awardee.create({
        data: {
          name: awardee.name,
          addressLine1: awardee.addressLine1,
          addressLine2: awardee.addressLine2,
          city: awardee.city,
          state: awardee.state,
          zipCode: awardee.zipCode,
          country: awardee.country,
          businessSize: awardee.businessSize,
        },
      });
    }

    const existingContract = await prisma.contract.findUnique({
      where: { awardId: contractData.awardId },
    });

    if (existingContract) {
      const updated = await prisma.contract.update({
        where: { awardId: contractData.awardId },
        data: {
          ...contractData,
          awardeeId: awardeeRecord.id,
          syncedAt: new Date(),
        },
      });
      return { updated: true, created: false, contract: updated };
    } else {
      const created = await prisma.contract.create({
        data: {
          ...contractData,
          awardeeId: awardeeRecord.id,
        },
      });
      return { created: true, updated: false, contract: created };
    }
  }

  async getRecentSyncLogs(limit = 10) {
    return prisma.syncLog.findMany({
      take: limit,
      orderBy: { startTime: 'desc' },
    });
  }

  async getSyncStatistics() {
    const [totalContracts, totalAwardees, recentSync] = await Promise.all([
      prisma.contract.count(),
      prisma.awardee.count(),
      prisma.syncLog.findFirst({
        where: { status: SyncStatus.COMPLETED },
        orderBy: { startTime: 'desc' },
      }),
    ]);

    return {
      totalContracts,
      totalAwardees,
      lastSuccessfulSync: recentSync?.startTime,
      nextScheduledSync: this.getNextScheduledSync(),
    };
  }

  private getNextScheduledSync(): Date | null {
    return null;
  }
}