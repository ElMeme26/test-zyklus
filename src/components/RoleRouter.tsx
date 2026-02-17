import { useAuth } from '../context/AuthContext'; // Asumiendo que tienes AuthContext
import { UserHome } from './user/UserHome';
import { ManagerInbox } from './manager/ManagerInbox';
import { AdminDashboard } from './admin/AdminDashboard';
import { AuditorOverview } from './auditor/AuditorOverview';
import { GuardScanner } from './guard/GuardScanner';
import { LoginScreen } from './LoginScreen';

export const RoleRouter = () => {
  const { user, session } = useAuth();

  if (!session || !user) {
    return <LoginScreen />;
  }

  // Switch principal de roles
  switch (user.role) {
    case 'USUARIO':
      return <UserHome />;
      
    case 'LIDER_EQUIPO':
      return <ManagerInbox />; // O un DashboardContainer que contenga el Inbox
      
    case 'ADMIN_PATRIMONIAL':
      return <AdminDashboard />;
      
    case 'AUDITOR':
      return <AuditorOverview />;
      
    case 'GUARDIA':
      // El guardia tiene una interfaz exclusiva sin navegación compleja
      return <GuardScanner />;
      
    default:
      return (
        <div className="h-screen flex items-center justify-center flex-col">
          <h1 className="text-2xl font-bold text-red-600">Error de Acceso</h1>
          <p>Rol no reconocido ({user.role}). Contacte a soporte.</p>
        </div>
      );
  }
};