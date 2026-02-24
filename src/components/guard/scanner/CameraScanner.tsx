import { useRef, useEffect } from 'react';
import jsQR from 'jsqr';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { playBeep } from './playBeep';

interface CameraScannerProps {
  onCode: (code: string) => void;
  onClose: () => void;
}

/** Escáner de cámara para leer códigos QR. */
export function CameraScanner({ onCode, onClose }: CameraScannerProps) {
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
