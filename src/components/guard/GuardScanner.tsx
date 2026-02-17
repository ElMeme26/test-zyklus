import React, { useState, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Input } from '../ui/core';
import {
  ScanLine, LogOut, LogIn, AlertTriangle, CheckCircle,
  X, PenLine, Trash2, User, Box, Clock, Camera, CameraOff
} from 'lucide-react';
import { toast } from 'sonner';
import { Scanner } from '@yudiel/react-qr-scanner';
import type { Request } from '../../types';
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

// ─── RESULT CARD ─────────────────────────────────────────────
function ResultCard({ success, message, data, onReset }: {
  success: boolean;
  message: string;
  data?: Request;
  onReset: () => void;
}) {
  return (
    <Card className={`border-2 text-center animate-in fade-in slide-in-from-bottom-4 ${success ? 'border-emerald-500/40' : 'border-rose-500/40'}`}>
      <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${success ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
        {success ? <CheckCircle size={32} /> : <AlertTriangle size={32} />}
      </div>
      <h3 className={`text-xl font-black mb-2 ${success ? 'text-emerald-400' : 'text-rose-400'}`}>
        {success ? '✓ AUTORIZADO' : '✗ NO AUTORIZADO'}
      </h3>
      <p className="text-slate-300 text-sm mb-4">{message}</p>

      {success && data && (
        <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 mb-4 text-left space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1"><User size={10} /> Persona</span>
            <span className="text-white font-medium">{data.requester_name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1"><Box size={10} /> Activo</span>
            <span className="text-white font-medium">{data.assets?.name}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500 flex items-center gap-1"><Clock size={10} /> Días</span>
            <span className="text-primary font-mono">{data.days_requested} días</span>
          </div>
        </div>
      )}

      <Button onClick={onReset} className="w-full mt-2" variant="outline">
        Siguiente Escaneo
      </Button>
    </Card>
  );
}

// ─── DAMAGE MODAL ────────────────────────────────────────────
function DamageModal({ onConfirm }: { onConfirm: (isDamaged: boolean, notes: string) => void }) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-sm border-2 border-accent">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="p-3 bg-accent/10 rounded-full text-accent">
            <AlertTriangle size={32} />
          </div>
          <h3 className="text-xl font-bold text-white">Inspección de Retorno</h3>
          <p className="text-slate-300 text-sm">¿El activo presenta daños visibles, golpes o desgaste anormal?</p>

          <Input
            placeholder="Notas de daño (opcional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full text-sm"
          />

          <div className="grid grid-cols-2 gap-3 w-full">
            <button
              onClick={() => onConfirm(false, '')}
              className="flex items-center justify-center gap-2 p-4 rounded-xl bg-slate-800 border border-slate-700 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-400 transition-all"
            >
              <CheckCircle size={20} className="text-emerald-500" />
              Sin Daños
            </button>
            <button
              onClick={() => onConfirm(true, notes)}
              className="flex items-center justify-center gap-2 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 transition-all"
            >
              <X size={20} />
              Con Daños
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── MAIN GUARD SCANNER ──────────────────────────────────────
export function GuardScanner() {
  const { processGuardScan } = useData();
  const { logout } = useAuth();
  const [mode, setMode] = useState<'CHECKOUT' | 'CHECKIN'>('CHECKOUT');
  const [step, setStep] = useState<1 | 2>(1); // Paso 1: QR Solicitud, Paso 2: QR Activo
  const [qrInput, setQrInput] = useState('');
  const [requestQR, setRequestQR] = useState(''); // QR de la solicitud (paso 1)
  const [assetQR, setAssetQR] = useState('');    // QR del activo físico (paso 2)
  const [signature, setSignature] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; data?: Request } | null>(null);
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [pendingQr, setPendingQr] = useState('');
  const [useCamera, setUseCamera] = useState(false);

  const handleCameraScan = (detectedCodes: any) => {
    const code = detectedCodes?.[0]?.rawValue;
    if (!code) return;
    
    if (mode === 'CHECKOUT') {
      if (step === 1) {
        setRequestQR(code);
        setQrInput(code);
        toast.success('✓ Solicitud escaneada. Ahora escanea el activo físico.');
        setStep(2);
      } else {
        setAssetQR(code);
        setQrInput(code);
        setUseCamera(false);
        toast.success('✓ Activo escaneado. Listo para procesar.');
      }
    } else {
      // CHECKIN solo requiere un escaneo
      setQrInput(code);
      setUseCamera(false);
      toast.success('✓ QR escaneado');
    }
  };

  const handleManualInput = () => {
    if (!qrInput.trim()) { toast.warning('Ingresa un código QR'); return; }
    
    if (mode === 'CHECKOUT') {
      if (step === 1) {
        setRequestQR(qrInput);
        toast.success('✓ Solicitud ingresada. Ahora escanea el activo físico.');
        setStep(2);
        setQrInput('');
      } else {
        setAssetQR(qrInput);
        toast.success('✓ Activo ingresado. Listo para procesar.');
      }
    }
  };

  const handleScan = async () => {
    if (mode === 'CHECKOUT') {
      // Validar que tengamos ambos QR
      if (!requestQR || !assetQR) {
        toast.error('Faltan escaneos. Completa ambos pasos.');
        return;
      }

      // Validar que coincidan
      try {
        const reqData = JSON.parse(requestQR);
        const assetData = JSON.parse(assetQR);
        
        if (reqData.asset_id !== assetData.id && reqData.asset_id !== assetData.asset_id) {
          toast.error('⚠️ ERROR: El activo NO coincide con la solicitud');
          return;
        }
      } catch {
        toast.error('Error validando QRs');
        return;
      }

      setIsProcessing(true);
      const res = await processGuardScan(requestQR, 'CHECKOUT', signature || `sig_guard_${Date.now()}`);
      setResult(res);
      if (res.success) {
        setRequestQR('');
        setAssetQR('');
        setQrInput('');
        setStep(1);
      }
      setIsProcessing(false);
    } else {
      // CHECKIN
      if (!qrInput.trim()) { toast.warning('Ingresa o escanea un QR'); return; }
      setPendingQr(qrInput);
      setShowDamageModal(true);
    }
  };

  const handleDamageConfirm = async (isDamaged: boolean, notes: string) => {
    setShowDamageModal(false);
    setIsProcessing(true);
    const res = await processGuardScan(pendingQr, 'CHECKIN', signature || `sig_guard_${Date.now()}`, isDamaged, notes);
    setResult(res);
    if (res.success) setQrInput('');
    setPendingQr('');
    setIsProcessing(false);
  };

  const handleReset = () => {
    setResult(null);
    setQrInput('');
    setRequestQR('');
    setAssetQR('');
    setSignature('');
    setStep(1);
  };

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col items-center justify-start pt-8 relative overflow-hidden">
      {/* Background glow */}
      <div className={`absolute top-0 left-0 w-full h-64 opacity-10 blur-[100px] pointer-events-none ${mode === 'CHECKOUT' ? 'bg-cyan-500' : 'bg-emerald-500'}`} />

      {/* Damage Modal */}
      {showDamageModal && <DamageModal onConfirm={handleDamageConfirm} />}

      {/* Camera Scanner Modal */}
      {useCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-bold flex items-center gap-2">
                <Camera size={18} className="text-primary" />
                {mode === 'CHECKOUT' && step === 1 && 'Escanea QR de Solicitud'}
                {mode === 'CHECKOUT' && step === 2 && 'Escanea QR del Activo Físico'}
                {mode === 'CHECKIN' && 'Escanea QR del Activo'}
              </h3>
              <button onClick={() => setUseCamera(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="aspect-square bg-slate-950 rounded-xl overflow-hidden">
              <Scanner
                onScan={handleCameraScan}
                constraints={{ facingMode: 'environment' }}
                styles={{
                  container: { width: '100%', height: '100%' },
                  video: { width: '100%', height: '100%', objectFit: 'cover' }
                }}
              />
            </div>
            <p className="text-xs text-slate-500 text-center mt-3">
              Coloca el código QR dentro del recuadro
            </p>
          </Card>
        </div>
      )}

      <div className="w-full max-w-md space-y-5 z-10">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="text-center flex-1">
            <div className={`inline-flex p-3 rounded-full border mb-2 ${mode === 'CHECKOUT' ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_30px_rgba(6,182,212,0.3)]' : 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.3)]'}`}>
              <ScanLine size={36} className={`${mode === 'CHECKOUT' ? 'text-primary' : 'text-emerald-400'} animate-pulse-slow`} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-wider">GUARD SCAN</h1>
            <p className="text-[11px] text-slate-500">Control de Acceso Digital</p>
          </div>
          <</div>
            <div className="flex items-center gap-2">
              <ThemeToggle />  {/* ← AGREGAR AQUÍ */}
              <button onClick={logout} className="text-slate-500 hover:text-white p-2">
                <LogOut size={18} />
              </button>
            </div>
        </div>

        {!result ? (
          <>
            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => { setMode('CHECKOUT'); setStep(1); setRequestQR(''); setAssetQR(''); setQrInput(''); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all font-bold text-sm ${mode === 'CHECKOUT' ? 'bg-primary text-black shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'text-slate-500 hover:text-white'}`}
              >
                <LogOut size={16} /> SALIDA
              </button>
              <button
                onClick={() => { setMode('CHECKIN'); setStep(1); setRequestQR(''); setAssetQR(''); setQrInput(''); }}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all font-bold text-sm ${mode === 'CHECKIN' ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'text-slate-500 hover:text-white'}`}
              >
                <LogIn size={16} /> ENTRADA
              </button>
            </div>

            {/* QR Input */}
            <Card className={`border ${mode === 'CHECKOUT' ? 'border-primary/20' : 'border-emerald-500/20'}`}>
              <div className="space-y-4">
                {mode === 'CHECKOUT' && (
                  <div className="flex justify-center gap-2 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-primary text-black' : requestQR ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-500'}`}>
                      {requestQR ? '✓' : '1'}
                    </div>
                    <div className={`flex-1 h-1 self-center rounded ${requestQR ? 'bg-primary' : 'bg-slate-800'}`} />
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-primary text-black' : assetQR ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-500'}`}>
                      {assetQR ? '✓' : '2'}
                    </div>
                  </div>
                )}

                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest block">
                  {mode === 'CHECKOUT' && step === 1 && '① Escanear Pase de Salida (QR Solicitud)'}
                  {mode === 'CHECKOUT' && step === 2 && '② Escanear Activo Físico (Doble Factor)'}
                  {mode === 'CHECKIN' && '① Escanear Activo que Retorna'}
                </label>

                <div className="flex gap-2">
                  <Input
                    value={qrInput}
                    onChange={e => setQrInput(e.target.value)}
                    placeholder="Código QR manual o usa cámara..."
                    className={`font-mono text-sm flex-1 ${mode === 'CHECKOUT' ? 'border-primary/30 focus:border-primary' : 'border-emerald-500/30 focus:border-emerald-500'}`}
                    onKeyDown={e => e.key === 'Enter' && (mode === 'CHECKOUT' ? handleManualInput() : handleScan())}
                  />
                  <Button
                    onClick={() => setUseCamera(true)}
                    variant="outline"
                    size="icon"
                    className={`${mode === 'CHECKOUT' ? 'border-primary/30 hover:bg-primary/10' : 'border-emerald-500/30 hover:bg-emerald-500/10'}`}
                  >
                    <Camera size={18} />
                  </Button>
                </div>

                {mode === 'CHECKOUT' && step === 1 && qrInput && (
                  <Button onClick={handleManualInput} className="w-full" variant="outline">
                    Confirmar Solicitud →
                  </Button>
                )}

                {/* Firma Digital (Solo en CHECKOUT, paso 2) */}
                {mode === 'CHECKOUT' && step === 2 && (
                  <SignaturePad onSign={setSignature} />
                )}

                {/* Botón Final */}
                {((mode === 'CHECKOUT' && step === 2 && requestQR && assetQR) || mode === 'CHECKIN') && (
                  <Button
                    onClick={() => handleScan()}
                    disabled={isProcessing || (mode === 'CHECKIN' && !qrInput.trim())}
                    className={`w-full h-14 text-base font-black tracking-wider ${mode === 'CHECKIN' ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)]' : ''}`}
                    variant={mode === 'CHECKOUT' ? 'neon' : 'default'}
                  >
                    {isProcessing
                      ? 'Procesando...'
                      : mode === 'CHECKOUT'
                        ? '⚡ AUTORIZAR SALIDA'
                        : '↩ REGISTRAR RETORNO'}
                  </Button>
                )}
              </div>
            </Card>

            <p className="text-center text-[10px] text-slate-600">
              Guardia: <span className="text-slate-400 font-mono">G-{Math.floor(Math.random() * 900) + 100}</span>
              {' · '}Zona: <span className="text-slate-400">Acceso Principal</span>
            </p>
          </>
        ) : (
          <ResultCard
            success={result.success}
            message={result.message}
            data={result.data}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}