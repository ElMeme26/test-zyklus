import React, { useState, useCallback, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, X, User as UserIcon } from 'lucide-react';
import * as usersApi from '../../../api/users';
import { Card, Button, Input } from '../../ui/core';
import { DataLoadingScreen } from '../../ui/DataLoadingScreen';
import { ROLE_LABELS, USERS_PAGE_SIZE } from './constants';
import type { User, UserRole } from '../../../types';
import { toast } from 'sonner';

/** Vista de gestión de usuarios: listado paginado, alta, edición y eliminación. */
export function UsersView() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [disciplinaFilter, setDisciplinaFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', email: '', role: 'USUARIO' as UserRole, disciplina: '', password: '', passwordConfirm: '' });
  const [editForm, setEditForm] = useState({ name: '', role: 'USUARIO' as UserRole, disciplina: '', password: '', passwordConfirm: '' });

  const loadUsers = useCallback(async (pageNum: number) => {
    setLoading(true);
    try {
      const res = await usersApi.listUsersPaginated({
        page: pageNum,
        limit: USERS_PAGE_SIZE,
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        disciplina: disciplinaFilter.trim() || undefined,
      });
      setUsers(res.users);
      setTotal(res.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, disciplinaFilter]);

  useEffect(() => { setPage(1); }, [search, roleFilter, disciplinaFilter]);
  useEffect(() => { loadUsers(page); }, [loadUsers, page]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createForm.password !== createForm.passwordConfirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (createForm.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      await usersApi.createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        role: createForm.role,
        password: createForm.password,
        disciplina: createForm.disciplina.trim() || undefined,
      });
      toast.success('Usuario creado');
      setShowCreate(false);
      setCreateForm({ name: '', email: '', role: 'USUARIO', disciplina: '', password: '', passwordConfirm: '' });
      loadUsers(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear usuario');
    }
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setEditForm({ name: u.name, role: u.role, disciplina: u.disciplina ?? '', password: '', passwordConfirm: '' });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (editForm.password && editForm.password !== editForm.passwordConfirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (editForm.password && editForm.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    try {
      await usersApi.updateUser(editingUser.id, {
        name: editForm.name.trim(),
        role: editForm.role,
        disciplina: editForm.disciplina.trim() || undefined,
        password: editForm.password || undefined,
      });
      toast.success('Usuario actualizado');
      setEditingUser(null);
      loadUsers(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al actualizar');
    }
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`¿Eliminar usuario "${u.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await usersApi.deleteUser(u.id);
      toast.success('Usuario eliminado');
      loadUsers(page);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
  };

  return (
    <div className="animate-in fade-in space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <UserIcon className="text-primary" size={22} /> Gestión de Usuarios
        </h2>
        <Button onClick={() => setShowCreate(true)} className="bg-primary text-black font-bold">
          <Plus size={16} className="mr-2" /> Alta usuario
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
          <Input
            placeholder="Buscar por nombre o correo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 bg-slate-900 border-slate-700 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as UserRole | '')}
          className="h-10 rounded-lg border border-slate-700 bg-slate-900 text-white px-3 text-sm min-w-[140px]"
        >
          <option value="">Todos los roles</option>
          {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </select>
        <Input
          placeholder="Filtrar por disciplina"
          value={disciplinaFilter}
          onChange={e => setDisciplinaFilter(e.target.value)}
          className="h-10 w-40 bg-slate-900 border-slate-700 text-sm"
        />
      </div>

      {loading ? (
        <DataLoadingScreen message="Cargando usuarios..." />
      ) : (
        <Card className="border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/50">
                  <th className="p-3 text-[10px] font-bold text-slate-500 uppercase">Nombre</th>
                  <th className="p-3 text-[10px] font-bold text-slate-500 uppercase">Correo</th>
                  <th className="p-3 text-[10px] font-bold text-slate-500 uppercase">Rol</th>
                  <th className="p-3 text-[10px] font-bold text-slate-500 uppercase">Disciplina</th>
                  <th className="p-3 text-[10px] font-bold text-slate-500 uppercase w-24">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                    <td className="p-3 text-white font-medium">{u.name}</td>
                    <td className="p-3 text-slate-400 text-sm">{u.email}</td>
                    <td className="p-3"><span className="text-xs font-bold px-2 py-1 rounded bg-slate-800 text-white keep-white border border-slate-600/70">{ROLE_LABELS[u.role]}</span></td>
                    <td className="p-3 text-slate-400 text-sm">{u.disciplina || '—'}</td>
                    <td className="p-3 flex gap-2">
                      <button onClick={() => openEdit(u)} className="p-2 rounded-lg border border-slate-600 text-slate-400 hover:text-primary hover:border-primary/50" title="Editar"><Edit size={14} /></button>
                      <button onClick={() => handleDelete(u)} className="p-2 rounded-lg border border-slate-600 text-slate-400 hover:text-rose-400 hover:border-rose-500/50" title="Eliminar"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && !loading && <p className="p-8 text-center text-slate-500">No hay usuarios que coincidan con los filtros.</p>}
        </Card>
      )}

      {!loading && total > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-slate-500">
            Mostrando {((page - 1) * USERS_PAGE_SIZE) + 1}–{Math.min(page * USERS_PAGE_SIZE, total)} de {total}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
              Anterior
            </Button>
            <span className="flex items-center px-3 text-sm text-slate-400">
              Página {page} de {Math.ceil(total / USERS_PAGE_SIZE) || 1}
            </span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / USERS_PAGE_SIZE)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <Card className="w-full max-w-md border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-lg">Alta de usuario</h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre</label>
                <Input required value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} className="mt-1 bg-slate-900 border-slate-700" placeholder="Nombre completo" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Correo</label>
                <Input type="email" required value={createForm.email} onChange={e => setCreateForm(f => ({ ...f, email: e.target.value }))} className="mt-1 bg-slate-900 border-slate-700" placeholder="correo@zf.com" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rol</label>
                <select value={createForm.role} onChange={e => setCreateForm(f => ({ ...f, role: e.target.value as UserRole }))} className="mt-1 w-full h-10 rounded-lg border border-slate-700 bg-slate-900 text-white px-3 text-sm">
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Disciplina</label>
                <Input value={createForm.disciplina} onChange={e => setCreateForm(f => ({ ...f, disciplina: e.target.value }))} className="mt-1 bg-slate-900 border-slate-700" placeholder="Opcional" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Contraseña</label>
                <Input type="password" required value={createForm.password} onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))} className="mt-1 bg-slate-900 border-slate-700" placeholder="Mínimo 6 caracteres" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Confirmar contraseña</label>
                <Input type="password" required value={createForm.passwordConfirm} onChange={e => setCreateForm(f => ({ ...f, passwordConfirm: e.target.value }))} className="mt-1 bg-slate-900 border-slate-700" placeholder="Repetir contraseña" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Crear usuario</Button>
                <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setEditingUser(null)}>
          <Card className="w-full max-w-md border-slate-700" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold text-lg">Editar usuario</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nombre</label>
                <Input required value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="mt-1 bg-slate-900 border-slate-700" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Rol</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value as UserRole }))} className="mt-1 w-full h-10 rounded-lg border border-slate-700 bg-slate-900 text-white px-3 text-sm">
                  {(Object.keys(ROLE_LABELS) as UserRole[]).map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Disciplina</label>
                <Input value={editForm.disciplina} onChange={e => setEditForm(f => ({ ...f, disciplina: e.target.value }))} className="mt-1 bg-slate-900 border-slate-700" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Nueva contraseña (opcional)</label>
                <Input type="password" value={editForm.password} onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} className="mt-1 bg-slate-900 border-slate-700" placeholder="Dejar vacío para no cambiar" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase">Confirmar contraseña</label>
                <Input type="password" value={editForm.passwordConfirm} onChange={e => setEditForm(f => ({ ...f, passwordConfirm: e.target.value }))} className="mt-1 bg-slate-900 border-slate-700" placeholder="Solo si cambias contraseña" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" className="flex-1">Guardar</Button>
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
