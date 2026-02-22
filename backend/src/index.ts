import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { healthCheck } from './db/index.js';
import authRoutes from './routes/auth.js';
import dataRoutes from './routes/data.js';
import assetsRoutes from './routes/assets.js';
import institutionsRoutes from './routes/institutions.js';
import bundlesRoutes from './routes/bundles.js';
import requestsRoutes from './routes/requests.js';
import guardRoutes from './routes/guard.js';
import notificationsRoutes from './routes/notifications.js';
import maintenanceRoutes from './routes/maintenance.js';
import usersRoutes from './routes/users.js';

const app = express();
const PORT = process.env.PORT ?? 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.endsWith('.netlify.app') || origin === FRONTEND_ORIGIN) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

app.get('/health', async (_req, res) => {
  const dbOk = await healthCheck();
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    database: dbOk ? 'connected' : 'disconnected',
  });
});

app.use('/auth', authRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/institutions', institutionsRoutes);
app.use('/api/bundles', bundlesRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/guard', guardRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/users', usersRoutes);

app.listen(PORT, () => {
  console.log(`Zyklus API listening on http://localhost:${PORT}`);
});
