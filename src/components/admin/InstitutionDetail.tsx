import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { Institution } from '../../types';
import { Building, Plus, Trash2, Phone, Mail, MapPin } from 'lucide-react';

export const InstitutionsManager = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    contact_email: '',
    address: '',
    contact_phone: '' // Asegúrate que tu DB tenga este campo o ajusta el nombre
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Building className="text-blue-600"/> Directorio de Instituciones
        </h2>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={18} /> Nueva Institución
        </button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-lg border border-blue-100 mb-6 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold mb-4 text-gray-700">Registrar Entidad Externa</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              className="border p-2 rounded" placeholder="Nombre Institución (ej. Tecmilenio)" required
              value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
            />
            <input 
              className="border p-2 rounded" placeholder="Nombre de Contacto"
              value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})}
            />
            <input 
              className="border p-2 rounded" placeholder="Email de Contacto" type="email"
              value={formData.contact_email} onChange={e => setFormData({...formData, contact_email: e.target.value})}
            />
            <input 
              className="border p-2 rounded" placeholder="Teléfono"
              value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})}
            />
            <input 
              className="border p-2 rounded md:col-span-2" placeholder="Dirección Física"
              value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})}
            />
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded font-medium">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Cards */}
      {loading ? <p>Cargando...</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {institutions.map((inst) => (
            <div key={inst.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-lg text-gray-800">{inst.name}</h3>
                <button onClick={() => handleDelete(inst.id)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2"><MapPin size={14}/> {inst.address || 'Sin dirección'}</p>
                <p className="flex items-center gap-2"><Phone size={14}/> {inst.contact_name || 'Sin contacto'}</p>
                <p className="flex items-center gap-2"><Mail size={14}/> {inst.contact_email || '-'}</p>
              </div>
            </div>
          ))}
          {institutions.length === 0 && <p className="text-gray-500">No hay instituciones registradas.</p>}
        </div>
      )}
    </div>
  );
};