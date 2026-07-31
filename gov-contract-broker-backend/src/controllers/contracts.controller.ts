import { Request, Response } from 'express';
import prisma from '../config/database';
import logger from '../config/logger';

export class ContractsController {
  async getContracts(req: Request, res: Response) {
    try {
      const {
        page = '1',
        limit = '20',
        naicsCode,
        awardingAgency,
        minAmount,
        maxAmount,
        startDate,
        endDate,
      } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (naicsCode) where.naicsCode = naicsCode;
      if (awardingAgency) where.awardingAgency = { contains: awardingAgency as string, mode: 'insensitive' };
      if (minAmount || maxAmount) {
        where.awardAmount = {};
        if (minAmount) where.awardAmount.gte = parseFloat(minAmount as string);
        if (maxAmount) where.awardAmount.lte = parseFloat(maxAmount as string);
      }
      if (startDate || endDate) {
        where.awardDate = {};
        if (startDate) where.awardDate.gte = new Date(startDate as string);
        if (endDate) where.awardDate.lte = new Date(endDate as string);
      }

      const [contracts, total] = await Promise.all([
        prisma.contract.findMany({
          where,
          skip,
          take: limitNum,
          include: {
            awardee: true,
            outreachAttempts: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { awardDate: 'desc' },
        }),
        prisma.contract.count({ where }),
      ]);

      res.json({
        success: true,
        data: contracts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      logger.error('Error fetching contracts', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contracts',
      });
    }
  }

  async getContract(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const contract = await prisma.contract.findUnique({
        where: { id },
        include: {
          awardee: true,
          outreachAttempts: {
            orderBy: { createdAt: 'desc' },
          },
          subcontractors: {
            include: {
              subcontractor: true,
            },
          },
        },
      });

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: 'Contract not found',
        });
      }

      res.json({
        success: true,
        data: contract,
      });
    } catch (error) {
      logger.error('Error fetching contract', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch contract',
      });
    }
  }

  async getContractsByNAICS(req: Request, res: Response) {
    try {
      const naicsStats = await prisma.contract.groupBy({
        by: ['naicsCode', 'naicsDescription'],
        _count: {
          id: true,
        },
        _sum: {
          awardAmount: true,
        },
        _avg: {
          awardAmount: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      });

      res.json({
        success: true,
        data: naicsStats.map(stat => ({
          naicsCode: stat.naicsCode,
          naicsDescription: stat.naicsDescription,
          count: stat._count.id,
          totalAmount: stat._sum.awardAmount,
          averageAmount: stat._avg.awardAmount,
        })),
      });
    } catch (error) {
      logger.error('Error fetching NAICS statistics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch NAICS statistics',
      });
    }
  }

  async getContractsByAgency(req: Request, res: Response) {
    try {
      const agencyStats = await prisma.contract.groupBy({
        by: ['awardingAgency'],
        _count: {
          id: true,
        },
        _sum: {
          awardAmount: true,
        },
        orderBy: {
          _sum: {
            awardAmount: 'desc',
          },
        },
        take: 20,
      });

      res.json({
        success: true,
        data: agencyStats.map(stat => ({
          agency: stat.awardingAgency,
          count: stat._count.id,
          totalAmount: stat._sum.awardAmount,
        })),
      });
    } catch (error) {
      logger.error('Error fetching agency statistics', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to fetch agency statistics',
      });
    }
  }
}