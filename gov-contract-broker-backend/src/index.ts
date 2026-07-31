import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import prisma from './config/database';
import logger from './config/logger';
import { SyncService } from './services/sync.service';
import contractRoutes from './routes/contracts.routes';
import syncRoutes from './routes/sync.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/contracts', contractRoutes);
app.use('/api/sync', syncRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

const syncService = new SyncService();

async function startServer() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
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