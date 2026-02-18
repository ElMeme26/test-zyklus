import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from './ui/core';
import { Loader2 } from 'lucide-react';

export function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    login(roleEmail);
  };

  return (
    <div className="min-h-screen bg-slate-950 login-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Fondo ambiental */}
      <div className="absolute top-0 left-0 w-full h-full bg-cyan-500/5 blur-[100px] pointer-events-none" />
      
      <Card className="w-full max-w-sm bg-slate-900/90 login-card border-slate-800 relative z-10 backdrop-blur-2xl shadow-2xl">
        <div className="text-center mb-8">
          
          {/* Contenedor del Logo - Recuadro fijo de 24x24 */}
          <div className="relative group mx-auto mb-6 w-24 h-24">
            {/* Resplandor de fondo */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            
            {/* Contenedor principal: 
                - Se quitó 'overflow-hidden' para permitir que el logo REBASE el borde.
                - Se añadió 'z-10' para que el logo flote sobre el borde del cuadro.
            */}
            <div className="relative w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center border border-white/10 shadow-2xl p-0 backdrop-blur-xl z-10">
              <img 
                src="/logo.png" 
                alt="ZF Logo" 
                /* scale-150 hace que el logo se salga del recuadro negro */
                className="w-full h-full object-contain scale-150 filter drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] transition-transform duration-500 group-hover:scale-[1.6]"
              />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-white login-text tracking-tight">Zyklus Halo</h1>
          <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">Control Patrimonial</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Correo Corporativo</label>
            <Input 
              placeholder="nombre@zf.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="bg-slate-950 border-slate-800 focus:border-cyan-500 text-white login-text"
            />
          </div>
          <Button 
            onClick={() => login(email)} 
            className="w-full h-11 btn-neon text-xs" 
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'ACCEDER AL SISTEMA'}
          </Button>
        </div>

        {/* --- BOTONES DE ACCESO RÁPIDO AUTOMÁTICOS --- */}
        <div className="mt-8 pt-6 border-t border-slate-800">
           <p className="text-[10px] text-slate-500 uppercase mb-3 font-bold text-center">Fases de Prueba (Entrada Directa)</p>
           <div className="grid grid-cols-2 gap-2 text-[10px]">
              <button onClick={() => handleQuickLogin('sara.gómez_18@zf.com')} className="p-2 bg-slate-950 border border-slate-800 rounded hover:border-cyan-500 text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2">
                👷‍♂️ Usuario
              </button>
              <button onClick={() => handleQuickLogin('lic..echeverría_39@zf.com')} className="p-2 bg-slate-950 border border-slate-800 rounded hover:border-cyan-500 text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2">
                👔 Líder
              </button>
              <button onClick={() => handleQuickLogin('juana.pichardo_25@zf.com')} className="p-2 bg-slate-950 border border-slate-800 rounded hover:border-cyan-500 text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2">
                ⚡ Admin
              </button>
              <button onClick={() => handleQuickLogin('isabela.gálvez_98@zf.com')} className="p-2 bg-slate-950 border border-slate-800 rounded hover:border-cyan-500 text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2">
                📋 Auditor
              </button>
              <button onClick={() => handleQuickLogin('carlos.mendoza@zf.com')} className="col-span-2 p-2 bg-slate-950 border border-slate-800 rounded hover:border-cyan-500 text-slate-400 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2 font-bold">
                🛡️ Guardia de Seguridad
              </button>
           </div>
        </div>
      </Card>
    </div>
  );
}