'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Plus, MapPin, Users, ChevronRight, Shield, Trash2, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// Mock Data incase DB is empty
const MOCK_TEAMS = [
  { id: '1', name: 'Club Galicia', city: 'Ushuaia', shield_url: null, squads_count: 4 },
  { id: '2', name: 'AEP', city: 'Ushuaia', shield_url: null, squads_count: 2 },
  { id: '3', name: 'Los Ñires', city: 'Ushuaia', shield_url: null, squads_count: 5 },
]

type Team = {
  id: string
  name: string
  city: string | null
  shield_url: string | null
  // squads_count is dynamic
}

export default function TeamsListPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClubName, setNewClubName] = useState('')
  const [creating, setCreating] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        // Fetch real teams
        // Force rebuild
        const { data, error } = await supabase
          .from('teams')
          .select('id, name, city, shield_url')
          .order('name')

        if (data && data.length > 0) {
          setTeams(data)
        } else {
          // Fallback to mock if no data for demo
          // In production remove this 'else'
          // setTeams(MOCK_TEAMS) 
        }
      } catch (err) {
        console.error('Error fetching teams:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTeams()
  }, [])

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClubName.trim()) return;

    setCreating(true);
    try {
      const { data, error } = await supabase.from('teams').insert([
        { name: newClubName, city: 'Ushuaia' } // Default city, customizable later
      ]).select().single();

      if (error) throw error;

      if (data) {
        setTeams([...teams, data]);
        setNewClubName('');
        setShowCreateModal(false);
      }
    } catch (error) {
      console.error("Error creating club:", error);
      alert("Error al crear el club.");
    } finally {
      setCreating(false);
    }
  }

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="text-tdf-blue" />
            Clubes e Instituciones
          </h1>
          <p className="text-gray-500 mt-1">Selecciona un club para gestionar sus planteles y jugadores.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-tdf-orange hover:bg-tdf-orange-hover text-white rounded-lg font-bold shadow-md hover:shadow-lg transition-all"
        >
          <Plus size={20} />
          Nuevo Club
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar club..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-tdf-orange outline-none transition-all shadow-sm"
        />
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          // Skeletons
          [1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-gray-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))
        ) : filteredTeams.length > 0 ? (
          filteredTeams.map((team) => (
            <div key={team.id} className="relative group bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:border-tdf-blue/30 transition-all duration-300 flex flex-col items-center text-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50 dark:to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Delete Button */}
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  if (!confirm('¿Estás seguro de eliminar este club? Se borrarán todos sus planteles y jugadores.')) return;
                  const { error } = await supabase.from('teams').delete().eq('id', team.id);
                  if (!error) {
                    setTeams(teams.filter(t => t.id !== team.id));
                  } else {
                    alert('Error al eliminar');
                  }
                }}
                className="absolute top-2 right-2 p-2 bg-red-50 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20 hover:bg-red-600 hover:text-white"
                title="Eliminar Club"
              >
                <Trash2 size={16} />
              </button>

              <Link href={`/admin/equipos/${team.id}`} className="flex flex-col items-center w-full z-10">
                <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-zinc-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                  {team.shield_url ? (
                    <img src={team.shield_url} alt={team.name} className="w-16 h-16 object-contain" />
                  ) : (
                    <Shield className="w-10 h-10 text-gray-300 dark:text-gray-600 group-hover:text-tdf-blue transition-colors" />
                  )}
                </div>

                <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-tdf-blue transition-colors">
                  {team.name}
                </h3>

                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <MapPin size={14} />
                  {team.city || 'Ushuaia'}
                </div>

                <div className="mt-6 w-full pt-4 border-t border-gray-50 dark:border-white/5 flex items-center justify-between text-sm font-medium text-gray-400 group-hover:text-tdf-orange transition-colors">
                  <span>Ver Planteles</span>
                  <ChevronRight size={16} />
                </div>
              </Link>
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-gray-400 bg-gray-50 dark:bg-zinc-900/50 rounded-2xl border border-dashed border-gray-200">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No se encontraron clubes.</p>
          </div>
        )}
      </div>
      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 uppercase-headings">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800 dark:text-white">Nuevo Club</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateClub}>
              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Nombre del Club</label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ej: Club Galicia"
                  className="w-full text-lg font-bold p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-tdf-orange outline-none"
                  value={newClubName}
                  onChange={(e) => setNewClubName(e.target.value)}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newClubName.trim() || creating}
                  className="flex-1 py-3 bg-tdf-orange hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                >
                  {creating ? <Loader2 className="animate-spin" /> : 'Crear Club'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}