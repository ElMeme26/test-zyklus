import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from './ui/core';
import { Zap, Loader2 } from 'lucide-react';

export function LoginScreen() {
  const { login, isLoading } = useAuth(); // Usamos 'login' estándar
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Fondo ambiental */}
      <div className="absolute top-0 left-0 w-full h-full bg-cyan-500/5 blur-[100px] pointer-events-none" />
      
      <Card className="w-full max-w-sm bg-slate-900/90 border-slate-800 relative z-10 backdrop-blur-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-slate-950 rounded-2xl flex items-center justify-center border border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <Zap className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Zyklus Halo</h1>           <p className="text-slate-400 text-xs uppercase tracking-widest mt-1">Control Patrimonial</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Correo Corporativo</label>
            <Input 
              placeholder="nombre@zf.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              className="bg-slate-950 border-slate-800 focus:border-cyan-500 text-white"
            />
          </div>
          <Button onClick={() => login(email)} className="w-full h-11 btn-neon text-xs" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'ACCEDER AL SISTEMA'}
          </Button>
        </div>

        {/* --- BOTONES DE ACCESO RÁPIDO PARA FASES DE PRUEBA --- */}
        <div className="mt-8 pt-6 border-t border-white/5">
           <p className="text-[10px] text-slate-600 uppercase mb-3 font-bold text-center">Fases de Prueba (Roles)</p>
           <div className="grid grid-cols-2 gap-2 text-[10px]">
              <button 
                onClick={() => setEmail('sara.gómez_18@zf.com')} 
                className="p-2 bg-slate-950 border border-slate-800 rounded hover:border-cyan-500 text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                👷‍♂️ Usuario
              </button>
              <button 
                onClick={() => setEmail('lic..echeverría_39@zf.com')} 
                className="p-2 bg-slate-950 border border-slate-800 rounded hover:border-cyan-500 text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                👔 Líder
              </button>
              <button 
                onClick={() => setEmail('juana.pichardo_25@zf.com')} 
                className="p-2 bg-slate-950 border border-slate-800 rounded hover:border-cyan-500 text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                ⚡ Admin
              </button>
              <button 
                onClick={() => setEmail('isabela.gálvez_98@zf.com')} 
                className="p-2 bg-slate-950 border border-slate-800 rounded hover:border-cyan-500 text-slate-300 transition-colors flex items-center justify-center gap-2"
              >
                📋 Auditor
              </button>
              {/* Botón de Guardia Agregado */}
              <button 
                onClick={() => setEmail('carlos.mendoza@zf.com')} 
                className="col-span-2 p-2 bg-slate-950 border border-slate-800 rounded hover:border-cyan-500 text-slate-300 transition-colors flex items-center justify-center gap-2 font-bold"
              >
                🛡️ Guardia de Seguridad
              </button>
           </div>
        </div>
      </Card>
    </div>
  );
}