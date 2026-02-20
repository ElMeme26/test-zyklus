import { Router, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { query } from '../db/index.js';
import { checkOverdue } from '../services/overdueService.js';

const router = Router();

router.post('/check-overdue', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    await checkOverdue();
    res.json({ ok: true });
  } catch (err) {
    console.error('check-overdue:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    await query('UPDATE notifications SET is_read = true WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/read-all', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.body?.userId ?? req.query.userId;
    if (!userId) {
      res.status(400).json({ error: 'userId required' });
      return;
    }
    await query('UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false', [userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
