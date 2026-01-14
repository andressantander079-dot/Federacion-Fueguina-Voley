// src/app/admin/equipos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Users, 
  Plus, 
  Trash2, 
  UserPlus, 
  Shirt, 
  X, 
  Edit3, 
  Save, 
  Phone, 
  User,
  Instagram,
  Image as ImageIcon
} from 'lucide-react';

export default function EquiposPage() {
  // --- ESTADOS ---
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoEquipo, setNuevoEquipo] = useState('');

  // --- ESTADOS DE EDICIÓN ---
  const [editingId, setEditingId] = useState<string | null>(null);
  // Guardamos los datos temporales de la edición
  const [editData, setEditData] = useState({
    name: '',
    logo_url: '',
    coach_name: '',
    contact_phone: '',
    social_instagram: ''
  });

  // --- ESTADOS MODAL JUGADORES ---
  const [equipoSeleccionado, setEquipoSeleccionado] = useState<any | null>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [nuevoJugadorNombre, setNuevoJugadorNombre] = useState('');
  const [nuevoJugadorNumero, setNuevoJugadorNumero] = useState('');
  const [cargandoJugadores, setCargandoJugadores] = useState(false);

  // --- CARGA INICIAL ---
  useEffect(() => {
    cargarEquipos();
  }, []);

  async function cargarEquipos() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setEquipos(data || []);
    } catch (error) {
      console.error('Error cargando equipos:', error);
    } finally {
      setLoading(false);
    }
  }

  // --- CREAR EQUIPO ---
  async function crearEquipo(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoEquipo.trim()) return;

    const { data, error } = await supabase
      .from('teams')
      .insert([{ name: nuevoEquipo }])
      .select();

    if (!error && data) {
      setEquipos([...equipos, data[0]]);
      setNuevoEquipo('');
    } else {
      alert('Error al crear equipo');
    }
  }

  // --- FUNCIONES DE EDICIÓN ---
  function iniciarEdicion(equipo: any) {
    setEditingId(equipo.id);
    setEditData({
      name: equipo.name,
      logo_url: equipo.logo_url || '',
      coach_name: equipo.coach_name || '',
      contact_phone: equipo.contact_phone || '',
      social_instagram: equipo.social_instagram || ''
    });
  }

  function cancelarEdicion() {
    setEditingId(null);
    setEditData({ name: '', logo_url: '', coach_name: '', contact_phone: '', social_instagram: '' });
  }

  async function guardarEdicion(id: string) {
    const { error } = await supabase
      .from('teams')
      .update({ 
        name: editData.name,
        logo_url: editData.logo_url,
        coach_name: editData.coach_name,
        contact_phone: editData.contact_phone,
        social_instagram: editData.social_instagram
      })
      .eq('id', id);

    if (!error) {
      setEquipos(equipos.map(eq => 
        eq.id === id ? { ...eq, ...editData } : eq
      ));
      cancelarEdicion();
    } else {
      alert('Error al guardar cambios');
    }
  }

  // --- BORRAR EQUIPO ---
  async function borrarEquipo(id: string) {
    if (!confirm('¿Seguro? Se borrarán también todos sus jugadores.')) return;
    await supabase.from('players').delete().eq('team_id', id);
    const { error } = await supabase.from('teams').delete().eq('id', id);
    if (!error) {
      setEquipos(equipos.filter((t) => t.id !== id));
    }
  }

  // --- GESTIÓN JUGADORES ---
  async function abrirModalJugadores(equipo: any) {
    setEquipoSeleccionado(equipo);
    setCargandoJugadores(true);
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', equipo.id)
      .order('number', { ascending: true });
    
    setJugadores(data || []);
    setCargandoJugadores(false);
  }

  function cerrarModal() {
    setEquipoSeleccionado(null);
    setJugadores([]);
    setNuevoJugadorNombre('');
    setNuevoJugadorNumero('');
  }

  async function agregarJugador(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoJugadorNombre.trim() || !equipoSeleccionado) return;
    const { data, error } = await supabase
      .from('players')
      .insert([{ 
        name: nuevoJugadorNombre, 
        number: parseInt(nuevoJugadorNumero) || 0,
        team_id: equipoSeleccionado.id 
      }])
      .select();
    if (!error && data) {
      const nuevaLista = [...jugadores, data[0]].sort((a, b) => a.number - b.number);
      setJugadores(nuevaLista);
      setNuevoJugadorNombre('');
      setNuevoJugadorNumero('');
    }
  }

  async function borrarJugador(id: string) {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (!error) {
      setJugadores(jugadores.filter(j => j.id !== id));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-2">
              <Users className="text-blue-600" /> Equipos y Planteles
            </h1>
            <p className="text-slate-500 mt-1">Administra clubes, escudos y delegados.</p>
          </div>
          
          <form onSubmit={crearEquipo} className="flex gap-2 w-full md:w-auto">
            <input 
              type="text" 
              placeholder="Nombre del nuevo equipo..." 
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
              value={nuevoEquipo}
              onChange={(e) => setNuevoEquipo(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition">
              <Plus size={20} /> <span className="hidden sm:inline">Crear</span>
            </button>
          </form>
        </div>

        {/* LISTA DE EQUIPOS */}
        {loading ? (
          <div className="text-center py-10">Cargando equipos...</div>
        ) : equipos.length === 0 ? (
          <div className="bg-white p-10 rounded-xl border border-dashed border-slate-300 text-center text-slate-400">
            No hay equipos creados todavía.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {equipos.map((equipo) => (
              <div key={equipo.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition group relative overflow-hidden flex flex-col justify-between">
                
                {/* --- MODO EDICIÓN --- */}
                {editingId === equipo.id ? (
                  <div className="space-y-3 relative z-10 bg-white h-full flex flex-col">
                    <div className="flex justify-between items-center mb-2 border-b pb-2">
                      <span className="text-xs font-bold text-blue-600 uppercase">Editando...</span>
                      <div className="flex gap-1">
                        <button onClick={() => guardarEdicion(equipo.id)} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Guardar"><Save size={16} /></button>
                        <button onClick={cancelarEdicion} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Cancelar"><X size={16} /></button>
                      </div>
                    </div>
                    
                    {/* Campos de Edición */}
                    <div className="space-y-2 flex-1">
                      <input 
                        className="w-full text-sm p-2 border rounded focus:border-blue-500 outline-none font-bold" 
                        placeholder="Nombre del Equipo"
                        value={editData.name} 
                        onChange={e => setEditData({...editData, name: e.target.value})} 
                      />
                      <div className="flex items-center gap-2">
                         <ImageIcon size={16} className="text-slate-400" />
                         <input 
                          className="w-full text-xs p-2 border rounded focus:border-blue-500 outline-none" 
                          placeholder="Link URL del Escudo"
                          value={editData.logo_url} 
                          onChange={e => setEditData({...editData, logo_url: e.target.value})} 
                         />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-slate-400" />
                          <input 
                            className="w-full text-xs p-2 border rounded focus:border-blue-500 outline-none" 
                            placeholder="DT / Delegado" 
                            value={editData.coach_name} 
                            onChange={e => setEditData({...editData, coach_name: e.target.value})} 
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone size={16} className="text-slate-400" />
                          <input 
                            className="w-full text-xs p-2 border rounded focus:border-blue-500 outline-none" 
                            placeholder="Teléfono" 
                            value={editData.contact_phone} 
                            onChange={e => setEditData({...editData, contact_phone: e.target.value})} 
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <Instagram size={16} className="text-slate-400" />
                         <input 
                          className="w-full text-xs p-2 border rounded focus:border-blue-500 outline-none" 
                          placeholder="Usuario Instagram (ej: clubvoley)"
                          value={editData.social_instagram} 
                          onChange={e => setEditData({...editData, social_instagram: e.target.value})} 
                         />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* --- VISTA NORMAL --- */
                  <>
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                          {/* ESCUDO (Imagen o Inicial) */}
                          {equipo.logo_url ? (
                            <img src={equipo.logo_url} alt="Logo" className="w-14 h-14 rounded-full object-cover border border-slate-100 shrink-0 bg-slate-50" />
                          ) : (
                            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-xl border border-blue-100 shrink-0">
                              {equipo.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-800 text-lg leading-tight truncate" title={equipo.name}>{equipo.name}</h3>
                            <div className="flex flex-col gap-0.5 mt-1">
                              {/* DATOS DT */}
                              {equipo.coach_name ? (
                                <p className="text-xs text-slate-500 flex items-center gap-1 truncate"><User size={10} /> {equipo.coach_name}</p>
                              ) : (
                                <p className="text-[10px] text-slate-300 italic">Sin DT asignado</p>
                              )}
                              
                              {/* RED SOCIAL */}
                              {equipo.social_instagram && (
                                <a 
                                  href={`https://instagram.com/${equipo.social_instagram.replace('@','')}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-xs text-pink-600 flex items-center gap-1 hover:underline truncate"
                                >
                                  <Instagram size={10} /> @{equipo.social_instagram.replace('@','')}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botones de Acción */}
                        <div className="flex gap-1 shrink-0">
                          <button 
                            onClick={() => iniciarEdicion(equipo)}
                            className="text-slate-300 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition"
                            title="Editar información"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button 
                            onClick={() => borrarEquipo(equipo.id)}
                            className="text-slate-300 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition"
                            title="Borrar equipo"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Botón Gestionar Jugadores */}
                    <button 
                      onClick={() => abrirModalJugadores(equipo)}
                      className="w-full mt-2 bg-slate-50 hover:bg-blue-600 hover:text-white text-slate-600 font-bold py-2 px-4 rounded-lg border border-slate-200 hover:border-blue-600 transition flex items-center justify-center gap-2 text-sm"
                    >
                      <Shirt size={16} /> Ver Plantel
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ================= MODAL DE JUGADORES ================= */}
      {equipoSeleccionado && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 p-6 flex justify-between items-center text-white">
              <div className="flex items-center gap-3">
                 {/* Mini Logo en el modal */}
                 {equipoSeleccionado.logo_url && <img src={equipoSeleccionado.logo_url} className="w-10 h-10 rounded-full bg-white p-0.5 object-cover" />}
                 <div>
                    <h2 className="text-xl font-black">{equipoSeleccionado.name}</h2>
                    <p className="text-slate-400 text-sm">Lista de Buena Fe</p>
                 </div>
              </div>
              <button onClick={cerrarModal} className="text-slate-400 hover:text-white transition"><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              <form onSubmit={agregarJugador} className="flex gap-2 mb-6 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="w-20">
                    <input type="number" placeholder="#" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold focus:outline-blue-500" value={nuevoJugadorNumero} onChange={e => setNuevoJugadorNumero(e.target.value)} />
                </div>
                <div className="flex-1">
                    <input type="text" placeholder="Nombre del jugador" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-blue-500" value={nuevoJugadorNombre} onChange={e => setNuevoJugadorNombre(e.target.value)} />
                </div>
                <button type="submit" className="bg-emerald-500 hover:bg-emerald-600 text-white p-2 rounded-lg transition"><UserPlus size={20} /></button>
              </form>

              {cargandoJugadores ? (
                <div className="text-center py-10 text-slate-400">Cargando plantel...</div>
              ) : jugadores.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm"><Shirt size={40} className="mx-auto mb-2 opacity-20" />No hay jugadores cargados.</div>
              ) : (
                <div className="space-y-2">
                  {jugadores.map((jugador) => (
                    <div key={jugador.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200 shadow-sm group hover:border-blue-200 transition">
                      <div className="flex items-center gap-3">
                        <span className="font-black text-slate-400 text-lg w-8 text-center bg-slate-100 rounded py-1">{jugador.number}</span>
                        <span className="font-bold text-slate-700">{jugador.name}</span>
                      </div>
                      <button onClick={() => borrarJugador(jugador.id)} className="text-slate-300 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="bg-slate-100 p-3 text-center text-xs text-slate-400 border-t border-slate-200">
               Total: {jugadores.length} jugadores registrados
            </div>
          </div>
        </div>
      )}
    </div>
  );
}