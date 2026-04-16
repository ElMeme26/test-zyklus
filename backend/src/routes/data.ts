import { Router, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { getAllData, getStats, getAuditLogsPaginated, getMaintenanceLogsPaginated } from '../services/dataService.js';

const router = Router();

router.get('/stats', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (err) {
    console.error('GET /api/data/stats:', err);
    res.status(500).json({ error: 'Failed to load stats' });
  }
});

router.get('/audit-logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
    const action = typeof req.query.action === 'string' ? req.query.action : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const result = await getAuditLogsPaginated(page, limit, { action, search });
    res.json(result);
  } catch (err) {
    console.error('GET /api/data/audit-logs:', err);
    res.status(500).json({ error: 'Failed to load audit logs' });
  }
});

router.get('/maintenance-logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit), 10) || 50));
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const result = await getMaintenanceLogsPaginated(page, limit, { status, search });
    res.json(result);
  } catch (err) {
    console.error('GET /api/data/maintenance-logs:', err);
    res.status(500).json({ error: 'Failed to load maintenance logs' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = await getAllData();
    res.json(data);
  } catch (err) {
    console.error('GET /api/data:', err);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

export default router;
