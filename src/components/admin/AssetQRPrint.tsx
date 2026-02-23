// src/components/admin/AssetQRPrint.tsx
import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode'; // <--- Importamos la librería nueva
import { X, Printer, Package } from 'lucide-react';
import { Button, Card } from '../ui/core';
import type { Asset, QRAssetPayload } from '../../types';

interface AssetQRPrintProps {
  assets: Asset[];
  onClose: () => void;
}

// Generamos el JSON estricto
const buildAssetQRPayload = (asset: Asset): string => {
  const payload: QRAssetPayload = {
    type: 'ASSET_PHYSICAL',
    id: asset.id,
    tag: asset.tag,
    name: asset.name,
  };
  return JSON.stringify(payload);
};

// Componente de Tarjeta que genera su propio PNG
function QRCard({ asset }: { asset: Asset }) {
  const [qrSrc, setQrSrc] = useState<string>('');

  useEffect(() => {
    // Generar PNG Base64
    QRCode.toDataURL(buildAssetQRPayload(asset), {
      width: 200,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    }).then(setQrSrc);
  }, [asset]);

  if (!qrSrc) return null;

  return (
    <div className="qr-card flex flex-col items-center p-4 border-2 border-slate-300 rounded-xl bg-white w-[200px] gap-2 break-inside-avoid">
      {/* Imagen PNG generada */}
      <img src={qrSrc} alt={`QR ${asset.tag}`} className="w-[140px] h-[140px]" />
      
      <div className="text-center w-full">
        <p className="text-slate-900 font-black text-base tracking-widest font-mono">{asset.tag}</p>
        <p className="text-slate-700 font-bold text-xs mt-0.5 line-clamp-2">{asset.name}</p>
      </div>
      
      <div className="flex items-center gap-1 mt-1 border-t border-slate-200 pt-1 w-full justify-center">
        <Package size={10} className="text-cyan-500" />
        <span className="text-[9px] text-slate-400 font-bold tracking-widest uppercase">Zyklus Halo</span>
      </div>
    </div>
  );
}

// ... El resto del componente (Modal Principal) se mantiene igual, 
// pero actualizamos la función handlePrint para usar las imágenes generadas.

export function AssetQRPrint({ assets, onClose }: AssetQRPrintProps) {
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  // Precargar todos los QRs como PNG antes de abrir el diálogo de impresión
  useEffect(() => {
    const generateAll = async () => {
      const images: Record<string, string> = {};
      for (const asset of assets) {
        images[asset.id] = await QRCode.toDataURL(buildAssetQRPayload(asset), { width: 150, margin: 1 });
      }
      setQrImages(images);
    };
    generateAll();
  }, [assets]);

  const handlePrint = () => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;

    // Inyectamos HTML limpio para impresión
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiquetas Zyklus</title>
          <style>
            body { font-family: sans-serif; background: white; margin: 0; }
            .grid { display: flex; flex-wrap: wrap; gap: 15px; padding: 20px; }
            .qr-card { 
              display: flex; flex-direction: column; align-items: center; 
              padding: 10px; border: 2px solid #000; border-radius: 8px; 
              width: 160px; page-break-inside: avoid; text-align: center;
            }
            img { width: 120px; height: 120px; display: block; }
            .tag { font-family: monospace; font-size: 14px; font-weight: 900; margin-top: 5px; }
            .name { font-size: 10px; margin-top: 2px; }
            @media print { .grid { gap: 10px; } }
          </style>
        </head>
        <body>
          <div class="grid">
            ${assets.map(a => `
              <div class="qr-card">
                <img src="${qrImages[a.id]}" />
                <div class="tag">${a.tag}</div>
                <div class="name">${a.name}</div>
              </div>
            `).join('')}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `;
    
    win.document.write(htmlContent);
    win.document.close();
  };

  return (
    // ... Tu renderizado del Modal (puedes usar <QRCard> dentro para el preview)
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
       {/* ... Contenido del modal ... */}
       <Card className="w-full max-w-3xl h-[80vh] flex flex-col">
          <div className="flex-1 overflow-auto p-4 bg-slate-100 rounded-xl grid grid-cols-2 md:grid-cols-4 gap-4">
             {assets.map(asset => <QRCard key={asset.id} asset={asset} />)}
          </div>
          <div className="p-4 border-t border-slate-800 flex justify-end gap-2">
            <Button onClick={onClose} variant="secondary">Cerrar</Button>
            <Button onClick={handlePrint}>Imprimir PNGs</Button>
          </div>
       </Card>
    </div>
  );
}