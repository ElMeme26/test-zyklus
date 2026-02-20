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

export default router;
