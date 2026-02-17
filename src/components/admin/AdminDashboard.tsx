import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BundleManager } from './BundleManager';
import { InstitutionsManager } from './InstitutionsManager'; // Este lo creamos abajo
import { Package, Building2, LayoutDashboard, LogOut } from 'lucide-react';

export const AdminDashboard = () => {
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'bundles' | 'institutions'>('overview');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Topbar */}
      <header className="bg-slate-900 text-white p-4 shadow-md flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-xl">
            ZF
          </div>
          <div>
            <h1 className="text-lg font-bold leading-tight">Panel Administrativo</h1>
            <p className="text-xs text-slate-400">Bienvenido, {user?.name}</p>
          </div>
        </div>
        <button 
          onClick={signOut}
          className="text-sm bg-slate-800 hover:bg-red-600 hover:text-white px-4 py-2 rounded transition-colors flex items-center gap-2"
        >
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar simple */}
        <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'overview' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <LayoutDashboard size={20} />
              Resumen de Activos
            </button>
            <button
              onClick={() => setActiveTab('bundles')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'bundles' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Package size={20} />
              Gestión de Bundles
            </button>
            <button
              onClick={() => setActiveTab('institutions')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'institutions' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Building2 size={20} />
              Instituciones Externas
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'overview' && (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
              <h2 className="text-2xl font-bold text-gray-400">Dashboard de Estados</h2>
              <p className="text-gray-500 mt-2">Aquí irían las gráficas de activos operativos vs mantenimiento.</p>
              {/* Aquí puedes integrar tus gráficas más adelante */}
            </div>
          )}

          {activeTab === 'bundles' && <BundleManager />}
          
          {activeTab === 'institutions' && <InstitutionsManager />}
        </main>
      </div>
    </div>
  );
};