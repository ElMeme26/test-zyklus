// src/components/guard/GuardScanner.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useData, type ComboCheckinState } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/core';
import {
  ScanLine, LogOut, Check, X, AlertTriangle, Package,
  CheckCircle2, Loader2, Scan, RefreshCw, RefreshCcw,
  QrCode, User as UserIcon
} from 'lucide-react';
import { toast } from 'sonner';
import jsQR from 'jsqr';
import SignatureCanvas from 'react-signature-canvas';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { NotificationCenter } from '../ui/NotificationCenter';
import { ThemeToggle } from '../ui/ThemeToggle';

type ScanMode = 'CHECKOUT' | 'CHECKIN';
type Step =
  | 'idle'
  | 'scanning'
  | 'verifying'
  | 'asset_verification'
  | 'signing'
  | 'combo_checkin'
  | 'damage_check'
  | 'done';

// ─── FUNCIÓN PARA REPRODUCIR PITIDO ──────────────────────────────
function playBeep() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch {
    if (navigator.vibrate) navigator.vibrate(50);
  }
}

// ─── CAMERA QR SCANNER ───────────────────────────────────────
function CameraScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const hasScanned = useRef(false);

  useEffect(() => {
    let active = true;
    hasScanned.current = false;

    const scan = () => {
      if (!active || hasScanned.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      if (video.readyState < video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
      if (code && code.data) {
        hasScanned.current = true;
        playBeep();
        streamRef.current?.getTracks().forEach(t => t.stop());
        onCode(code.data);
        return;
      }
      rafRef.current = requestAnimationFrame(scan);
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current && active) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          rafRef.current = requestAnimationFrame(scan);
        }
      } catch (err) {
        console.error('Camera error:', err);
        toast.error('No se pudo acceder a la cámara. Verifica los permisos.');
        onClose();
      }
    };

    startCamera();
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [onCode, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 bg-black/80">
        <h2 className="text-white font-bold">Escanear QR</h2>
        <button onClick={onClose} className="text-white p-2 rounded-xl bg-white/10"><X size={20} /></button>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
        <canvas ref={canvasRef} className="hidden" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute inset-0 bg-black/50" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, calc(50% - 110px) calc(50% - 110px), calc(50% - 110px) calc(50% + 110px), calc(50% + 110px) calc(50% + 110px), calc(50% + 110px) calc(50% - 110px), calc(50% - 110px) calc(50% - 110px))' }} />
          <div className="relative w-56 h-56">
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-xl" />
            <div className="absolute left-2 right-2 h-0.5 bg-primary/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]" style={{ animation: 'scanLine 2s linear infinite', top: '0%' }} />
          </div>
        </div>
      </div>
      <div className="px-4 py-4 bg-black/80 text-center">
        <p className="text-slate-400 text-xs">Apunta la cámara al código QR del activo o solicitud</p>
      </div>
      <style>{`@keyframes scanLine { 0% { transform: translateY(0); } 50% { transform: translateY(220px); } 100% { transform: translateY(0); } }`}</style>
    </div>
  );
}

