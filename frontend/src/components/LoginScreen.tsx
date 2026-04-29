import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button, Input, Card } from './ui/core';
import { Loader2 } from 'lucide-react';

/** Pantalla de inicio de sesión con email y contraseña. */
export function LoginScreen() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    setErrorMessage('');
    try {
      await login(email.trim(), password);
    } catch {
      setErrorMessage('Credenciales incorrectas. Verifica tu correo y contraseña.');
      setEmail('');
      setPassword('');
    }
  };

  const clearError = () => {
    if (errorMessage) setErrorMessage('');
  };

  return (
    <div className="min-h-screen bg-slate-950 login-bg flex items-center justify-center p-6 relative overflow-hidden">
      {/* Fondo ambiental */}
      <div className="absolute top-0 left-0 w-full h-full bg-cyan-500/5 blur-[100px] pointer-events-none" />
      
      <Card className="w-full max-w-sm bg-slate-900/90 login-card border-slate-800 relative z-10 backdrop-blur-2xl shadow-2xl">
        <div className="text-center mb-8">
          
          {/* Contenedor del Logo - Recuadro más grande para mejor visibilidad */}
          <div className="relative group mx-auto mb-6 w-32 h-32 sm:w-36 sm:h-36">
            {/* Resplandor de fondo */}
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-[1.75rem] blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            
            {/* Contenedor principal: 
                - Se amplió para que el logo ocupe más espacio.
                - Se añadió padding suave para que el logo respire.
            */}
            <div className="relative w-full h-full rounded-[1.75rem] flex items-center justify-center border border-white/10 shadow-2xl p-4 bg-slate-950/10 backdrop-blur-xl z-10">
              <img
                src="/logo.png"
                alt="ZF Logo"
                className="w-full h-full object-contain scale-[1.18] drop-shadow-[0_0_28px_rgba(15,118,255,0.28)]"
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
              type="email"
              placeholder="nombre@zf.com" 
              value={email} 
              onChange={e => { setEmail(e.target.value); clearError(); }} 
              className="bg-slate-950 border-slate-800 focus:border-cyan-500 text-white login-text"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Contraseña</label>
            <Input 
              type="password"
              placeholder="••••••••" 
              value={password} 
              onChange={e => { setPassword(e.target.value); clearError(); }}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              className="bg-slate-950 border-slate-800 focus:border-cyan-500 text-white login-text"
            />
          </div>
          <Button 
            onClick={handleSubmit} 
            className="w-full h-11 btn-neon text-xs" 
            disabled={isLoading || !email.trim() || !password}
          >
            {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : 'ACCEDER AL SISTEMA'}
          </Button>
          {errorMessage && (
            <p className="text-sm text-rose-400 text-center mt-2" role="alert">
              {errorMessage}
            </p>
          )}

          {/* Botones de Login Automático para Pruebas */}
          <div className="mt-6 space-y-3">
            <p className="text-xs text-slate-500 text-center uppercase tracking-widest">Botones para pruebas</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { email: 'user@zf.com', label: '👤 Usuario' },
                { email: 'admin@zf.com', label: '👑 Admin' },
                { email: 'manager@zf.com', label: '👔 Manager' },
                { email: 'guard@zf.com', label: '🛡️ Guardia' },
                { email: 'auditor@zf.com', label: '🔍 Auditor', span: 'col-span-2' }
              ].map(({ email, label, span }) => (
                <button
                  key={email}
                  onClick={() => login(email, 'zyklus')}
                  className={`w-full py-2 px-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 text-xs font-medium hover:bg-slate-700/50 hover:border-slate-600 transition-all text-center disabled:opacity-50 ${span || ''}`}
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}