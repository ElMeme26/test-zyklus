import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import type { Institution } from '../../types'; // Import type
import { Building, Plus, Trash2, Phone, Mail, MapPin, ExternalLink } from 'lucide-react';
import { InstitutionDetail } from './InstitutionDetail'; // Ahora sí coincidirá

export const InstitutionsManager = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedInst, setSelectedInst] = useState<Institution | null>(null);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    contact_email: '',
    address: '',
    contact_phone: ''
  });

  const fetchInstitutions = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('institutions').select('*').order('id', { ascending: false });
    if (!error && data) setInstitutions(data as Institution[]);
    setLoading(false);
  };

  useEffect(() => { fetchInstitutions(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('institutions').insert([formData]);
    if (error) {
      alert('Error al crear: ' + error.message);
    } else {
      setShowForm(false);
      setFormData({ name: '', contact_name: '', contact_email: '', address: '', contact_phone: '' });
      fetchInstitutions();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar institución?')) return;
    await supabase.from('institutions').delete().eq('id', id);
    fetchInstitutions();
  };

  // Si hay una institución seleccionada, mostramos el detalle
  if (selectedInst) {
    return <InstitutionDetail institution={selectedInst} onBack={() => setSelectedInst(null)} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building className="text-blue-500"/> Directorio de Instituciones
        </h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-transform active:scale-95"
        >
          <Plus size={18} /> Nueva Institución
        </button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <div className="bg-slate-900 p-6 rounded-lg shadow-lg border border-slate-700 mb-6 animate-in slide-in-from-top-4">
          <h3 className="font-bold mb-4 text-slate-200">Registrar Entidad Externa</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              className="bg-slate-950 border border-slate-700 p-2 rounded text-white" placeholder="Nombre Institución (ej. Tecmilenio)" required
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <input 
              className="bg-slate-950 border border-slate-700 p-2 rounded text-white" placeholder="Nombre de Contacto"
              value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})}
            />
            <input 
              className="bg-slate-950 border border-slate-700 p-2 rounded text-white" placeholder="Email de Contacto" type="email"
              value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})}
            />
            <input 
              className="bg-slate-950 border border-slate-700 p-2 rounded text-white" placeholder="Teléfono"
              value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})}
            />
            <input 
              className="bg-slate-950 border border-slate-700 p-2 rounded md:col-span-2 text-white" placeholder="Dirección Física"
              value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
            />
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-400 hover:text-white">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-500">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Cards */}
      {loading ? <p className="text-slate-400">Cargando...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutions.map((inst) => (
            <div key={inst.id} className="bg-slate-900 p-5 rounded-xl border border-slate-800 hover:border-blue-500/50 transition-all hover:shadow-lg group">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors">{inst.name}</h3>
                <div className="flex gap-2">
                    <button onClick={() => setSelectedInst(inst)} className="text-slate-500 hover:text-blue-400" title="Ver Detalle">
                        <ExternalLink size={16} />
                    </button>
                    <button onClick={() => handleDelete(inst.id)} className="text-slate-500 hover:text-red-500" title="Eliminar">
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>
              <div className="space-y-2 text-sm text-slate-400">
                <p className="flex items-center gap-2"><MapPin size={14}/> {inst.address || 'Sin dirección'}</p>
                <p className="flex items-center gap-2"><Phone size={14}/> {inst.contact_phone || 'Sin contacto'}</p>
                <p className="flex items-center gap-2"><Mail size={14}/> {inst.contact_email || '-'}</p>
              </div>
            </div>
          ))}
          {institutions.length === 0 && <p className="text-slate-500 text-center py-10 col-span-3">No hay instituciones registradas.</p>}
        </div>
      )}
    </div>
  );
};