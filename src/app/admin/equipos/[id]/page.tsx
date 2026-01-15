// src/app/admin/equipos/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import Link from 'next/link';
import { ArrowLeft, UserPlus, Trash2, Users, Shirt } from 'lucide-react';

export default function DetalleEquipoPage() {
  const params = useParams();
  const id = params?.id as string;

  const [team, setTeam] = useState<any>(null);
  const [jugadores, setJugadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Formulario Jugador
  const [nuevoJugador, setNuevoJugador] = useState({ name: '', number: '', position: 'Universal' });

  useEffect(() => {
    if (id) cargarDatos();
  }, [id]);

  async function cargarDatos() {
    setLoading(true);
    // 1. Equipo
    const { data: t } = await supabase.from('teams').select('*').eq('id', id).single();
    setTeam(t);

    // 2. Jugadores
    const { data: p } = await supabase.from('players').select('*').eq('team_id', id).order('number', { ascending: true });
    if (p) setJugadores(p);
    
    setLoading(false);
  }

  async function agregarJugador(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoJugador.name || !nuevoJugador.number) return alert("Nombre y número son obligatorios");

    const { error } = await supabase.from('players').insert([{
        team_id: id,
        name: nuevoJugador.name,
        number: parseInt(nuevoJugador.number),
        position: nuevoJugador.position
    }]);

    if (!error) {
        setNuevoJugador({ name: '', number: '', position: 'Universal' });
        // Recargar solo la lista de jugadores para que sea rápido
        const { data: p } = await supabase.from('players').select('*').eq('team_id', id).order('number', { ascending: true });
        if (p) setJugadores(p);
    } else {
        alert("Error: " + error.message);
    }
  }

  async function borrarJugador(playerId: string) {
    if (!confirm("¿Eliminar jugador?")) return;
    await supabase.from('players').delete().eq('id', playerId);
    // Recargar lista
    setJugadores(jugadores.filter(j => j.id !== playerId));
  }

  if (loading) return <div className="p-10 text-center">Cargando...</div>;
  if (!team) return <div className="p-10 text-center">Equipo no encontrado.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center gap-4 mb-8">
            <Link href="/admin/equipos" className="p-2 bg-white border rounded-full hover:bg-slate-100"><ArrowLeft size={20}/></Link>
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white rounded-xl shadow-sm p-1 border">
                    {team.logo_url ? <img src={team.logo_url} className="w-full h-full object-contain"/> : <Users className="text-slate-300 w-full h-full p-2"/>}
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-800">{team.name}</h1>
                    <p className="text-slate-500 font-bold">{jugadores.length} Jugadores inscriptos</p>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* FORMULARIO DE CARGA */}
            <div className="md:col-span-1">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
                    <h2 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><UserPlus size={18}/> Alta de Jugador</h2>
                    <form onSubmit={agregarJugador} className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Dorsal (#)</label>
                            <input type="number" className="w-full border-2 border-slate-100 p-2 rounded-lg font-black text-center text-xl outline-none focus:border-indigo-500" placeholder="10" value={nuevoJugador.number} onChange={e => setNuevoJugador({...nuevoJugador, number: e.target.value})}/>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Nombre Completo</label>
                            <input className="w-full border p-2 rounded-lg font-bold outline-none focus:border-indigo-500" placeholder="Apellido y Nombre" value={nuevoJugador.name} onChange={e => setNuevoJugador({...nuevoJugador, name: e.target.value})}/>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Posición</label>
                            <select className="w-full border p-2 rounded-lg bg-white" value={nuevoJugador.position} onChange={e => setNuevoJugador({...nuevoJugador, position: e.target.value})}>
                                <option value="Universal">Universal</option>
                                <option value="Armador">Armador/a</option>
                                <option value="Punta">Punta</option>
                                <option value="Central">Central</option>
                                <option value="Opuesto">Opuesto/a</option>
                                <option value="Libero">Líbero</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                            Agregar
                        </button>
                    </form>
                </div>
            </div>

            {/* LISTA DE JUGADORES */}
            <div className="md:col-span-2">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h3 className="font-bold text-slate-700">Plantel Oficial</h3>
                        <span className="text-xs font-bold bg-white border px-2 py-1 rounded text-slate-500">Temporada 2026</span>
                    </div>
                    
                    {jugadores.length === 0 ? (
                        <div className="p-10 text-center text-slate-400">
                            <Shirt size={40} className="mx-auto mb-2 opacity-20"/>
                            <p>Aún no hay jugadores cargados.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {jugadores.map((jugador) => (
                                <div key={jugador.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition group">
                                    <div className="flex items-center gap-4">
                                        <span className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-700 font-black rounded-lg border border-indigo-100 text-lg">
                                            {jugador.number}
                                        </span>
                                        <div>
                                            <p className="font-bold text-slate-800">{jugador.name}</p>
                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{jugador.position}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => borrarJugador(jugador.id)} className="p-2 text-slate-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                        <Trash2 size={18}/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}