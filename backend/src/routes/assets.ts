import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import * as assetService from '../services/assetService.js';

const router = Router();

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page), 10) || 1);
    const limit = Math.min(req.query.export === 'true' ? 10000 : 100, Math.max(1, parseInt(String(req.query.limit), 10) || 24));
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const availableOnly = req.query.availableOnly === 'true' || req.query.availableOnly === '1';
    const maintenanceOnly = req.query.maintenanceOnly === 'true' || req.query.maintenanceOnly === '1';
    const unbundledOnly = req.query.unbundledOnly === 'true' || req.query.unbundledOnly === '1';

    const filters = (search || category || status || availableOnly || maintenanceOnly || unbundledOnly)
      ? { search, category, status, availableOnly, maintenanceOnly, unbundledOnly } : undefined;
    const result = await assetService.getAssetsPaginated(page, limit, filters);
    res.json(result);
  } catch (err) {
    console.error('GET /api/assets:', err);
    res.status(500).json({ error: 'Failed to load assets' });
  }
});

router.get('/next-tag', authMiddleware, async (_req: AuthRequest, res: Response) => {
  try {
    const tag = await assetService.getNextTag();
    res.json({ tag });
  } catch (err) {
    console.error('GET /api/assets/next-tag:', err);
    res.status(500).json({ error: 'Failed to get next tag' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const asset = await assetService.getAssetById(id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(asset);
  } catch (err) {
    console.error('GET /api/assets/:id:', err);
    res.status(500).json({ error: 'Failed to load asset' });
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
