import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import type { Institution, Asset } from '../../types'; // <--- CORREGIDO AQUÍ
import { Button, Card, Input } from '../ui/core';
import { ChevronLeft, ShoppingCart, Clock, QrCode, Trash2, X, Plus, CheckCircle } from 'lucide-react';
import QRCode from "react-qr-code"; 
import { toast } from 'sonner';

export function InstitutionDetail({ institution, onBack }: { institution: Institution, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'status' | 'history'>('status');
  const [loans, setLoans] = useState<any[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const [cart, setCart] = useState<Asset[]>([]);
  const [duration] = useState(7);
  const [assetSearch, setAssetSearch] = useState('');
  const [lastLoanId, setLastLoanId] = useState<string | null>(null);

  useEffect(() => { fetchLoans(); fetchAssets(); }, [institution.id]);

  const fetchLoans = async () => {
    const { data } = await supabase.from('external_loans').select('*, items:external_loan_items(asset_id)').eq('institution_id', institution.id).order('created_at', { ascending: false });
    setLoans(data || []);
  };

  const fetchAssets = async () => {
    const { data } = await supabase.from('assets').select('*').eq('status', 'Operativa');
    setAvailableAssets(data || []);
  };

  const addToCart = (asset: Asset) => { if (!cart.find(a => a.id === asset.id)) setCart([...cart, asset]); };

  const finalizeLoan = async () => {
    if (cart.length === 0) return;
    try {
      const { data: loan, error } = await supabase.from('external_loans').insert({ institution_id: institution.id, status: 'PENDING', loan_duration_days: duration }).select().single();
      if (error || !loan) throw error;
      const items = cart.map(a => ({ loan_id: loan.id, asset_id: a.id }));
      await supabase.from('external_loan_items').insert(items);
      toast.success("Préstamo creado."); setLastLoanId(loan.id); setCart([]); setIsCartOpen(false); fetchLoans(); fetchAssets(); 
    } catch (e: any) { toast.error(e.message); }
  };

  const filteredAssets = availableAssets.filter(a => a.name.toLowerCase().includes(assetSearch.toLowerCase()) || a.tag.toLowerCase().includes(assetSearch.toLowerCase()));

  return (
    <div className="space-y-6 animate-in slide-in-from-right duration-300">
      <Button variant="ghost" onClick={onBack} className="mb-4 text-slate-400 hover:text-white"><ChevronLeft size={16}/> Volver</Button>
      <div className="flex justify-between items-end border-b border-slate-800 pb-6">
        <div><h1 className="text-3xl font-bold text-white">{institution.name}</h1><p className="text-slate-400 text-sm">{institution.contact_name} • {institution.contact_email}</p></div>
        <Button onClick={() => setIsCartOpen(true)} className="bg-cyan-500 text-black font-bold"><ShoppingCart className="mr-2" size={18}/> Crear Préstamo</Button>
      </div>

      {lastLoanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <Card className="bg-white p-8 text-center space-y-6 w-full max-w-sm border-none shadow-2xl relative">
            <button onClick={() => setLastLoanId(null)} className="absolute top-4 right-4 text-slate-400"><X/></button>
            <h2 className="text-2xl font-bold text-black">QR Generado</h2>
            <div className="flex justify-center p-4"><QRCode value={JSON.stringify({ id: lastLoanId })} size={180} /></div>
            <Button onClick={() => setLastLoanId(null)} className="w-full bg-black text-white">Cerrar</Button>
          </Card>
        </div>
      )}

      <div className="flex gap-6 border-b border-slate-800">
        <button onClick={() => setActiveTab('status')} className={`pb-3 text-sm font-bold border-b-2 ${activeTab === 'status' ? 'border-cyan-500 text-white' : 'border-transparent text-slate-500'}`}>Activos</button>
        <button onClick={() => setActiveTab('history')} className={`pb-3 text-sm font-bold border-b-2 ${activeTab === 'history' ? 'border-cyan-500 text-white' : 'border-transparent text-slate-500'}`}>Historial</button>
      </div>

      <div className="grid gap-3">
        {loans.filter(l => activeTab === 'status' ? (l.status !== 'RETURNED') : (l.status === 'RETURNED')).map(loan => (
          <Card key={loan.id} className="p-4 bg-slate-900/50 border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-4">
               <div className={`w-1 h-12 rounded-full ${loan.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-yellow-500'}`}></div>
               <div>
                  <div className="flex items-center gap-2 mb-1"><span className="text-xs text-slate-500 font-mono">ID: {loan.id.slice(0,8)}...</span><span className="bg-slate-800 px-2 rounded text-[10px] text-white">{loan.status}</span></div>
                  <p className="text-white text-sm font-bold flex items-center gap-2"><Clock size={14} className="text-slate-500"/> {loan.loan_duration_days} días</p>
               </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setLastLoanId(loan.id)}><QrCode size={16} className="mr-2"/> QR</Button>
          </Card>
        ))}
      </div>

      {isCartOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-950 h-full flex flex-col shadow-2xl border-l border-slate-800 p-6">
             <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold text-white">Carrito</h2><button onClick={() => setIsCartOpen(false)} className="text-white"><X/></button></div>
             <div className="flex-1 overflow-y-auto space-y-6">
                {cart.length > 0 && <div className="bg-cyan-950/20 p-4 rounded-xl border border-cyan-500/20 space-y-2">{cart.map(i => <div key={i.id} className="flex justify-between text-xs text-slate-300"><span>{i.name}</span><button onClick={() => setCart(cart.filter(c => c.id !== i.id))}><Trash2 size={12} className="text-rose-500"/></button></div>)}</div>}
                <div className="space-y-2"><Input placeholder="Buscar activos..." value={assetSearch} onChange={e => setAssetSearch(e.target.value)} className="bg-slate-900"/>{filteredAssets.slice(0, 10).map(a => <div key={a.id} className="flex justify-between items-center p-3 bg-slate-900 border border-slate-800 rounded"><span className="text-xs text-white truncate w-40">{a.name}</span><Button size="sm" onClick={() => addToCart(a)} disabled={cart.some(c => c.id === a.id)}>{cart.some(c => c.id === a.id) ? <CheckCircle size={14}/> : <Plus size={14}/>}</Button></div>)}</div>
             </div>
             <Button onClick={finalizeLoan} disabled={cart.length === 0} className="w-full bg-cyan-500 text-black font-bold h-12 mt-4">Generar Préstamo</Button>
          </div>
        </div>
      )}
    </div>
  );
}