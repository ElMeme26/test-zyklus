import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Card, Button, Input } from '../ui/core';
import { Building2, Mail, MapPin, Plus, ArrowRight, X } from 'lucide-react';
import type { Institution } from '../../types'; // <--- CORREGIDO AQUÍ
import { InstitutionDetail } from './InstitutionDetail'; 

export function InstitutionsManager() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [newInst, setNewInst] = useState({ name: '', contact_name: '', contact_email: '', contact_phone: '', address: '' });

  useEffect(() => { fetchInstitutions(); }, []);

  const fetchInstitutions = async () => {
    const { data } = await supabase.from('institutions').select('*').order('created_at', { ascending: false });
    if (data) setInstitutions(data);
  };

  const handleCreate = async () => {
    if (!newInst.name) return;
    await supabase.from('institutions').insert([newInst]);
    setShowForm(false); setNewInst({ name: '', contact_name: '', contact_email: '', contact_phone: '', address: '' });
    fetchInstitutions();
  };

  if (view === 'detail' && selectedInst) return <InstitutionDetail institution={selectedInst} onBack={() => setView('list')} />;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Building2 className="text-cyan-500"/> Directorio</h2>
        <Button onClick={() => setShowForm(true)} className="bg-cyan-500 text-black font-bold"><Plus size={18} className="mr-2"/> Nueva</Button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <Card className="bg-slate-900 border border-slate-700 w-full max-w-lg p-6 space-y-4">
             <div className="flex justify-between"><h3 className="text-white font-bold">Registrar Institución</h3><button onClick={() => setShowForm(false)} className="text-slate-400"><X/></button></div>
             <Input placeholder="Nombre" value={newInst.name} onChange={e => setNewInst({...newInst, name: e.target.value})} />
             <div className="grid grid-cols-2 gap-4">
                <Input placeholder="Contacto" value={newInst.contact_name} onChange={e => setNewInst({...newInst, contact_name: e.target.value})} />
                <Input placeholder="Teléfono" value={newInst.contact_phone} onChange={e => setNewInst({...newInst, contact_phone: e.target.value})} />
             </div>
             <Input placeholder="Email" value={newInst.contact_email} onChange={e => setNewInst({...newInst, contact_email: e.target.value})} />
             <Input placeholder="Dirección" value={newInst.address} onChange={e => setNewInst({...newInst, address: e.target.value})} />
             <Button onClick={handleCreate} className="w-full bg-cyan-500 text-black font-bold">Guardar</Button>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {institutions.map(inst => (
          <Card key={inst.id} className="p-5 hover:border-cyan-500/50 cursor-pointer bg-slate-900/40 border-slate-800 group" onClick={() => { setSelectedInst(inst); setView('detail'); }}>
            <div className="flex justify-between items-start mb-4">
              <div className="bg-slate-800 p-3 rounded-xl group-hover:bg-cyan-900/20"><Building2 className="text-slate-400 group-hover:text-cyan-400" size={24} /></div>
              <ArrowRight className="text-slate-700 group-hover:text-cyan-500 -rotate-45 group-hover:rotate-0 transform duration-300"/>
            </div>
            <h3 className="text-lg font-bold text-white mb-2">{inst.name}</h3>
            <div className="space-y-2 text-xs text-slate-400">
              <p className="flex gap-2"><MapPin size={12}/> {inst.address}</p>
              <p className="flex gap-2"><Mail size={12}/> {inst.contact_email}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}