export function GuardScanner() {
  const { processGuardScan, confirmComboCheckin, fetchData } = useData();
  const { user, logout } = useAuth();

  const [mode, setMode] = useState<ScanMode>('CHECKOUT');
  const [step, setStep] = useState<Step>('idle');
  const [scanning, setScanning] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [verifiedData, setVerifiedData] = useState<Record<string, unknown>[] | null>(null);
  const [rawQR, setRawQR] = useState('');
  const sigRef = useRef<SignatureCanvas>(null);

  const [comboState, setComboState] = useState<ComboCheckinState | null>(null);

  // ── Estado del daño (se resetea en cada ciclo)
  const [isDamaged, setIsDamaged] = useState(false);
  const [damageNotes, setDamageNotes] = useState('');

  const [scannedAssets, setScannedAssets] = useState<Set<string>>(new Set());
  const [expectedAssetIds, setExpectedAssetIds] = useState<string[]>([]);

  // ── Estado "snapshot" para la pantalla done
  // Se captura justo antes de setStep('done') para evitar que el reset
  // borre los valores antes de que la pantalla los lea.
  const [doneMessage, setDoneMessage] = useState('');
  const [doneMode, setDoneMode] = useState<ScanMode>('CHECKOUT');
  const [doneDamaged, setDoneDamaged] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setIsRefreshing(false);
    toast.success('Datos actualizados');
  };

  const reset = useCallback(() => {
    setStep('idle');
    setScanning(false);
    setVerifiedData(null);
    setRawQR('');
    setComboState(null);
    setIsDamaged(false);
    setDamageNotes('');
    setScannedAssets(new Set());
    setExpectedAssetIds([]);
    setDoneMessage('');
    setDoneMode('CHECKOUT');
    setDoneDamaged(false);
    sigRef.current?.clear();
  }, []);

  // ─── QR CODE HANDLER ────────────────────────────────────────
  const handleQR = useCallback(async (code: string) => {
    setScanning(false);
    setStep('verifying');
    setRawQR(code);

    try {
      const result = await processGuardScan(code, mode);

      if (!result.success && !result.comboState) {
        toast.error(result.message || 'Error al procesar el QR');
        setStep('idle');
        return;
      }

      if (mode === 'CHECKOUT') {
        if (result.data && Array.isArray(result.data) && result.data.length > 0) {
          setVerifiedData(result.data as Record<string, unknown>[]);
          const assetIds = (result.data as Array<{ asset_id?: string }>)
            .map(req => req.asset_id)
            .filter((id): id is string => Boolean(id));
          setExpectedAssetIds(assetIds);
          setScannedAssets(new Set());
          setStep('asset_verification');
        } else {
          toast.error('No se encontraron solicitudes aprobadas para este QR');
          setStep('idle');
        }
      } else {
        // CHECKIN
        if (result.comboState) {
          setComboState(result.comboState);
          setStep('combo_checkin');
          toast.success('Primer activo del combo escaneado ✓');
        } else {
          // Activo individual — ir a inspección de daños
          setStep('damage_check');
        }
      }
    } catch (error) {
      console.error('Error procesando QR:', error);
      toast.error('Error al procesar el código QR');
      setStep('idle');
    }
  }, [mode, processGuardScan]);

  // ─── VERIFICAR ACTIVO FÍSICO EN CHECKOUT ────────────────────────
  const handleAssetVerification = useCallback(async (code: string) => {
    setScanning(false);
    playBeep();
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(code); } catch { toast.error('QR inválido'); return; }

    const scannedId = (parsed.id || parsed.asset_id) as string;
    if (!scannedId) { toast.error('QR sin ID de activo'); return; }
    if (!expectedAssetIds.includes(scannedId)) { toast.error('⚠️ Este activo no corresponde a la solicitud'); return; }
    if (scannedAssets.has(scannedId)) { toast.warning('Este activo ya fue escaneado'); return; }

    const newScanned = new Set(scannedAssets);
    newScanned.add(scannedId);
    setScannedAssets(newScanned);

    const assetInfo = verifiedData?.find(req => (req as { asset_id?: string }).asset_id === scannedId);
    const assetName = (assetInfo as { assets?: { name?: string } })?.assets?.name || scannedId;
    toast.success(`✓ ${assetName} verificado`);

    if (newScanned.size === expectedAssetIds.length) {
      toast.success('Todos los activos verificados ✓');
      setStep('signing');
    }
  }, [scannedAssets, expectedAssetIds, verifiedData]);

  // ─── COMBO: scan next asset ──────────────────────────────────
  const handleNextComboScan = useCallback(async (code: string) => {
    if (!comboState) return;
    setScanning(false);
    playBeep();

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(code); } catch { toast.error('QR inválido'); return; }

    const scannedId = (parsed.id || parsed.asset_id) as string;
    if (!scannedId) { toast.error('QR sin ID de activo'); return; }

    const isPending = comboState.pendingAssets.find(a => a.id === scannedId);
    const alreadyScanned = comboState.scannedAssetIds.includes(scannedId);

    if (alreadyScanned) { toast.warning('Este activo ya fue escaneado'); return; }
    if (!isPending) { toast.error('Este activo no pertenece al combo'); return; }

    const newScanned = [...comboState.scannedAssetIds, scannedId];
    const newPending = comboState.pendingAssets.filter(a => a.id !== scannedId);
    const updatedState: ComboCheckinState = { ...comboState, scannedAssetIds: newScanned, pendingAssets: newPending };
    setComboState(updatedState);
    toast.success(`✓ ${isPending.name} escaneado`);

    if (newPending.length === 0) setStep('damage_check');
  }, [comboState]);

  // ─── CHECKOUT CONFIRM ────────────────────────────────────────
  const handleCheckoutConfirm = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) { toast.error('Firma digital requerida'); return; }
    const sig = sigRef.current.toDataURL();
    const result = await processGuardScan(rawQR, 'CHECKOUT', sig);
    if (result.success) {
      // Capturar snapshot antes de transicionar
      setDoneMode('CHECKOUT');
      setDoneDamaged(false);
      setDoneMessage('Salida confirmada correctamente');
      toast.success(result.message);
      setStep('done');
    } else {
      toast.error(result.message);
    }
  };

