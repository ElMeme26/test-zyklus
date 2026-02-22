import { Router, Request, Response } from 'express';
import { findUserByEmailForLogin, createToken, verifyPassword } from '../services/authService.js';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  const email = req.body?.email;
  const password = req.body?.password;
  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email es requerido.' });
    return;
  }
  if (!password || typeof password !== 'string') {
    res.status(400).json({ error: 'Contraseña es requerida.' });
    return;
  }
  const data = await findUserByEmailForLogin(email.trim());
  if (!data) {
    res.status(401).json({ error: 'Usuario no encontrado.' });
    return;
  }
  if (data.password_hash === null) {
    res.status(401).json({ error: 'Usuario sin contraseña asignada. Contacte al administrador.' });
    return;
  }
  const valid = await verifyPassword(password, data.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Credenciales incorrectas.' });
    return;
  }
  const token = createToken(data.user);
  res.status(200).json({ user: data.user, token });
});

export default router;
