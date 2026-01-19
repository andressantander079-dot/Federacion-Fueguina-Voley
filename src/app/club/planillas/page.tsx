// src/app/club/planillas/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, Download, Filter, 
  ArrowLeft, Calendar, Trophy, XCircle, ChevronDown, Check 
} from 'lucide-react';

export default function PlanillasClub() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  
  // Datos Base
  const [teamId, setTeamId] = useState<string | null>(null);
  const [matches, setMatches] = useState<any[]>([]); 
  const [categories, setCategories] = useState<any[]>([]);
  
  // Filtros Seleccionados
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedRivalId, setSelectedRivalId] = useState('Todos');

  // Estado para el Dropdown Personalizado (Rivales)
  const [showRivalDropdown, setShowRivalDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inicializar();
    
    // Cierra el dropdown si clickean afuera
    function handleClickOutside(event: any) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowRivalDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function inicializar() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: perfil } = await supabase.from('profiles').select('team_id').eq('id', user.id).single();
      if (!perfil?.team_id) return router.push('/club/dashboard');
      setTeamId(perfil.team_id);

      // Cargar Categorías
      const { data: cats } = await supabase.from('team_categories').select('*').eq('team_id', perfil.team_id);
      setCategories(cats || []);

      // Cargar Partidos TERMINADOS
      const { data: partidos } = await supabase
        .from('matches')
        .select(`
          *,
          venue:venues(name),
          category:team_categories(name),
          home_team:teams!home_team_id(id, name, logo_url),
          away_team:teams!away_team_id(id, name, logo_url)
        `)
        .or(`home_team_id.eq.${perfil.team_id},away_team_id.eq.${perfil.team_id}`)
        .eq('status', 'finished')
        .order('date_time', { ascending: false });

      setMatches(partidos || []);

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // --- LÓGICA DE FILTRADO INTELIGENTE ---
  
  // 1. Filtrar partidos por categoría seleccionada
  const matchesPorCategoria = selectedCategory === 'Todas' 
    ? matches 
    : matches.filter(m => m.category?.name === selectedCategory);

  // 2. Extraer Rivales Únicos (Basado en la categoría seleccionada)
  // Esto hace el "Efecto Embudo": Solo muestra rivales contra los que jugaste en ESA categoría
  const rivalMap = new Map();
  matchesPorCategoria.forEach(m => {
    if (!teamId) return;
    const rival = m.home_team_id === teamId ? m.away_team : m.home_team;
    if (!rivalMap.has(rival.id)) {
        rivalMap.set(rival.id, rival);
    }
  });
  const uniqueRivals = Array.from(rivalMap.values());

  // 3. Filtrar finalmente por Rival
  const filteredMatches = selectedRivalId === 'Todos'
    ? matchesPorCategoria
    : matchesPorCategoria.filter(m => {
        const rivalId = m.home_team_id === teamId ? m.away_team.id : m.home_team.id;
        return rivalId === selectedRivalId;
      });

  // Helper para mostrar el rival seleccionado en el botón
  const selectedRivalObj = uniqueRivals.find(r => r.id === selectedRivalId);

  // Helpers visuales
  const getResultStyle = (m: any) => {
    const isHome = m.home_team_id === teamId;
    const myScore = isHome ? m.home_score : m.away_score;
    const rivalScore = isHome ? m.away_score : m.home_score;
    
    if (myScore > rivalScore) return { label: 'VICTORIA', color: 'text-green-700 bg-green-50 border-green-200' };
    return { label: 'DERROTA', color: 'text-red-700 bg-red-50 border-red-200' };
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Cargando Historial...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* HEADER */}
      <div className="bg-white border-b px-6 py-4 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
        <Link href="/club/dashboard" className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={20} className="text-slate-600"/></Link>
        <div>
            <h1 className="font-black text-xl text-slate-800">Planillas de Juego</h1>
            <p className="text-xs text-slate-500 font-medium">Documentación Oficial</p>
        </div>
      </div>

      <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">

        {/* --- PANEL DE FILTROS --- */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Filter size={14}/> Filtrar Documentos
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* 1. SELECTOR DE CATEGORÍA (Estándar) */}
                <div>
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Categoría</label>
                    <div className="relative">
                        <select 
                            value={selectedCategory}
                            onChange={(e) => {
                                setSelectedCategory(e.target.value);
                                setSelectedRivalId('Todos'); // Reseteamos rival al cambiar categoría
                            }}
                            className="w-full p-3 pl-4 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition appearance-none font-medium text-slate-700 cursor-pointer"
                        >
                            <option value="Todas">Todas las Categorías</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16}/>
                    </div>
                </div>

                {/* 2. SELECTOR DE RIVAL (PERSONALIZADO CON LOGOS) */}
                <div ref={dropdownRef} className="relative">
                    <label className="text-sm font-bold text-slate-700 mb-2 block">Club Rival</label>
                    
                    {/* Botón que abre el dropdown */}
                    <button 
                        onClick={() => setShowRivalDropdown(!showRivalDropdown)}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-3">
                            {selectedRivalId !== 'Todos' && selectedRivalObj ? (
                                <>
                                   <img src={selectedRivalObj.logo_url || '/placeholder.png'} className="w-6 h-6 object-contain"/>
                                   <span className="font-bold text-slate-800">{selectedRivalObj.name}</span>
                                </>
                            ) : (
                                <span className="font-medium text-slate-700">Todos los Rivales</span>
                            )}
                        </div>
                        <ChevronDown size={16} className={`text-slate-400 transition ${showRivalDropdown ? 'rotate-180' : ''}`}/>
                    </button>

                    {/* Lista Desplegable (Dropdown) */}
                    {showRivalDropdown && (
                        <div className="absolute top-full mt-2 left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-60 overflow-y-auto p-1 animate-in fade-in slide-in-from-top-2">
                            <button 
                                onClick={() => { setSelectedRivalId('Todos'); setShowRivalDropdown(false); }}
                                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition ${selectedRivalId === 'Todos' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}
                            >
                                <span className="w-8 flex justify-center">{selectedRivalId === 'Todos' && <Check size={16}/>}</span>
                                <span className="font-bold text-sm">Todos los Rivales</span>
                            </button>
                            
                            {uniqueRivals.map((rival: any) => (
                                <button 
                                    key={rival.id}
                                    onClick={() => { setSelectedRivalId(rival.id); setShowRivalDropdown(false); }}
                                    className={`w-full text-left p-3 rounded-lg flex items-center gap-3 hover:bg-slate-50 transition ${selectedRivalId === rival.id ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}
                                >
                                    <img src={rival.logo_url || '/placeholder.png'} className="w-8 h-8 object-contain bg-white rounded-full border border-slate-100 p-1"/>
                                    <span className="font-bold text-sm">{rival.name}</span>
                                    {selectedRivalId === rival.id && <Check size={16} className="ml-auto"/>}
                                </button>
                            ))}

                            {uniqueRivals.length === 0 && (
                                <div className="p-4 text-center text-xs text-slate-400">
                                    No hay rivales registrados en esta categoría.
                                </div>
                            )}
                        </div>
                    )}
                </div>

            </div>

            {/* Resumen y Limpieza */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <p className="text-xs text-slate-500">
                    Encontramos <span className="font-bold text-slate-800">{filteredMatches.length}</span> planillas.
                </p>
                {(selectedCategory !== 'Todas' || selectedRivalId !== 'Todos') && (
                    <button 
                        onClick={() => { setSelectedCategory('Todas'); setSelectedRivalId('Todos'); }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                        <XCircle size={14}/> Limpiar Filtros
                    </button>
                )}
            </div>
        </div>

        {/* --- LISTA DE RESULTADOS --- */}
        <div className="space-y-4">
            {filteredMatches.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <Trophy size={64} className="mx-auto text-slate-200 mb-6"/>
                    <h3 className="text-lg font-bold text-slate-500">Sin coincidencias</h3>
                    <p className="text-sm text-slate-400 max-w-xs mx-auto mt-2">
                        No encontramos partidos con estos filtros. Prueba cambiando la categoría o seleccionando "Todos los Rivales".
                    </p>
                </div>
            ) : (
                filteredMatches.map(m => {
                    const resultStyle = getResultStyle(m);
                    const isHome = m.home_team_id === teamId;
                    const rival = isHome ? m.away_team : m.home_team;
                    
                    return (
                        <div key={m.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition group overflow-hidden flex flex-col md:flex-row">
                            
                            {/* INFO DEL PARTIDO */}
                            <div className="p-6 flex-1">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex gap-2 items-center">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded uppercase border ${resultStyle.color}`}>
                                            {resultStyle.label}
                                        </span>
                                        <span className="text-[10px] font-bold px-2 py-1 rounded uppercase bg-slate-100 text-slate-500 border border-slate-200">
                                            {m.category?.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                                        <Calendar size={14}/>
                                        {new Date(m.date_time).toLocaleDateString()}
                                    </div>
                                </div>

                                <div className="flex items-center justify-around md:justify-start md:gap-12">
                                    {/* RIVAL CON LOGO GRANDE */}
                                    <div className="flex flex-col md:flex-row items-center gap-3">
                                        <div className="relative">
                                            <img src={rival.logo_url || '/placeholder.png'} className="w-14 h-14 object-contain bg-white rounded-full p-1 border border-slate-100 shadow-sm"/>
                                            <div className="absolute -bottom-1 -right-1 bg-slate-800 text-white text-[10px] font-bold px-1.5 rounded">VS</div>
                                        </div>
                                        <span className="font-bold text-slate-700 text-center md:text-left text-lg">{rival.name}</span>
                                    </div>

                                    {/* RESULTADO */}
                                    <div className="flex flex-col items-center pl-6 border-l border-slate-100">
                                        <div className="text-3xl font-black text-slate-800 tracking-tight">
                                            {m.home_score} - {m.away_score}
                                        </div>
                                        <span className="text-xs text-slate-400 font-medium">Sets: {m.set_scores || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* BOTÓN DESCARGA */}
                            <div className="bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 p-6 w-full md:w-56 flex flex-col justify-center items-center gap-3">
                                {m.sheet_url ? (
                                    <>
                                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-red-500 border border-slate-200">
                                            <FileText size={20}/>
                                        </div>
                                        <a 
                                            href={m.sheet_url} 
                                            target="_blank" 
                                            className="w-full bg-slate-900 hover:bg-black text-white py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-lg shadow-slate-200"
                                        >
                                            <Download size={16}/> Ver Planilla
                                        </a>
                                    </>
                                ) : (
                                    <>
                                        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-300 border border-slate-200">
                                            <FileText size={20}/>
                                        </div>
                                        <div className="text-center px-2">
                                            <p className="text-xs font-bold text-slate-400">Sin Planilla</p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })
            )}
        </div>

      </div>
    </div>
  );
}