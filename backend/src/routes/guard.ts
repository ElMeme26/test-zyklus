import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import * as guardService from '../services/guardService.js';

const router = Router();

router.post('/scan', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { qrData, type, signature, isDamaged, damageNotes } = req.body ?? {};
    if (!qrData || !type || (type !== 'CHECKOUT' && type !== 'CHECKIN')) {
      res.status(400).json({ error: 'qrData and type (CHECKOUT|CHECKIN) required' });
      return;
    }
    const result = await guardService.processGuardScan(
      qrData,
      type,
      signature,
      isDamaged,
      damageNotes
    );
    res.json(result);
  } catch (err) {
    console.error('POST /api/guard/scan:', err);
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

router.post('/scan/confirm-combo', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { comboState, isDamaged, damageNotes } = req.body ?? {};
    if (!comboState?.allRequests || !Array.isArray(comboState.allRequests)) {
      res.status(400).json({ error: 'comboState.allRequests required' });
      return;
    }
    const result = await guardService.confirmComboCheckin(
      comboState.allRequests,
      Boolean(isDamaged),
      damageNotes ?? ''
    );
    res.json(result);
  } catch (err) {
    console.error('POST /api/guard/scan/confirm-combo:', err);
    res.status(500).json({ success: false, message: (err as Error).message });
  }
});

export default router;
