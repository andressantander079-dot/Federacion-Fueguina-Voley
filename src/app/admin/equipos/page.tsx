// src/app/admin/equipos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import Link from 'next/link';
import { Users, Plus, Trash2, Search, ChevronRight, Shield } from 'lucide-react';

export default function EquiposPage() {
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [busqueda, setBusqueda] = useState('');

  // Formulario Nuevo Equipo
  const [form, setForm] = useState({ name: '', short_name: '', logo_url: '', coach: '' });

  useEffect(() => {
    cargarEquipos();
  }, []);

  async function cargarEquipos() {
    setLoading(true);
    const { data } = await supabase.from('teams').select('*').order('name');
    if (data) setEquipos(data);
    setLoading(false);
  }

  async function crearEquipo(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) return alert("El nombre es obligatorio");

    const { error } = await supabase.from('teams').insert([form]);

    if (!error) {
        setModalNuevo(false);
        setForm({ name: '', short_name: '', logo_url: '', coach: '' });
        cargarEquipos();
    } else {
        alert("Error: " + error.message);
    }
  }

  async function eliminarEquipo(id: string) {
    if (!confirm("⚠️ ¿Borrar este equipo?\nSe borrarán también sus jugadores.")) return;
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (!error) cargarEquipos();
    else alert("Error: Probablemente este equipo ya jugó partidos y no se puede borrar.");
  }

  // Filtrado
  const equiposFiltrados = equipos.filter(e => 
      e.name.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
              <Shield className="text-blue-600"/> Clubes y Equipos
            </h1>
            <p className="text-slate-500">Administra los planteles de cada institución.</p>
          </div>
          <button 
             onClick={() => setModalNuevo(true)}
             className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg transition"
          >
             <Plus size={20}/> Nuevo Equipo
          </button>
        </div>

        {/* BUSCADOR */}
        <div className="relative mb-6">
            <Search className="absolute left-4 top-3.5 text-slate-400" size={20}/>
            <input 
                className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition"
                placeholder="Buscar equipo..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
            />
        </div>

        {/* LISTA */}
        {loading ? <div className="text-center py-20 text-slate-400">Cargando...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {equiposFiltrados.map(eq => (
                    <div key={eq.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center overflow-hidden border">
                                {eq.logo_url ? <img src={eq.logo_url} className="w-full h-full object-cover"/> : <Shield className="text-slate-300"/>}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{eq.name}</h3>
                                <p className="text-xs text-slate-500">{eq.coach ? `DT: ${eq.coach}` : 'Sin DT asignado'}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <Link href={`/admin/equipos/${eq.id}`} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 transition flex items-center gap-1">
                                Plantel <ChevronRight size={14}/>
                             </Link>
                             <button onClick={() => eliminarEquipo(eq.id)} className="p-2 text-slate-300 hover:text-red-500 transition"><Trash2 size={18}/></button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* MODAL CREAR */}
        {modalNuevo && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                    <h2 className="text-xl font-bold mb-4">Nuevo Equipo</h2>
                    <form onSubmit={crearEquipo} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nombre del Club *</label>
                            <input className="w-full border p-2 rounded-lg" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Ej: Club Galicia"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Abreviatura (Tablero)</label>
                            <input className="w-full border p-2 rounded-lg" value={form.short_name} onChange={e => setForm({...form, short_name: e.target.value})} placeholder="Ej: GAL"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Entrenador (DT)</label>
                            <input className="w-full border p-2 rounded-lg" value={form.coach} onChange={e => setForm({...form, coach: e.target.value})} placeholder="Nombre del DT"/>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Logo URL</label>
                            <input className="w-full border p-2 rounded-lg" value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} placeholder="https://..."/>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button type="button" onClick={() => setModalNuevo(false)} className="flex-1 py-2 border rounded-lg font-bold text-slate-500">Cancelar</button>
                            <button type="submit" className="flex-1 py-2 bg-slate-900 text-white rounded-lg font-bold">Crear</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}