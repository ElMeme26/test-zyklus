import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';

// Importaciones de componentes
import { UserHome } from './user/UserHome';
import { ManagerInbox } from './manager/ManagerInbox';
import { AdminDashboard } from './admin/AdminDashboard';
import { AuditorOverview } from './auditor/AuditorOverview';
import { GuardScanner } from './guard/GuardScanner';
import { LoginScreen } from './LoginScreen';

export const RoleRouter = () => {
  const { user, session, loading } = useAuth();

  // 1. Pantalla de carga mientras verificamos sesión
  if (loading) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center text-cyan-500">
        <Loader2 className="animate-spin w-10 h-10" />
      </div>
    );
  }

  // 2. Si no hay usuario logueado, mostrar Login
  if (!session || !user) {
    return <LoginScreen />;
  }

  // 3. Router según el ROL
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
        <div className="h-screen flex items-center justify-center flex-col p-4 bg-slate-100">
          <h1 className="text-2xl font-bold text-red-600">Acceso Denegado</h1>
          <p className="mt-2 text-slate-600">
            Tu rol <strong>({user.role})</strong> no tiene permisos configurados.
          </p>
          <button 
             onClick={() => window.location.reload()}
             className="mt-4 px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700"
          >
             Recargar Aplicación
          </button>
        </div>
      );
  }
};