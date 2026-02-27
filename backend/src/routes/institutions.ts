import { Router, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import * as institutionService from '../services/institutionService.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await institutionService.addInstitution(req.body ?? {});
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('POST /api/institutions:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    await institutionService.updateInstitution(id, req.body ?? {});
    res.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/institutions/:id:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    await institutionService.deleteInstitution(id);
    res.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/institutions/:id:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
