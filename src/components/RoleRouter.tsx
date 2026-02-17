import { useAuth } from '../context/AuthContext';
import { AdminDashboard } from './admin/AdminDashboard';
import { ManagerInbox } from './manager/ManagerInbox';
import { GuardScanner } from './guard/GuardScanner';
import { AuditorOverview } from './auditor/AuditorOverview';
import { UserHome } from './user/UserHome';
import { LoginScreen } from './LoginScreen'; // <--- Importante: Importamos el Login
import { Loader2 } from 'lucide-react';

export default function RoleRouter() {
  const { user, isLoading } = useAuth();

  // 1. Mostrar carga mientras verificamos sesión
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary">
        <Loader2 className="animate-spin" size={48}/>
      </div>
    );
  }

  // 2. Si no hay usuario, MOSTRAR LOGIN (Antes devolvía null y la pantalla se veía negra/blanca)
  if (!user) {
    return <LoginScreen />;
  }

  // 3. Si hay usuario, mostrar su dashboard correspondiente
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