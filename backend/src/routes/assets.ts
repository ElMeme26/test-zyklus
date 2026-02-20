import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import * as assetService from '../services/assetService.js';

const router = Router();

router.get('/next-tag', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const tag = await assetService.getNextTag();
    res.json({ tag });
  } catch (err) {
    console.error('GET /api/assets/next-tag:', err);
    res.status(500).json({ error: 'Failed to get next tag' });
  }
});

router.post('/import', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const rows = req.body?.rows ?? req.body;
    const arr = Array.isArray(rows) ? rows : [];
    const count = await assetService.importAssets(arr);
    res.json({ count });
  } catch (err) {
    console.error('POST /api/assets/import:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/:id/validate-maintenance', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const period = Number(req.body?.maintenancePeriodDays) || 180;
    await assetService.validateMaintenanceAsset(id, period);
    res.json({ ok: true });
  } catch (err) {
    console.error('POST /api/assets/:id/validate-maintenance:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const payload = req.body ?? {};
    const row = await assetService.addAsset(payload);
    res.status(201).json(row);
  } catch (err) {
    console.error('POST /api/assets:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const updates = req.body ?? {};
    await assetService.updateAsset(id, updates);
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/assets/:id:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await assetService.deleteAsset(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/assets/:id:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
