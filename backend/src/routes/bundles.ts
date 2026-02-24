import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import * as bundleService from '../services/bundleService.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, assetIds } = req.body ?? {};
    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }
    const ids = Array.isArray(assetIds) ? assetIds : [];
    const bundle = await bundleService.createBundle(name, description ?? '', ids);
    res.status(201).json(bundle);
  } catch (err) {
    console.error('POST /api/bundles:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.patch('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { name, description, assetIds } = req.body ?? {};
    const patch: { name?: string; description?: string; assetIds?: string[] } = {};
    if (typeof name === 'string') patch.name = name;
    if (description !== undefined) patch.description = description ?? '';
    if (Array.isArray(assetIds)) patch.assetIds = assetIds;
    const bundle = await bundleService.updateBundle(id, patch);
    if (!bundle) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }
    res.json(bundle);
  } catch (err) {
    console.error('PATCH /api/bundles/:id:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
