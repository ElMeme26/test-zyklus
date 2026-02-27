import { Router, Response } from 'express';
import { authMiddleware, requireRole, type AuthRequest } from '../middleware/auth.js';
import type { UserRole } from '../types/index.js';
import * as userService from '../services/userService.js';
import { findUserByEmail } from '../services/authService.js';

const router = Router();
const adminOnly = requireRole(['ADMIN_PATRIMONIAL']);

router.use(authMiddleware);
router.use(adminOnly);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const validRoles: UserRole[] = ['AUDITOR', 'ADMIN_PATRIMONIAL', 'LIDER_EQUIPO', 'USUARIO', 'GUARDIA'];
    const page = req.query.page != null ? Number(req.query.page) : undefined;
    const limit = req.query.limit != null ? Number(req.query.limit) : undefined;
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const roleParam = typeof req.query.role === 'string' ? req.query.role : undefined;
    const role = roleParam && validRoles.includes(roleParam as UserRole) ? (roleParam as UserRole) : undefined;
    const disciplina = typeof req.query.disciplina === 'string' ? req.query.disciplina : undefined;
    const result = await userService.listUsersPaginated({
      page: Number.isFinite(page) ? page : undefined,
      limit: Number.isFinite(limit) ? limit : undefined,
      search,
      role,
      disciplina,
    });
    res.status(200).json(result);
  } catch (err) {
    console.error('GET /api/users', err);
    res.status(500).json({ error: 'Error al listar usuarios.' });
  }
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, role, password, disciplina, phone, manager_id } = req.body ?? {};
    if (!name || typeof name !== 'string' || !email || typeof email !== 'string' || !role || !password || typeof password !== 'string') {
      res.status(400).json({ error: 'Nombre, correo, rol y contraseña son requeridos.' });
      return;
    }
    const validRoles: UserRole[] = ['AUDITOR', 'ADMIN_PATRIMONIAL', 'LIDER_EQUIPO', 'USUARIO', 'GUARDIA'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: 'Rol no válido.' });
      return;
    }
    const existing = await findUserByEmail(email.trim());
    if (existing) {
      res.status(409).json({ error: 'Ya existe un usuario con ese correo.' });
      return;
    }
    const user = await userService.createUser({
      name: name.trim(),
      email: email.trim(),
      role,
      password,
      disciplina: typeof disciplina === 'string' ? disciplina.trim() || undefined : undefined,
      phone: typeof phone === 'string' ? phone.trim() || undefined : undefined,
      manager_id: typeof manager_id === 'string' ? manager_id || undefined : undefined,
    });
    res.status(201).json(user);
  } catch (err) {
    console.error('POST /api/users', err);
    res.status(500).json({ error: 'Error al crear usuario.' });
  }
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const { name, role, disciplina, phone, manager_id, password } = req.body ?? {};
    const validRoles: UserRole[] = ['AUDITOR', 'ADMIN_PATRIMONIAL', 'LIDER_EQUIPO', 'USUARIO', 'GUARDIA'];
    if (role !== undefined && !validRoles.includes(role)) {
      res.status(400).json({ error: 'Rol no válido.' });
      return;
    }
    const user = await userService.updateUser(id, {
      name: typeof name === 'string' ? name.trim() : undefined,
      role,
      disciplina: typeof disciplina === 'string' ? disciplina.trim() : undefined,
      phone: typeof phone === 'string' ? phone.trim() : undefined,
      manager_id: typeof manager_id === 'string' ? manager_id || undefined : undefined,
      password: typeof password === 'string' ? password : undefined,
    });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    res.status(200).json(user);
  } catch (err) {
    console.error('PUT /api/users/:id', err);
    res.status(500).json({ error: 'Error al actualizar usuario.' });
  }
});

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id;
    const deleted = await userService.deleteUser(id);
    if (!deleted) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/users/:id', err);
    res.status(500).json({ error: 'Error al eliminar usuario.' });
  }
});

export default router;
