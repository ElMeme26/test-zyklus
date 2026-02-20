import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import * as maintenanceService from '../services/maintenanceService.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, userId, description } = req.body ?? {};
    if (!assetId || !description) {
      res.status(400).json({ error: 'assetId and description required' });
      return;
    }
    await maintenanceService.reportMaintenance(assetId, userId ?? '', description);
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/:id/resolve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const cost = req.body?.cost != null ? Number(req.body.cost) : undefined;
    await maintenanceService.resolveMaintenance(id, cost);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
