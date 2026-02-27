import { useAuth } from '../context/AuthContext';
import { AdminDashboard } from './admin/AdminDashboard';
import { ManagerInbox } from './manager/ManagerInbox';
import { GuardScanner } from './guard/GuardScanner';
import { AuditorOverview } from './auditor/AuditorOverview';
import { UserHome } from './user/UserHome';
import { LoginScreen } from './LoginScreen';
import { Loader2 } from 'lucide-react';

/** Enruta al dashboard según el rol del usuario tras el login. */
export default function RoleRouter() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary">
        <Loader2 className="animate-spin" size={48}/>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  switch (user.role) {
    case 'ADMIN_PATRIMONIAL':
      return <AdminDashboard />;
    case 'LIDER_EQUIPO':
      return <ManagerInbox />;
    case 'GUARDIA':
      return <GuardScanner />;
    case 'AUDITOR':
      return <AuditorOverview />;
    case 'USUARIO':
      return <UserHome />;
    default:
      return <div className="text-white p-10 text-center">Rol no reconocido. Contacte a soporte.</div>;
  }
}