// ─── CHECKIN CONFIRM ─────────────────────────────────────────
  const handleCheckinConfirm = async () => {
    if (isDamaged && !damageNotes.trim()) { toast.error('Describe el daño'); return; }

    let result;
    if (comboState) {
      result = await confirmComboCheckin(comboState, isDamaged, damageNotes);
    } else {
      // 👇 Añadimos 'CONFIRM' como tercer parámetro en lugar del string vacío ''
      result = await processGuardScan(rawQR, 'CHECKIN', 'CONFIRM', isDamaged, damageNotes);
    }

    if (result.success) {
      setDoneMessage(isDamaged ? 'Equipo recibido — enviado a revisión de mantenimiento' : 'Devolución registrada correctamente');
      setStep('done');
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {scanning && (
        <CameraScanner
          onCode={
            step === 'combo_checkin' ? handleNextComboScan :
            step === 'asset_verification' ? handleAssetVerification :
            handleQR
          }
          onClose={() => { setScanning(false); if (step === 'scanning') setStep('idle'); }}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
              <ScanLine size={18} className="text-primary" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">Guardia de Seguridad</h1>
              <p className="text-slate-500 text-[10px]">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/10 border border-slate-800 hover:border-primary/30 transition-all active:scale-90"
              title="Actualizar datos"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin text-primary' : ''} />
            </button>
            <NotificationCenter />
            <ThemeToggle />
            <button onClick={logout} className="p-2 text-slate-400 hover:text-rose-400 transition-colors rounded-xl hover:bg-slate-800">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex px-4 pb-3 gap-2">
          {(['CHECKOUT', 'CHECKIN'] as ScanMode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); reset(); }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mode === m ? 'bg-primary text-black shadow-lg shadow-primary/30' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
            >
              {m === 'CHECKOUT' ? '📤 Salida' : '📥 Entrada'}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-4">

        {/* ── IDLE */}
        {step === 'idle' && (
          <div className="space-y-4">
            <div className="text-center py-10">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 shadow-[0_0_40px_rgba(6,182,212,0.15)]">
                {mode === 'CHECKOUT' ? <QrCode size={36} className="text-primary" /> : <Scan size={36} className="text-primary" />}
              </div>
              <h2 className="text-white font-black text-xl mb-1">
                {mode === 'CHECKOUT' ? 'Registrar Salida' : 'Registrar Entrada'}
              </h2>
              <p className="text-slate-500 text-sm">
                {mode === 'CHECKOUT'
                  ? 'Escanea el QR del solicitante (generado desde la app)'
                  : 'Escanea el QR físico del activo (etiqueta en el equipo)'}
              </p>
            </div>
            <button
              onClick={() => { setStep('scanning'); setScanning(true); }}
              className="w-full py-5 rounded-2xl bg-primary text-black font-black text-base flex items-center justify-center gap-3 shadow-lg shadow-primary/30 active:scale-[0.97] transition-all"
            >
              <ScanLine size={22} /> Abrir Escáner de Cámara
            </button>
          </div>
        )}

        {/* ── VERIFYING (loading) */}
        {step === 'verifying' && !verifiedData && (
          <div className="text-center py-16">
            <Loader2 size={40} className="text-primary animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Verificando...</p>
          </div>
        )}

        {/* ── CHECKOUT: VERIFICACIÓN DE ACTIVOS FÍSICOS */}
        {step === 'asset_verification' && verifiedData && mode === 'CHECKOUT' && (
          <div className="space-y-4">
            <Card className="border-amber-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <ScanLine size={20} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold">Verificar Activos Físicos</h2>
                  <p className="text-amber-400 text-xs font-bold">
                    {scannedAssets.size}/{expectedAssetIds.length} activos escaneados
                  </p>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-800 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${(scannedAssets.size / expectedAssetIds.length) * 100}%` }}
                />
              </div>

              <p className="text-slate-400 text-sm mb-4">
                Escanea el QR físico de cada activo que se va a retirar para verificar que coincida con la solicitud.
              </p>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {verifiedData.map((req, i) => {
                  const r = req as { asset_id?: string; assets?: { name?: string; tag?: string } };
                  const assetId = r.asset_id || '';
                  const isScanned = scannedAssets.has(assetId);
                  return (
                    <div key={i} className={`flex items-center justify-between py-2 px-3 rounded-lg border ${isScanned ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-900/50 border-slate-800'}`}>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${isScanned ? 'text-emerald-300' : 'text-white'}`}>{r.assets?.name || `Activo #${assetId}`}</p>
                        <p className="text-slate-500 text-xs font-mono">{r.assets?.tag}</p>
                      </div>
                      {isScanned
                        ? <CheckCircle2 size={20} className="text-emerald-400 flex-shrink-0" />
                        : <div className="w-5 h-5 rounded-full border-2 border-dashed border-slate-600 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </Card>

            {scannedAssets.size < expectedAssetIds.length ? (
              <button
                onClick={() => setScanning(true)}
                className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-black flex items-center justify-center gap-3 shadow-lg shadow-amber-500/30 active:scale-[0.97] transition-all"
              >
                <ScanLine size={20} /> Escanear Activo Físico
              </button>
            ) : (
              <button
                onClick={() => setStep('signing')}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center justify-center gap-3"
              >
                <Check size={20} /> Todos verificados — Continuar a Firma
              </button>
            )}
            <button onClick={reset} className="w-full text-xs text-slate-600 py-1">Cancelar</button>
          </div>
        )}

        {/* ── SIGNING */}
        {step === 'signing' && (
          <div className="space-y-4">
            <h2 className="text-white font-bold text-lg">Firma Digital</h2>
            <p className="text-slate-400 text-sm">El solicitante debe firmar antes de retirar el equipo.</p>
            <Card className="p-0 overflow-hidden border-slate-700">
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{ className: 'w-full h-52 touch-none', style: { background: '#0f172a' } }}
                backgroundColor="#0f172a"
                penColor="#06b6d4"
              />
            </Card>
            <div className="flex gap-3">
              <button onClick={() => sigRef.current?.clear()} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm font-bold flex items-center justify-center gap-2">
                <RefreshCcw size={14} /> Borrar
              </button>
              <button onClick={handleCheckoutConfirm} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-sm font-black flex items-center justify-center gap-2">
                <Check size={16} /> Confirmar Salida
              </button>
            </div>
            <button onClick={reset} className="w-full text-xs text-slate-600 py-1">Cancelar</button>
          </div>
        )}

        {/* ── COMBO CHECKIN */}
        {step === 'combo_checkin' && comboState && (
          <div className="space-y-4">
            <Card className="border-cyan-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Package size={20} className="text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold">Combo — Devolución</h2>
                  <p className="text-cyan-400 text-xs font-bold">{comboState.scannedAssetIds.length}/{comboState.totalAssets} escaneados</p>
                </div>
              </div>

              <div className="w-full h-2 bg-slate-800 rounded-full mb-4 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(comboState.scannedAssetIds.length / comboState.totalAssets) * 100}%` }}
                />
              </div>

              {comboState.allRequests.filter(r => comboState.scannedAssetIds.includes(r.asset_id)).map(r => (
                <div key={r.asset_id} className="flex items-center gap-3 py-2 border-b border-slate-800">
                  <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                  <span className="text-sm text-emerald-300 font-medium">{r.assets?.name || r.asset_id}</span>
                  <span className="text-xs text-slate-500 font-mono ml-auto">{r.assets?.tag}</span>
                </div>
              ))}

              {comboState.pendingAssets.map(a => (
                <div key={a.id} className="flex items-center gap-3 py-2 border-b border-slate-800 last:border-0">
                  <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-600 flex-shrink-0" />
                  <span className="text-sm text-slate-400">{a.name}</span>
                  <span className="text-xs text-slate-600 font-mono ml-auto">{a.tag}</span>
                </div>
              ))}
            </Card>

            {comboState.pendingAssets.length > 0 ? (
              <button
                onClick={() => setScanning(true)}
                className="w-full py-4 rounded-2xl bg-primary text-black font-black flex items-center justify-center gap-3 shadow-lg shadow-primary/30 active:scale-[0.97]"
              >
                <ScanLine size={20} /> Escanear siguiente activo
              </button>
            ) : (
              <button
                onClick={() => setStep('damage_check')}
                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center justify-center gap-3"
              >
                <Check size={20} /> Todos escaneados — Continuar
              </button>
            )}
            <button onClick={reset} className="w-full text-xs text-slate-600 py-1">Cancelar devolución</button>
          </div>
        )}

        {/* ── DAMAGE CHECK */}
        {step === 'damage_check' && (
          <div className="space-y-4">
            <Card>
              <h2 className="text-white font-bold text-lg mb-2">¿Condición del equipo?</h2>
              <p className="text-slate-400 text-sm mb-5">Inspecciona el equipo físicamente antes de confirmar.</p>

              <div className="grid grid-cols-2 gap-3">
                {/* Sin daños */}
                <button
                  onClick={() => { setIsDamaged(false); setDamageNotes(''); }}
                  className={`py-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${
                    !isDamaged
                      ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                  }`}
                >
                  <Check size={32} className={!isDamaged ? 'text-emerald-400' : 'text-slate-600'} />
                  <span className={`text-sm font-black ${!isDamaged ? 'text-emerald-400' : 'text-slate-500'}`}>
                    Sin Daños
                  </span>
                  {!isDamaged && (
                    <span className="text-[10px] text-emerald-500 font-bold">✓ Seleccionado</span>
                  )}
                </button>

                {/* Con daños */}
                <button
                  onClick={() => setIsDamaged(true)}
                  className={`py-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all active:scale-95 ${
                    isDamaged
                      ? 'border-rose-500 bg-rose-500/10 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                      : 'border-slate-700 bg-slate-900/50 hover:border-slate-600'
                  }`}
                >
                  <AlertTriangle size={32} className={isDamaged ? 'text-rose-400' : 'text-slate-600'} />
                  <span className={`text-sm font-black ${isDamaged ? 'text-rose-400' : 'text-slate-500'}`}>
                    Con Daños
                  </span>
                  {isDamaged && (
                    <span className="text-[10px] text-rose-500 font-bold">✓ Seleccionado</span>
                  )}
                </button>
              </div>

              {/* Descripción del daño — solo si isDamaged */}
              {isDamaged && (
                <div className="mt-5 space-y-2 animate-in slide-in-from-top-2 duration-200">
                  <label className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle size={11} /> Describe el daño <span className="text-rose-500 ml-0.5">*</span>
                  </label>
                  <textarea
                    value={damageNotes}
                    onChange={e => setDamageNotes(e.target.value)}
                    placeholder="Ej: Pantalla rayada, faltó cable de alimentación, golpe en la esquina..."
                    className="w-full h-28 bg-slate-950 border border-rose-500/40 focus:border-rose-500 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500/30 resize-none transition-all"
                    autoFocus
                  />
                  {!damageNotes.trim() && (
                    <p className="text-rose-400/70 text-xs flex items-center gap-1">
                      <AlertTriangle size={10} /> Campo requerido para continuar
                    </p>
                  )}
                </div>
              )}
            </Card>

            {/* Botón confirmar */}
            <button
              onClick={handleCheckinConfirm}
              disabled={isDamaged && !damageNotes.trim()}
              className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                isDamaged
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-500/20'
                  : 'bg-primary text-black shadow-lg shadow-primary/30'
              }`}
            >
              <CheckCircle2 size={20} />
              {isDamaged ? 'Confirmar Entrada con Daño Reportado' : 'Confirmar Entrada — Sin Daños'}
            </button>

            <button onClick={reset} className="w-full text-xs text-slate-600 py-1">Cancelar</button>
          </div>
        )}

        {/* ── DONE ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center text-center py-10 space-y-6 animate-in fade-in duration-300">

            {/* Ícono */}
            <div className={`w-28 h-28 rounded-3xl flex items-center justify-center border-2 shadow-2xl ${
              doneDamaged
                ? 'bg-amber-500/10 border-amber-500/40 shadow-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/40 shadow-emerald-500/20'
            }`}>
              {doneDamaged
                ? <AlertTriangle size={56} className="text-amber-400" />
                : <CheckCircle2 size={56} className="text-emerald-400" />}
            </div>

            {/* Texto */}
            <div className="space-y-2">
              <h2 className="text-white font-black text-3xl">¡Listo!</h2>
              <p className="text-slate-400 text-base max-w-xs mx-auto leading-relaxed">{doneMessage}</p>
            </div>

            {/* Badge de daño */}
            {doneDamaged && doneMode === 'CHECKIN' && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3">
                <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                <span className="text-amber-300 text-sm font-bold">Activo enviado a Requiere Mantenimiento</span>
              </div>
            )}

            {/* Badge de tipo de operación */}
            <div className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-black uppercase tracking-widest border ${
              doneMode === 'CHECKOUT'
                ? 'bg-primary/10 border-primary/30 text-primary'
                : doneDamaged
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              {doneMode === 'CHECKOUT' ? '📤 Salida registrada' : doneDamaged ? '⚠️ Entrada con daño' : '📥 Entrada registrada'}
            </div>

            {/* Botón siguiente */}
            <button
              onClick={reset}
              className="flex items-center gap-3 px-10 py-4 rounded-2xl bg-primary text-black font-black text-lg shadow-lg shadow-primary/40 hover:bg-cyan-400 active:scale-[0.97] transition-all"
            >
              <Scan size={22} /> Escanear otro
            </button>
          </div>
        )}
      </main>
    </div>
  );
}