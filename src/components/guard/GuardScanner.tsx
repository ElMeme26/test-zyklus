// src/components/guard/GuardScanner.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useData, type ComboCheckinState } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../ui/core';
import {
  ScanLine, LogOut, Check, X, AlertTriangle, Package,
  CheckCircle2, Loader2, Scan, RefreshCcw,
  ChevronRight, QrCode, User as UserIcon
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
  | 'signing'
  | 'combo_checkin'
  | 'damage_check'
  | 'done';

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

    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current && active) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          requestAnimationFrame(scan);
        }
      } catch (err) {
        console.error('Camera error:', err);
        toast.error('No se pudo acceder a la cámara. Verifica los permisos.');
        onClose();
      }
    };

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
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        hasScanned.current = true;
        // Stop tracks
        streamRef.current?.getTracks().forEach(t => t.stop());
        onCode(code.data);
        return;
      }

      rafRef.current = requestAnimationFrame(scan);
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
        <button onClick={onClose} className="text-white p-2 rounded-xl bg-white/10">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Dark overlay with cutout */}
          <div className="absolute inset-0 bg-black/50" style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, calc(50% - 110px) calc(50% - 110px), calc(50% - 110px) calc(50% + 110px), calc(50% + 110px) calc(50% + 110px), calc(50% + 110px) calc(50% - 110px), calc(50% - 110px) calc(50% - 110px))'
          }} />
          <div className="relative w-56 h-56">
            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-primary rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-primary rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-primary rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-primary rounded-br-xl" />
            {/* Animated scan line */}
            <div
              className="absolute left-2 right-2 h-0.5 bg-primary/80 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
              style={{
                animation: 'scanLine 2s linear infinite',
                top: '0%',
              }}
            />
          </div>
        </div>
      </div>

      <div className="px-4 py-4 bg-black/80 text-center">
        <p className="text-slate-400 text-xs">Apunta la cámara al código QR del activo o solicitud</p>
      </div>

      <style>{`
        @keyframes scanLine {
          0% { transform: translateY(0); }
          50% { transform: translateY(220px); }
          100% { transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    APPROVED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    ACTIVE:   'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    OVERDUE:  'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };
  return (
    <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${map[status] || 'text-slate-400 bg-slate-800 border-slate-700'}`}>
      {status}
    </span>
  );
}

