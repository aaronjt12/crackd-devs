import { Router, Request, Response } from 'express';
import { SyncService } from '../services/sync.service';
import logger from '../config/logger';

const router = Router();
const syncService = new SyncService();

router.post('/trigger', async (req: Request, res: Response) => {
  try {
    logger.info('Manual sync triggered');

    const result = await syncService.syncContracts();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('Manual sync failed', { error });
    res.status(500).json({
      success: false,
      error: 'Sync failed',
    });
  }
});

router.get('/logs', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const logs = await syncService.getRecentSyncLogs(limit);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    logger.error('Failed to fetch sync logs', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync logs',
    });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await syncService.getSyncStatistics();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to fetch sync statistics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sync statistics',
    });
  }
});

export default router;