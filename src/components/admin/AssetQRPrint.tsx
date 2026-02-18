import React, { useRef } from 'react';
import QRCode from 'react-qr-code';
import { X, Printer, Package } from 'lucide-react';
import { Button, Card } from '../ui/core';
import type { Asset } from '../../types';

interface AssetQRPrintProps {
  assets: Asset[];
  onClose: () => void;
}

// ─── Payload que se incrustará en cada QR físico ─────────────
// El guardia escaneará esto en el Paso 2 del checkout
const buildAssetQRPayload = (asset: Asset): string => {
  return JSON.stringify({
    id: asset.id,
    tag: asset.tag,
    name: asset.name,
    type: 'ASSET_PHYSICAL', // ← distingue este QR del QR de solicitud
  });
};

// ─── Tarjeta individual para imprimir ────────────────────────
function QRCard({ asset }: { asset: Asset }) {
  const payload = buildAssetQRPayload(asset);
  return (
    <div className="qr-card flex flex-col items-center p-4 border-2 border-slate-300 rounded-xl bg-white w-[200px] gap-2 break-inside-avoid">
      {/* QR Code */}
      <div className="bg-white p-2 rounded-lg border border-slate-200">
        <QRCode value={payload} size={140} />
      </div>

      {/* Info del activo */}
      <div className="text-center w-full">
        <p className="text-slate-900 font-black text-base tracking-widest font-mono">
          {asset.tag}
        </p>
        <p className="text-slate-700 font-bold text-xs mt-0.5 leading-tight line-clamp-2">
          {asset.name}
        </p>
        {asset.category && (
          <p className="text-slate-400 text-[10px] mt-0.5 uppercase tracking-wider">
            {asset.category}
          </p>
        )}
        {asset.serial && (
          <p className="text-slate-400 text-[9px] font-mono mt-0.5">
            S/N: {asset.serial}
          </p>
        )}
      </div>

      {/* Logo / Marca del sistema */}
      <div className="flex items-center gap-1 mt-1 border-t border-slate-200 pt-1 w-full justify-center">
        <Package size={10} className="text-cyan-500" />
        <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">
          Zyklus Halo
        </span>
      </div>
    </div>
  );
}

// ─── Modal Principal ─────────────────────────────────────────
export function AssetQRPrint({ assets, onClose }: AssetQRPrintProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    // Abrimos una ventana limpia para imprimir solo las tarjetas
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Activos — Zyklus Halo</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: sans-serif; background: white; }
            .grid {
              display: flex;
              flex-wrap: wrap;
              gap: 16px;
              padding: 20px;
            }
            .qr-card {
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 12px;
              border: 2px solid #cbd5e1;
              border-radius: 12px;
              width: 180px;
              gap: 8px;
              break-inside: avoid;
              page-break-inside: avoid;
            }
            .qr-card img, .qr-card svg { width: 130px; height: 130px; }
            .tag { font-family: monospace; font-size: 14px; font-weight: 900; color: #0f172a; letter-spacing: 2px; }
            .name { font-size: 11px; font-weight: 700; color: #334155; text-align: center; margin-top: 2px; }
            .cat  { font-size: 9px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
            .serial { font-family: monospace; font-size: 8px; color: #94a3b8; margin-top: 2px; }
            .footer { font-size: 8px; color: #94a3b8; text-transform: uppercase; letter-spacing: 2px; border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px; width: 100%; text-align: center; }
            @media print {
              body { margin: 0; }
              .grid { padding: 10px; gap: 12px; }
            }
          </style>
        </head>
        <body>
          <div class="grid">
            ${assets.map(a => {
              const payload = buildAssetQRPayload(a);
              // Generamos el SVG del QR via react-qr-code no está disponible en HTML puro,
              // así que usamos una URL de API de QR pública como fallback para la ventana de impresión
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(payload)}`;
              return `
                <div class="qr-card">
                  <img src="${qrUrl}" alt="QR ${a.tag}" />
                  <p class="tag">${a.tag}</p>
                  <p class="name">${a.name}</p>
                  ${a.category ? `<p class="cat">${a.category}</p>` : ''}
                  ${a.serial ? `<p class="serial">S/N: ${a.serial}</p>` : ''}
                  <p class="footer">⚡ Zyklus Halo</p>
                </div>
              `;
            }).join('')}
          </div>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in">
      <Card className="w-full max-w-3xl border-primary/30 max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Printer size={20} className="text-primary" />
              Imprimir QR de Activos
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">
              {assets.length} {assets.length === 1 ? 'activo seleccionado' : 'activos seleccionados'} — Pega estas etiquetas en cada equipo
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Instrucciones */}
        <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-3 mb-4 flex-shrink-0">
          <p className="text-xs text-cyan-300 font-bold mb-1">📋 ¿Cómo funciona la doble verificación?</p>
          <ol className="text-xs text-slate-400 space-y-0.5 list-decimal list-inside">
            <li>El usuario genera su QR de solicitud (desde "Mis Préstamos")</li>
            <li>El guardia escanea el QR de solicitud → verifica que esté aprobado</li>
            <li>El guardia escanea el QR físico pegado en el activo → verifica que sea el correcto</li>
            <li>Si ambos hacen match → salida autorizada ✅</li>
          </ol>
        </div>

        {/* Preview de tarjetas */}
        <div
          ref={printRef}
          className="flex-1 overflow-y-auto"
        >
          <div className="flex flex-wrap gap-4 p-2 justify-center">
            {assets.map(asset => (
              <QRCard key={asset.id} asset={asset} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-800 flex-shrink-0">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer size={16} /> Imprimir / Guardar PDF
          </Button>
        </div>
      </Card>
    </div>
  );
}