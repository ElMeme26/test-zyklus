import { useAuth } from '../context/AuthContext';
import { UserHome } from './user/UserHome';
import { ManagerInbox } from './manager/ManagerInbox';
import { AdminDashboard } from './admin/AdminDashboard';
import { AuditorOverview } from './auditor/AuditorOverview'; // <--- Importamos lo nuevo

export function RoleRouter() {
  const { user } = useAuth();
  if (!user) return null;

  // Mapeo exacto de tus carpetas a tus roles de negocio
  switch (user.role) {
    case 'USUARIO': return <UserHome />;
    case 'LIDER_EQUIPO': return <ManagerInbox />; // ManagerInbox es para el Líder
    case 'ADMIN_PATRIMONIAL': return <AdminDashboard />; // AdminDashboard es para el Admin
    case 'AUDITOR': return <AuditorOverview />;
    default: return <div className="p-10 text-white">Rol no autorizado</div>;
  }
}