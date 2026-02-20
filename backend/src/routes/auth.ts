import { Router, Request, Response } from 'express';
import { findUserByEmail, createToken } from '../services/authService.js';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const email = req.body?.email;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required' });
    return;
  }
  const user = await findUserByEmail(email.trim());
  if (!user) {
    res.status(401).json({ error: 'Usuario no encontrado.' });
    return;
  }
  const token = createToken(user);
  res.status(200).json({ user, token });
});

export default router;
