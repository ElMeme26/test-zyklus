import { Router, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { getAllData, getStats } from '../services/dataService.js';

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
