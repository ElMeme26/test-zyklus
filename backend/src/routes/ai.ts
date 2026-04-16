import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { callGemini, generatePredictiveReport } from '../services/geminiService.js';

const router = Router();

router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
  const { prompt, temperature, maxOutputTokens } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Prompt es requerido.' });
    return;
  }

  try {
    const text = await callGemini(prompt, {
      temperature: typeof temperature === 'number' ? temperature : 0.2,
      maxOutputTokens: typeof maxOutputTokens === 'number' ? maxOutputTokens : 2048,
    });
    res.json({ text });
  } catch (error) {
    console.error('AI generate error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error interno de AI' });
  }
});

router.post('/predictive-report', authMiddleware, async (req: Request, res: Response) => {
  const { requestedAssets, audience } = req.body ?? {};
  if (!Array.isArray(requestedAssets)) {
    res.status(400).json({ error: 'requestedAssets debe ser un arreglo.' });
    return;
  }
  if (audience !== 'administrador' && audience !== 'auditor') {
    res.status(400).json({ error: 'Audiencia no válida.' });
    return;
  }

  try {
    const text = await generatePredictiveReport(requestedAssets, audience);
    res.json({ text });
  } catch (error) {
    console.error('AI predictive report error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error interno de AI' });
  }
});

export default router;
