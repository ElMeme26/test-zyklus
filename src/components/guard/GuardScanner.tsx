import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { Button, Card, Input } from '../ui/core';
import { ScanLine, LogOut, LogIn, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { toast } from 'sonner';

export function GuardScanner() {
  const { processGuardScan } = useData();
  const [mode, setMode] = useState<'CHECKOUT' | 'CHECKIN'>('CHECKOUT');
  const [qrInput, setQrInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Estado para reporte de daños (Solo entrada)
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [isDamaged, setIsDamaged] = useState(false);
  const [pendingQr, setPendingQr] = useState('');

  const handleScan = async (qrOverride?: string) => {
    const qrToProcess = qrOverride || qrInput;
    if (!qrToProcess) return;

    if (mode === 'CHECKIN' && !qrOverride) {
      // Si es entrada, primero preguntamos por daños
      setPendingQr(qrToProcess);
      setShowDamageModal(true);
      return;
    }

    setIsProcessing(true);
    // Firma digital simulada (en prod sería un canvas)
    const signature = "sig_" + Math.random().toString(36).substring(7); 
    
    const result = await processGuardScan(qrToProcess, mode, signature, isDamaged);
    
    if (result.success) {
      setQrInput('');
      setIsDamaged(false);
    }
    setIsProcessing(false);
  };

  const confirmCheckIn = async () => {
    setShowDamageModal(false);
    await handleScan(pendingQr);
    setPendingQr('');
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Fondo decorativo */}
      <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md space-y-6 z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex p-4 rounded-full bg-surface border border-primary/30 shadow-[0_0_30px_rgba(6,182,212,0.3)] mb-4">
            <ScanLine size={48} className="text-primary animate-pulse-slow" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-wider">GUARD SCAN</h1>
          <p className="text-secondary text-sm">Punto de Control Digital</p>
        </div>

        {/* Switcher de Modo */}
        <div className="grid grid-cols-2 gap-4 bg-surface p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setMode('CHECKOUT')}
            className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all ${mode === 'CHECKOUT' ? 'bg-primary text-black font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-slate-400 hover:text-white'}`}
          >
            <LogOut size={24} className="mb-2"/> SALIDA
          </button>
          <button
            onClick={() => setMode('CHECKIN')}
            className={`flex flex-col items-center justify-center p-4 rounded-lg transition-all ${mode === 'CHECKIN' ? 'bg-emerald-500 text-black font-bold shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-white'}`}
          >
            <LogIn size={24} className="mb-2"/> ENTRADA
          </button>
        </div>

        {/* Área de Escaneo Simulado */}
        <Card className="border-primary/20">
          <div className="space-y-4">
            <label className="text-xs uppercase font-bold text-secondary tracking-widest">
              {mode === 'CHECKOUT' ? 'Escanear Pase de Salida' : 'Escanear Activo Retornante'}
            </label>
            <div className="flex gap-2">
              <Input 
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder='Esperando lectura de QR...'
                className="font-mono text-center tracking-widest text-lg h-12 bg-black/50 border-primary/30 focus:border-primary"
              />
            </div>
            <Button 
              onClick={() => handleScan()} 
              disabled={isProcessing || !qrInput}
              variant={mode === 'CHECKOUT' ? 'neon' : 'default'}
              className={`w-full h-14 text-lg ${mode === 'CHECKIN' ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : ''}`}
            >
              {isProcessing ? 'Procesando...' : mode === 'CHECKOUT' ? 'AUTORIZAR SALIDA' : 'REGISTRAR RETORNO'}
            </Button>
          </div>
        </Card>

        <p className="text-center text-xs text-slate-500 mt-8">
          ID Guardia: <span className="text-slate-300 font-mono">G-092</span> • Zona: <span className="text-slate-300">Acceso Norte</span>
        </p>
      </div>

      {/* Modal de Daños (Check-in) */}
      {showDamageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-sm border-2 border-accent">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-3 bg-accent/10 rounded-full text-accent mb-2">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">Inspección Física</h3>
              <p className="text-slate-300">¿El activo presenta daños visibles o golpes?</p>
              
              <div className="grid grid-cols-2 gap-3 w-full mt-4">
                <button 
                  onClick={() => { setIsDamaged(false); confirmCheckIn(); }}
                  className="flex items-center justify-center gap-2 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  <CheckCircle size={20} className="text-emerald-500"/>
                  Sin Daños
                </button>
                <button 
                  onClick={() => { setIsDamaged(true); confirmCheckIn(); }}
                  className="flex items-center justify-center gap-2 p-4 rounded-xl bg-accent/10 border border-accent/30 hover:bg-accent/20 text-accent transition-colors"
                >
                  <X size={20}/>
                  Con Daños
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}