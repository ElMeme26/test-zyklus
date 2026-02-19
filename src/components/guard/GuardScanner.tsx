import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input } from '../ui/core';
import { ScanLine, LogOut, LogIn, AlertTriangle, CheckCircle, X, PenLine, Trash2, Box, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { Scanner } from '@yudiel/react-qr-scanner';
import { ThemeToggle } from '../ui/ThemeToggle';

// ─── SIGNATURE PAD ────────────────────────────────────────────
function SignaturePad({ onSign }: { onSign: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const [hasSigned, setHasSigned] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const source = 'touches' in e ? e.touches[0] : e;
    return { x: source.clientX - rect.left, y: source.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawing.current = true;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSigned(true);
  };

  const stopDraw = () => {
    isDrawing.current = false;
    if (hasSigned && canvasRef.current) {
      onSign(canvasRef.current.toDataURL('image/png'));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSigned(false);
    onSign('');
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-xs text-slate-400 uppercase font-bold flex items-center gap-1">
          <PenLine size={12} /> Firma Digital del Receptor
        </label>
        {hasSigned && (
          <button onClick={clearCanvas} className="text-slate-500 hover:text-rose-400 transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>
      <div className="relative bg-slate-950 border border-primary/20 rounded-xl overflow-hidden">
        <canvas
          ref={canvasRef}
          width={380}
          height={120}
          className="w-full touch-none cursor-crosshair"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        {!hasSigned && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-slate-600 text-xs">Firme aquí con el dedo o stylus</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MAIN GUARD SCANNER ──────────────────────────────────────
export function GuardScanner() {
  const { processGuardScan } = useData();
  const { logout } = useAuth();
  
  const [mode, setMode] = useState<'CHECKOUT' | 'CHECKIN'>('CHECKOUT');
  const [useCamera, setUseCamera] = useState(false);
  
  // Flujo Salida (Checkout)
  const [step, setStep] = useState<1 | 2>(1); 
  const [activeComboRequests, setActiveComboRequests] = useState<any[]>([]); 
  const [scannedPhysicalAssets, setScannedPhysicalAssets] = useState<string[]>([]); 
  const [signature, setSignature] = useState('');
  
  // Flujo Retorno (Checkin)
  const [returnAssetData, setReturnAssetData] = useState<any>(null);
  const [isDamaged, setIsDamaged] = useState(false);
  const [damageNotes, setDamageNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCameraScan = async (detectedCodes: any) => {
    const code = detectedCodes?.[0]?.rawValue;
    if (!code) return;
    setUseCamera(false);
    
    if (mode === 'CHECKOUT') {
      if (step === 1) {
        setIsProcessing(true);
        const res = await processGuardScan(code, 'CHECKOUT');
        if(res.success && res.data) {
           setActiveComboRequests(res.data as any[]);
           toast.success(`✓ Solicitud autorizada. Escanea los ${res.data.length} activos físicos.`);
           setStep(2);
        } else {
           toast.error(res.message || 'Error en solicitud');
        }
        setIsProcessing(false);
      } else {
        // PASO 2: Escanear Activo Físico
        try {
           const physicalData = JSON.parse(code);
           const physicalId = physicalData.id || physicalData.asset_id;
           const existsInCombo = activeComboRequests.find(req => req.asset_id === physicalId);
           
           if(existsInCombo) {
              if(!scannedPhysicalAssets.includes(physicalId)) {
                 const newScanned = [...scannedPhysicalAssets, physicalId];
                 setScannedPhysicalAssets(newScanned);
                 if(newScanned.length === activeComboRequests.length) {
                   toast.success('Todos los activos verificados. Procede a firmar.');
                 } else {
                   toast.success(`Activo verificado (${newScanned.length}/${activeComboRequests.length})`);
                 }
              } else {
                 toast.warning('Este activo ya fue verificado.');
              }
           } else {
              toast.error('⚠️ Este activo físico NO pertenece a la solicitud autorizada.');
           }
        } catch {
           toast.error('Código físico inválido');
        }
      }
    } else {
      // CHECKIN
      setReturnAssetData(code);
    }
  };

  const handleFinalCheckout = async () => {
    setIsProcessing(true);
    // Mock del QR de solicitud original para enviar el ID a la función
    const mockQr = JSON.stringify({ 
      request_id: activeComboRequests[0].id, 
      bundle_group_id: activeComboRequests[0].bundle_group_id 
    });
    
    const res = await processGuardScan(mockQr, 'CHECKOUT', signature);
    if(res.success) {
       toast.success('Salida registrada con éxito. Puerta Abierta.');
       setStep(1); setActiveComboRequests([]); setScannedPhysicalAssets([]); setSignature('');
    } else {
       toast.error(res.message);
    }
    setIsProcessing(false);
  }

  const handleFinalCheckin = async () => {
    setIsProcessing(true);
    const res = await processGuardScan(returnAssetData, 'CHECKIN', '', isDamaged, damageNotes);
    if(res.success) {
      setReturnAssetData(null); setIsDamaged(false); setDamageNotes('');
    } else {
      toast.error(res.message);
    }
    setIsProcessing(false);
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center pt-8">
      
      {/* Modal Scanner */}
      {useCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95">
          <Card className="w-full max-w-md border-primary/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold"><Camera className="inline mr-2 text-primary"/> Escáner</h3>
              <button onClick={() => setUseCamera(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="aspect-square bg-slate-950 rounded-xl overflow-hidden border border-slate-800">
              <Scanner onScan={handleCameraScan} />
            </div>
          </Card>
        </div>
      )}

      <div className="w-full max-w-md space-y-5">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="text-left">
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              <ScanLine className="text-primary"/> GUARD SCAN
            </h1>
            <p className="text-[10px] text-slate-500">Control de Acceso Patrimonial</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={logout}><LogOut size={18} /></Button>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800 shadow-inner">
          <button 
            onClick={() => {setMode('CHECKOUT'); setStep(1); setActiveComboRequests([]); setScannedPhysicalAssets([]);}} 
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'CHECKOUT' ? 'bg-primary text-black shadow-md' : 'text-slate-400'}`}
          >
            <LogOut size={14} className="inline mr-1"/> Salida
          </button>
          <button 
            onClick={() => {setMode('CHECKIN'); setReturnAssetData(null);}} 
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'CHECKIN' ? 'bg-emerald-500 text-black shadow-md' : 'text-slate-400'}`}
          >
            <LogIn size={14} className="inline mr-1"/> Retorno
          </button>
        </div>

        <Card className={`border ${mode === 'CHECKOUT' ? 'border-primary/20' : 'border-emerald-500/20'}`}>
          
          {/* VISTA DE CHECKOUT (SALIDA) */}
          {mode === 'CHECKOUT' && (
            <div className="space-y-4">
               {/* Stepper */}
               <div className="flex justify-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-primary text-black' : 'bg-emerald-500 text-black'}`}>
                    {step > 1 ? '✓' : '1'}
                  </div>
                  <div className={`flex-1 h-1 self-center rounded ${step === 2 ? 'bg-primary' : 'bg-slate-800'}`} />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-primary text-black' : 'bg-slate-800 text-slate-500'}`}>2</div>
               </div>

               <label className="text-[10px] uppercase font-bold text-slate-500 text-center block">
                  {step === 1 ? 'Paso 1: Escanear QR del Usuario (Pase de Salida)' : `Paso 2: Escanear Físicos (${scannedPhysicalAssets.length}/${activeComboRequests.length})`}
               </label>

               {/* Resumen de activos a verificar (Paso 2) */}
               {step === 2 && (
                 <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2 max-h-40 overflow-y-auto">
                   <p className="text-xs font-bold text-white mb-2">Activos a verificar:</p>
                   {activeComboRequests.map(req => {
                      const isScanned = scannedPhysicalAssets.includes(req.asset_id);
                      return (
                        <div key={req.id} className={`flex items-center justify-between p-2 rounded border ${isScanned ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900 border-slate-700'}`}>
                           <span className="text-xs text-slate-300">{req.assets?.name}</span>
                           {isScanned ? <CheckCircle size={14} className="text-emerald-400"/> : <Box size={14} className="text-slate-500"/>}
                        </div>
                      )
                   })}
                 </div>
               )}

               {/* Botón de Cámara Principal */}
               {step === 1 || (step === 2 && scannedPhysicalAssets.length < activeComboRequests.length) ? (
                 <Button onClick={() => setUseCamera(true)} disabled={isProcessing} className="w-full h-14 bg-slate-800 hover:bg-slate-700 border border-primary/30 text-white font-bold tracking-wider">
                    {isProcessing ? 'Procesando...' : <><Camera size={20} className="mr-2 text-primary" /> ABRIR ESCÁNER</>}
                 </Button>
               ) : null}

               {/* Firma se habilita cuando todos los activos se verificaron */}
               {step === 2 && scannedPhysicalAssets.length === activeComboRequests.length && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 mt-6">
                     <SignaturePad onSign={setSignature} />
                     <Button 
                        onClick={handleFinalCheckout} 
                        className="w-full mt-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black tracking-widest h-14" 
                        disabled={!signature || isProcessing}
                      >
                        {isProcessing ? 'PROCESANDO...' : 'CONFIRMAR SALIDA'}
                     </Button>
                  </div>
               )}
            </div>
          )}

          {/* VISTA DE CHECKIN (RETORNO) */}
          {mode === 'CHECKIN' && (
            <div className="space-y-4">
              {!returnAssetData ? (
                <>
                  <div className="text-center py-6 text-slate-500">
                    <Box size={40} className="mx-auto mb-3 opacity-30 text-emerald-500" />
                    <p className="text-sm mb-1">Para devoluciones, escanea el QR físico pegado al equipo.</p>
                  </div>
                  <Button onClick={() => setUseCamera(true)} className="w-full h-14 bg-slate-800 hover:bg-slate-700 border border-emerald-500/30 text-emerald-400 font-bold tracking-wider">
                    <Camera size={20} className="mr-2" /> ESCANEAR ACTIVO
                  </Button>
                </>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
                    <AlertTriangle className="text-amber-500"/> Inspección Física
                  </h3>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-900 rounded">
                      <input 
                        type="checkbox" 
                        checked={isDamaged} 
                        onChange={e => setIsDamaged(e.target.checked)} 
                        className="w-6 h-6 accent-rose-500 rounded cursor-pointer" 
                      />
                      <span className="text-sm font-medium text-slate-300">
                        El equipo presenta daños visibles o desperfectos.
                      </span>
                    </label>

                    {isDamaged && (
                      <textarea 
                        value={damageNotes} 
                        onChange={e => setDamageNotes(e.target.value)} 
                        placeholder="Describe los daños encontrados (Obligatorio)..." 
                        className="w-full h-24 bg-slate-900 border border-rose-500/30 rounded-lg p-3 text-sm text-white placeholder:text-slate-500 focus:ring-1 focus:ring-rose-500 resize-none" 
                      />
                    )}

                    <Button 
                      onClick={handleFinalCheckin} 
                      disabled={isProcessing || (isDamaged && !damageNotes.trim())} 
                      className={`w-full h-12 font-black tracking-wide ${isDamaged ? 'bg-rose-500 hover:bg-rose-400 text-white' : 'bg-emerald-500 hover:bg-emerald-400 text-black'}`}
                    >
                       {isProcessing ? 'PROCESANDO...' : isDamaged ? 'REPORTAR DAÑO Y DEVOLVER' : 'ACEPTAR DEVOLUCIÓN LIMPIA'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </Card>
      </div>
    </div>
  );
}