export function GuardScanner() {
  const { processGuardScan, confirmComboCheckin } = useData();
  const { user, logout } = useAuth();

  const [mode, setMode] = useState<ScanMode>('CHECKOUT');
  const [step, setStep] = useState<Step>('idle');
  const [scanning, setScanning] = useState(false);

  const [verifiedData, setVerifiedData] = useState<Record<string, unknown>[] | null>(null);
  const [rawQR, setRawQR] = useState('');
  const sigRef = useRef<SignatureCanvas>(null);

  const [comboState, setComboState] = useState<ComboCheckinState | null>(null);
  const [isDamaged, setIsDamaged] = useState(false);
  const [damageNotes, setDamageNotes] = useState('');

  const reset = useCallback(() => {
    setStep('idle');
    setScanning(false);
    setVerifiedData(null);
    setRawQR('');
    setComboState(null);
    setIsDamaged(false);
    setDamageNotes('');
    sigRef.current?.clear();
  }, []);

  // ─── QR CODE HANDLER ────────────────────────────────────────
  const handleQR = useCallback(async (code: string) => {
    setScanning(false);
    setStep('verifying');
    setRawQR(code);

    const result = await processGuardScan(code, mode);

    if (!result.success && !result.comboState) {
      toast.error(result.message);
      setStep('idle');
      return;
    }

    if (mode === 'CHECKOUT') {
      setVerifiedData(result.data as Record<string, unknown>[]);
      setStep('verifying');
    } else {
      if (result.comboState) {
        setComboState(result.comboState);
        setStep('combo_checkin');
        toast.success('Primer activo del combo escaneado ✓');
      } else {
        setStep('damage_check');
      }
    }
  }, [mode, processGuardScan]);

  // ─── COMBO: scan next asset ──────────────────────────────────
  const handleNextComboScan = useCallback(async (code: string) => {
    if (!comboState) return;
    setScanning(false);

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

    if (newPending.length === 0) {
      setStep('damage_check');
    }
  }, [comboState]);

  // ─── CHECKOUT CONFIRM ────────────────────────────────────────
  const handleCheckoutConfirm = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) { toast.error('Firma digital requerida'); return; }
    const sig = sigRef.current.toDataURL();
    const result = await processGuardScan(rawQR, 'CHECKOUT', sig);
    if (result.success) { toast.success(result.message); setStep('done'); }
    else toast.error(result.message);
  };

  // ─── CHECKIN CONFIRM ─────────────────────────────────────────
  const handleCheckinConfirm = async () => {
    if (isDamaged && !damageNotes.trim()) { toast.error('Describe el daño'); return; }
    let result;
    if (comboState) {
      result = await confirmComboCheckin(comboState, isDamaged, damageNotes);
    } else {
      result = await processGuardScan(rawQR, 'CHECKIN', '', isDamaged, damageNotes);
    }
    if (result.success) { setStep('done'); }
    else toast.error(result.message);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {scanning && (
        <CameraScanner
          onCode={step === 'combo_checkin' ? handleNextComboScan : handleQR}
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

        {/* ── CHECKOUT: show info before signing */}
        {step === 'verifying' && verifiedData && mode === 'CHECKOUT' && (
          <div className="space-y-4">
            <Card className="border-emerald-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-white font-bold">{verifiedData.length > 1 ? `Combo (${verifiedData.length} activos)` : 'Solicitud Verificada'}</h2>
                  <p className="text-emerald-400 text-xs font-bold">Listo para salida</p>
                </div>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto">
                {verifiedData.map((req, i) => {
                  const r = req as { id: number; requester_name?: string; assets?: { name?: string; tag?: string }; expected_return_date?: string; status?: string };
                  return (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                      <div>
                        <p className="text-white text-sm font-bold">{r.assets?.name || `Activo #${r.id}`}</p>
                        <p className="text-slate-500 text-xs font-mono">{r.assets?.tag}</p>
                      </div>
                      <StatusPill status={r.status || 'APPROVED'} />
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 flex items-center gap-2 text-slate-400 text-xs">
                <UserIcon size={12} />
                <span>{(verifiedData[0] as { requester_name?: string })?.requester_name || 'Solicitante'}</span>
              </div>

              {verifiedData[0] && (verifiedData[0] as { expected_return_date?: string }).expected_return_date && (
                <div className="mt-2 text-xs text-slate-500">
                  Retorno: {format(new Date((verifiedData[0] as { expected_return_date: string }).expected_return_date), "d MMM yyyy", { locale: es })}
                </div>
              )}
            </Card>

            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 py-3 rounded-xl border border-slate-700 text-slate-400 text-sm font-bold">Cancelar</button>
              <button onClick={() => setStep('signing')} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold flex items-center justify-center gap-2">
                Firmar <ChevronRight size={16} />
              </button>
            </div>
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
                <button
                  onClick={() => setIsDamaged(false)}
                  className={`py-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${!isDamaged ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/50'}`}
                >
                  <Check size={28} className={!isDamaged ? 'text-emerald-400' : 'text-slate-600'} />
                  <span className={`text-sm font-black ${!isDamaged ? 'text-emerald-400' : 'text-slate-500'}`}>Sin Daños</span>
                </button>
                <button
                  onClick={() => setIsDamaged(true)}
                  className={`py-5 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${isDamaged ? 'border-rose-500 bg-rose-500/10' : 'border-slate-700 bg-slate-900/50'}`}
                >
                  <AlertTriangle size={28} className={isDamaged ? 'text-rose-400' : 'text-slate-600'} />
                  <span className={`text-sm font-black ${isDamaged ? 'text-rose-400' : 'text-slate-500'}`}>Con Daños</span>
                </button>
              </div>

              {isDamaged && (
                <div className="mt-4 animate-in slide-in-from-top-2">
                  <label className="text-xs font-bold text-rose-400 uppercase tracking-wider block mb-2">Describe el daño</label>
                  <textarea
                    value={damageNotes}
                    onChange={e => setDamageNotes(e.target.value)}
                    placeholder="Ej: Pantalla rayada, faltó cable de alimentación..."
                    className="w-full h-24 bg-slate-950 border border-rose-500/30 rounded-xl px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                  />
                </div>
              )}
            </Card>

            <button
              onClick={handleCheckinConfirm}
              disabled={isDamaged && !damageNotes.trim()}
              className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-black shadow-lg shadow-primary/30"
            >
              <CheckCircle2 size={20} />
              {isDamaged ? 'Confirmar Entrada con Daño' : 'Confirmar Entrada'}
            </button>
            <button onClick={reset} className="w-full text-xs text-slate-600 py-1">Cancelar</button>
          </div>
        )}

        {/* ── DONE */}
        {step === 'done' && (
          <div className="text-center py-10 space-y-4">
            <div className="w-24 h-24 rounded-3xl mx-auto flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.2)]">
              <CheckCircle2 size={48} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="text-white font-black text-2xl">¡Listo!</h2>
              <p className="text-slate-400 text-sm mt-1">
                {mode === 'CHECKOUT' ? 'Salida registrada correctamente' : 'Devolución registrada correctamente'}
              </p>
            </div>
            <button
              onClick={reset}
              className="mx-auto flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 border border-primary/30 text-primary font-bold text-sm hover:bg-primary/20 transition-colors"
            >
              <Scan size={16} /> Escanear otro
            </button>
          </div>
        )}
      </main>
    </div>
  );
}