import React from 'react';
import { useAuth } from '../context/AuthContext';

// Importaciones directas de tus componentes
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
      return <ManagerInbox />;
      
    case 'ADMIN_PATRIMONIAL':
      return <AdminDashboard />;
      
    case 'AUDITOR':
      return <AuditorOverview />;
      
    case 'GUARDIA':
      return <GuardScanner />;
      
    default:
      return (
        <div className="h-screen flex items-center justify-center flex-col p-4">
          <h1 className="text-2xl font-bold text-red-600">Error: Rol Desconocido</h1>
          <p>Tu usuario tiene el rol: <strong>{user.role}</strong>, el cual no está configurado.</p>
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