import { Router, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import * as requestService from '../services/requestService.js';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { assetId, userId, userName, userDisciplina, managerId, days, motive, institutionId, autoApprove } = req.body ?? {};
    if (!assetId || !userId || userName == null) {
      res.status(400).json({ error: 'assetId, userId, userName required' });
      return;
    }
    const id = await requestService.createRequest({
      assetId,
      userId,
      userName,
      userDisciplina: userDisciplina ?? '',
      managerId,
      days: Number(days) ?? 0,
      motive,
      institutionId,
      autoApprove: Boolean(autoApprove),
    });
    res.status(201).json(id);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/batch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { assetIds, userId, userName, userDisciplina, managerId, days, motive, institutionId, autoApprove } = req.body ?? {};
    if (!Array.isArray(assetIds) || !userId || userName == null) {
      res.status(400).json({ error: 'assetIds (array), userId, userName required' });
      return;
    }
    await requestService.createBatchRequest({
      assetIds,
      userId,
      userName,
      userDisciplina: userDisciplina ?? '',
      managerId,
      days: Number(days) ?? 0,
      motive,
      institutionId,
      autoApprove: Boolean(autoApprove),
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.post('/bundle', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { bundleId, assetIds, bundleName, userId, userName, userDisciplina, managerId, days, motive, autoApprove } = req.body ?? {};
    if (!bundleId || !Array.isArray(assetIds) || !bundleName || !userId || userName == null) {
      res.status(400).json({ error: 'bundleId, assetIds, bundleName, userId, userName required' });
      return;
    }
    await requestService.createBundleRequest({
      bundleId,
      assetIds,
      bundleName,
      userId,
      userName,
      userDisciplina: userDisciplina ?? '',
      managerId,
      days: Number(days) ?? 0,
      motive: motive ?? '',
      autoApprove: Boolean(autoApprove),
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put('/:id/approve', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    if (isNaN(reqId)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const { approverId, approverName, bundleGroupId, userId, assetName } = req.body ?? {};
    await requestService.approveRequest(
      reqId,
      approverId ?? req.user?.sub ?? 'system',
      approverName ?? 'Admin',
      bundleGroupId ?? null,
      userId,
      assetName
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put('/:id/reject', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    if (isNaN(reqId)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const { reason, bundleGroupId, assetIds, userId } = req.body ?? {};
    if (!reason) {
      res.status(400).json({ error: 'reason required' });
      return;
    }
    await requestService.rejectRequest(reqId, reason, bundleGroupId ?? null, assetIds, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put('/:id/feedback', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    if (isNaN(reqId)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const { feedback, bundleGroupId, userId } = req.body ?? {};
    if (!feedback) {
      res.status(400).json({ error: 'feedback required' });
      return;
    }
    await requestService.returnRequestWithFeedback(reqId, feedback, bundleGroupId ?? null, userId);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put('/:id/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    if (isNaN(reqId)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const { bundleGroupId, assetIdsToFree } = req.body ?? {};
    await requestService.cancelRequest(reqId, bundleGroupId ?? null, assetIdsToFree);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put('/:id/respond-feedback', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    if (isNaN(reqId)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const { feedback, bundleGroupId } = req.body ?? {};
    if (!feedback || typeof feedback !== 'string') {
      res.status(400).json({ error: 'feedback required' });
      return;
    }
    await requestService.respondToFeedback(reqId, feedback, bundleGroupId ?? null);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

router.put('/:id/renew', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const reqId = parseInt(req.params.id, 10);
    if (isNaN(reqId)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }
    const additionalDays = Number(req.body?.additionalDays) ?? 0;
    await requestService.renewRequest(reqId, additionalDays);
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
