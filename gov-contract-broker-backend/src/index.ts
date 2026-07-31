import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import prisma from './config/database';
import logger from './config/logger';
import { SyncService } from './services/sync.service';
import contractRoutes from './routes/contracts.routes';
import syncRoutes from './routes/sync.routes';
import searchRoutes from './routes/search.routes';
import dashboardRoutes from './routes/dashboard.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST']
  }
});

// Enhanced CORS configuration for frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/contracts', contractRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      search: {
        searchContracts: 'POST /api/search/contracts',
        getFilters: 'GET /api/search/filters',
        getTrending: 'GET /api/search/trending',
        getContractDetails: 'GET /api/search/contract/:awardId'
      },
      dashboard: {
        getStats: 'GET /api/dashboard/stats',
        getCharts: 'GET /api/dashboard/charts',
        getNotifications: 'GET /api/dashboard/notifications'
      },
      contracts: {
        list: 'GET /api/contracts',
        get: 'GET /api/contracts/:id',
        naicsStats: 'GET /api/contracts/stats/naics',
        agencyStats: 'GET /api/contracts/stats/agency'
      },
      sync: {
        trigger: 'POST /api/sync/trigger',
        logs: 'GET /api/sync/logs',
        stats: 'GET /api/sync/stats'
      }
    }
  });
});

// WebSocket connection for real-time updates
io.on('connection', (socket) => {
  logger.info('Client connected:', socket.id);

  socket.on('subscribe', (channel) => {
    socket.join(channel);
    logger.info(`Client ${socket.id} subscribed to ${channel}`);
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected:', socket.id);
  });
});

// Export io for use in other services
export { io };

const syncService = new SyncService();

async function startServer() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    httpServer.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`API documentation available at http://localhost:${PORT}/api`);
    });

    if (process.env.NODE_ENV !== 'test') {
      syncService.startScheduledSync();
      logger.info('Scheduled sync started');
    }
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  syncService.stopScheduledSync();
  await prisma.$disconnect();
  process.exit(0);
});

startServer();