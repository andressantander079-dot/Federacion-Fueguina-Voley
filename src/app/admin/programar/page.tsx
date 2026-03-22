// src/app/admin/programar/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Save, Loader2, AlertTriangle, Lock, User } from 'lucide-react';

function ProgramarForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reprogramarId = searchParams.get('reprogramar');

  const [loading, setLoading] = useState(false);

  // Listas de datos
  const [equipos, setEquipos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [arbitros, setArbitros] = useState<any[]>([]);

  // Nombres para mostrar (modo sólo lectura)
  const [categoriaName, setCategoriaName] = useState('');
  const [localName, setLocalName] = useState('');
  const [visitaName, setVisitaName] = useState('');

  // Formulario
  const [form, setForm] = useState({
    fecha: '',
    hora: '',
    categoria: '',
    local: '',
    visita: '',
    cancha: 'Gimnasio Petrina',
    arbitro: ''
  });

  // 1. Cargar datos al iniciar
  useEffect(() => {
    async function cargarDatos() {
      try {
        // Cargar Categorías
        const { data: dCats } = await supabase.from('categories').select('*').order('name');
        if (dCats) setCategorias(dCats);

        // Cargamos TODOS los equipos
        const { data: dTeams } = await supabase.from('teams').select('*').order('name');
        if (dTeams) setEquipos(dTeams);

        // Cargar Árbitros habilitados (con first_name + last_name)
        const { data: dRefs } = await supabase
          .from('referees')
          .select('id, first_name, last_name, category')
          .eq('status', 'activo')
          .order('first_name');
        if (dRefs) setArbitros(dRefs);

        // Si es REPROGRAMAR, cargamos el partido
        if (reprogramarId) {
          const { data: dMatch } = await supabase
            .from('matches')
            .select(`
              *,
              home_team:teams!home_team_id(name),
              away_team:teams!away_team_id(name),
              category:categories(name)
            `)
            .eq('id', reprogramarId)
            .single();

          if (dMatch) {
            // Extraer nombre legible de joins
            const catArr = Array.isArray(dMatch.category) ? dMatch.category : [dMatch.category];
            const homeArr = Array.isArray(dMatch.home_team) ? dMatch.home_team : [dMatch.home_team];
            const awayArr = Array.isArray(dMatch.away_team) ? dMatch.away_team : [dMatch.away_team];
            
            setCategoriaName(catArr[0]?.name || '');
            setLocalName(homeArr[0]?.name || '');
            setVisitaName(awayArr[0]?.name || '');

            // Árbitro actual (si existe en el campo referee_id del partido)
            const currentRefId = (dMatch as any).referee_id || '';

            setForm({
              fecha: dMatch.scheduled_time.split('T')[0],
              hora: dMatch.scheduled_time.split('T')[1]?.substring(0, 5) || '',
              categoria: dMatch.category_id,
              local: dMatch.home_team_id,
              visita: dMatch.away_team_id,
              cancha: dMatch.court_name || 'Gimnasio Petrina',
              arbitro: currentRefId
            });
          }
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      }
    }
    cargarDatos();
  }, [reprogramarId]);

  // 2. Guardar el partido
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const fechaHora = `${form.fecha}T${form.hora}:00`;

    if (reprogramarId) {
      // REPROGRAMAR: Un solo UPDATE con todo lo necesario
      const updatePayload: any = {
        court_name: form.cancha,
        scheduled_time: fechaHora,
        status: 'programado'
      };
      if (form.arbitro) {
        updatePayload.referee_id = form.arbitro;
      }

      const { error } = await supabase.from('matches')
        .update(updatePayload)
        .eq('id', reprogramarId);

      if (error) {
        alert('Error al reprogramar: ' + error.message);
        setLoading(false);
        return;
      }

      // También actualizar match_officials si se seleccionó árbitro
      // Buscar el user_id del árbitro seleccionado
      if (form.arbitro) {
        const refData = arbitros.find(r => r.id === form.arbitro);
        if (refData?.user_id) {
          // Eliminar asignación anterior de primer árbitro y crear nueva
          await supabase.from('match_officials').delete()
            .eq('match_id', reprogramarId)
            .in('role', ['primer_arbitro', '1st_referee']);
          await supabase.from('match_officials').insert({
            match_id: reprogramarId,
            user_id: refData.user_id,
            role: '1st_referee',
            status: 'assigned'
          });
        }
      }

      alert('¡Partido reprogramado con éxito! 🏐');
      router.push('/admin');
    } else {
      // CREAR INSERT
      const { data: newMatch, error } = await supabase.from('matches').insert({
        category_id: form.categoria,
        home_team_id: form.local,
        away_team_id: form.visita,
        court_name: form.cancha,
        scheduled_time: fechaHora,
        status: 'programado'
      }).select().single();

      if (error) {
        alert('Error al guardar: ' + error.message);
        setLoading(false);
        return;
      }

      if (newMatch && form.arbitro) {
        await supabase.from('matches').update({ referee_id: form.arbitro }).eq('id', newMatch.id);
      }

      alert('¡Partido programado con éxito! 🏐');
      router.push('/admin');
    }
  };

  // --- LÓGICA DE FILTRADO ---
  const equiposFiltrados = form.categoria
    ? equipos.filter(equipo => equipo.category_id === form.categoria)
    : [];

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-2xl mx-auto">

        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-white mb-6 transition font-medium text-sm"
        >
          <ChevronLeft className="w-4 h-4" /> Volver al Panel
        </button>

        <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
          {/* Header */}
          <div className={`p-6 ${reprogramarId
            ? 'bg-gradient-to-r from-orange-700 to-orange-600'
            : 'bg-gradient-to-r from-blue-800 to-blue-700'
            } flex justify-between items-center`}>
            <div>
              <h1 className="font-black text-xl text-white">
                {reprogramarId ? '🔁 Reprogramar Partido' : '🏐 Programar Nuevo Partido'}
              </h1>
              <p className="text-white/70 text-sm mt-0.5">
                {reprogramarId
                  ? 'Ajustá fecha, hora, sede y árbitro. La planilla se recupera intacta.'
                  : 'Definí el cruce, fecha, hora y árbitro.'}
              </p>
            </div>
            {reprogramarId && <AlertTriangle className="text-white/40" size={36} />}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* AVISO modo reprogramar */}
            {reprogramarId && (
              <div className="flex items-start gap-3 bg-orange-950/40 border border-orange-800/50 rounded-xl p-4">
                <Lock size={16} className="text-orange-400 mt-0.5 shrink-0" />
                <p className="text-orange-200 text-sm">
                  Los equipos y la categoría <strong>no pueden modificarse</strong>. Solo podés cambiar la nueva fecha, hora, sede y árbitro designado.
                </p>
              </div>
            )}

            {/* Categoría y Cancha */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Categoría</label>
                {reprogramarId ? (
                  <div className="w-full p-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white font-bold text-sm flex items-center gap-2">
                    <Lock size={14} className="text-zinc-500" />
                    {categoriaName || '—'}
                  </div>
                ) : (
                  <select
                    required
                    className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                    onChange={e => setForm({ ...form, categoria: e.target.value, local: '', visita: '' })}
                    value={form.categoria}
                  >
                    <option value="">— Seleccionar —</option>
                    {categorias.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name} ({cat.gender})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Cancha / Sede</label>
                <input
                  type="text"
                  required
                  value={form.cancha}
                  onChange={e => setForm({ ...form, cancha: e.target.value })}
                  className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm placeholder:text-zinc-500"
                  placeholder="Ej: Gimnasio Petrina"
                />
              </div>
            </div>

            {/* El Duelo */}
            <div className={`bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-4 ${reprogramarId ? '' : ''}`}>
              <p className="text-xs font-black text-zinc-500 uppercase tracking-widest mb-4 text-center">Cruce</p>
              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase text-center mb-2">Local</p>
                  {reprogramarId ? (
                    <div className="w-full p-2.5 bg-zinc-800/70 border border-zinc-700 rounded-lg text-white font-bold text-sm text-center flex items-center justify-center gap-1">
                      <Lock size={12} className="text-zinc-500" />
                      {localName || '—'}
                    </div>
                  ) : (
                    <select
                      required
                      disabled={!form.categoria}
                      className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-bold text-center disabled:opacity-40 disabled:cursor-not-allowed"
                      onChange={e => setForm({ ...form, local: e.target.value })}
                      value={form.local}
                    >
                      <option value="">{form.categoria ? 'Seleccionar...' : 'Elegí cat. primero'}</option>
                      {equiposFiltrados.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="text-2xl font-black text-zinc-600 text-center">VS</div>

                <div>
                  <p className="text-[10px] font-black text-zinc-500 uppercase text-center mb-2">Visita</p>
                  {reprogramarId ? (
                    <div className="w-full p-2.5 bg-zinc-800/70 border border-zinc-700 rounded-lg text-white font-bold text-sm text-center flex items-center justify-center gap-1">
                      <Lock size={12} className="text-zinc-500" />
                      {visitaName || '—'}
                    </div>
                  ) : (
                    <select
                      required
                      disabled={!form.categoria}
                      className="w-full p-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm font-bold text-center disabled:opacity-40 disabled:cursor-not-allowed"
                      onChange={e => setForm({ ...form, visita: e.target.value })}
                      value={form.visita}
                    >
                      <option value="">{form.categoria ? 'Seleccionar...' : 'Elegí cat. primero'}</option>
                      {equiposFiltrados.map(eq => (
                        <option key={eq.id} value={eq.id}>{eq.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Fecha y Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Fecha</label>
                <input
                  type="date"
                  required
                  onChange={e => setForm({ ...form, fecha: e.target.value })}
                  value={form.fecha}
                  className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 transition text-sm [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">Hora</label>
                <input
                  type="time"
                  required
                  onChange={e => setForm({ ...form, hora: e.target.value })}
                  value={form.hora}
                  className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 transition text-sm [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Árbitro Designado */}
            <div>
              <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                <User size={12} /> Árbitro Designado
              </label>
              <select
                className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-sm"
                onChange={e => setForm({ ...form, arbitro: e.target.value })}
                value={form.arbitro}
              >
                <option value="">— Sin designar —</option>
                {arbitros.map(ref => (
                <option key={ref.id} value={ref.id}>
                  {[ref.first_name, ref.last_name].filter(Boolean).join(' ')} {ref.category ? `(${ref.category})` : ''}
                </option>
              ))}
              </select>
              {arbitros.length === 0 && (
                <p className="text-xs text-zinc-500 mt-1">No hay árbitros activos registrados en el sistema.</p>
              )}
            </div>

            {/* Botón Final */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full ${reprogramarId
                ? 'bg-orange-600 hover:bg-orange-500 shadow-orange-900/30'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                } text-white font-black py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-wider`}
            >
              {loading
                ? <Loader2 className="animate-spin" size={18} />
                : <><Save size={18} /> {reprogramarId ? 'Confirmar Reprogramación' : 'Confirmar Partido'}</>
              }
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProgramarPartidoPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    }>
      <ProgramarForm />
    </Suspense>
  );
}