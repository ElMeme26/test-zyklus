import React from 'react'; // Importante añadir React
import { useAuth } from '../context/AuthContext';
// Asegúrate de que estos archivos existan y exporten correctamente
import { UserHome } from './user/UserHome';
import { ManagerInbox } from './manager/ManagerInbox';
import { AdminDashboard } from './admin/AdminDashboard';
import { AuditorOverview } from './auditor/AuditorOverview';
import { GuardScanner } from './guard/GuardScanner';
import { LoginScreen } from './LoginScreen';

export const RoleRouter = () => {
  const { user, session } = useAuth();

  // Si no hay sesión o usuario cargado, mostrar Login
  if (!session || !user) {
    return <LoginScreen />;
  }

  // Switch principal de roles
  switch (user.role) {
    case 'USUARIO':
      return <UserHome />;
      
    case 'LIDER_EQUIPO':
      return <ManagerInbox />;
      
    case 'ADMIN_PATRIMONIAL':
      return <AdminDashboard />;
      
    case 'AUDITOR':
      return <AuditorOverview />;
      
    case 'GUARDIA':
      return <GuardScanner />;
      
    default:
      return (
        <div className="h-screen flex items-center justify-center flex-col p-4 text-center">
          <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
          <p className="mt-2 text-gray-600">Tu rol actual ({user.role}) no tiene una interfaz asignada.</p>
          <button 
             onClick={() => window.location.reload()}
             className="mt-4 px-4 py-2 bg-gray-800 text-white rounded"
          >
             Recargar
          </button>
        </div>
      );
  }
};