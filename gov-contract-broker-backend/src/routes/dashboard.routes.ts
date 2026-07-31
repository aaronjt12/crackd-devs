import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';

const router = Router();
const controller = new DashboardController();

// Dashboard endpoints
router.get('/stats', controller.getDashboardStats);
router.get('/charts', controller.getChartData);
router.get('/notifications', controller.getNotifications);

export default router;