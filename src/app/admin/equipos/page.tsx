'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Plus, MapPin, Users, ChevronRight, Shield, Trash2, X, Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
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
  const [creating, setCreating] = useState(false)

  // Modales de Seguridad
  const [clubToDelete, setClubToDelete] = useState<Team | null>(null)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    city: 'Ushuaia',
    email: '',
    password: '',
  })
  const [staff, setStaff] = useState<{ name: string, role: string, phone: string }[]>([])
  const [newStaff, setNewStaff] = useState({ name: '', role: '', phone: '' })

  const supabase = createClient()

  useEffect(() => {
    // ... existing fetch logic ...
    const fetchTeams = async () => {
      try {
        const { data, error } = await supabase
          .from('teams')
          .select('id, name, city, shield_url')
          .order('name')

        if (data && data.length > 0) {
          setTeams(data)
        }
      } catch (err) {
        console.error('Error fetching teams:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTeams()
  }, [])

  const handleAddStaff = () => {
    if (!newStaff.name || !newStaff.role) return;
    setStaff([...staff, newStaff]);
    setNewStaff({ name: '', role: '', phone: '' })
  }

  const handleRemoveStaff = (index: number) => {
    setStaff(staff.filter((_, i) => i !== index));
  }

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email || !formData.password) return toast.error("Completa los campos obligatorios");

    setCreating(true);
    try {
      const response = await fetch('/api/admin/create-club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clubName: formData.name,
          city: formData.city,
          email: formData.email,
          password: formData.password,
          staff: staff
        })
      });

      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.error("Error parsing JSON:", text);
        throw new Error("Respuesta inválida del servidor: " + text.substring(0, 100));
      }

      if (!response.ok) throw new Error(result.error || 'Error creando club');

      setTeams([...teams, result.team]);
      setFormData({ name: '', city: 'Ushuaia', email: '', password: '' });
      setStaff([]);
      setShowCreateModal(false);
      toast.success(`¡Club Creado! Usuario: ${result.user.email}`);

    } catch (error: any) {
      console.error("Error creating club:", error);
      toast.error("Error: " + error.message);
    } finally {
      setCreating(false);
    }
  }

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 min-h-screen">
      {/* ... Header and Search code remains similar ... */}
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
          [1, 2, 3, 4].map(i => <div key={i} className="h-48 bg-gray-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />)
        ) : filteredTeams.length > 0 ? (
          filteredTeams.map((team) => (
            <div key={team.id} className="relative group bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-gray-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:border-tdf-blue/30 transition-all duration-300 flex flex-col items-center text-center overflow-hidden">
              {/* Same Card Content as before */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-50 dark:to-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />

              <button
                onClick={(e) => {
                  e.preventDefault();
                  // En lugar de confirm() abrimos el modal
                  setClubToDelete(team);
                  setDeletePassword('');
                  setDeleteError(null);
                }}
                className="absolute top-2 right-2 p-2 bg-red-50 text-red-500 rounded-full opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all z-20 hover:bg-red-600 hover:text-white shadow-sm lg:shadow-none"
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

      {/* CREATE MODAL - EXPANDED */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 md:p-8 max-w-2xl w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 uppercase-headings max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white dark:bg-zinc-900 pb-2 z-10 border-b border-gray-100 dark:border-white/5">
              <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">Alta de Club</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                <X size={24} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleCreateClub} className="space-y-6">

              {/* Sección 1: Datos del Club */}
              <div className="space-y-4 p-4 bg-slate-50 dark:bg-black/20 rounded-xl">
                <h3 className="text-sm font-bold text-tdf-blue uppercase tracking-wider mb-2">Datos Institucionales</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nombre Oficial</label>
                    <input
                      type="text"
                      required
                      className="w-full p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-tdf-orange"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Ciudad</label>
                    <input
                      type="text"
                      className="w-full p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-tdf-orange"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Acceso */}
              <div className="space-y-4 p-4 bg-slate-50 dark:bg-black/20 rounded-xl">
                <h3 className="text-sm font-bold text-tdf-blue uppercase tracking-wider mb-2">Credenciales de Acceso</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Email (Usuario)</label>
                    <input
                      type="email"
                      required
                      className="w-full p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-tdf-orange"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Contraseña</label>
                    <input
                      type="password"
                      required
                      className="w-full p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-lg outline-none focus:border-tdf-orange"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Staff */}
              <div className="space-y-4 p-4 bg-slate-50 dark:bg-black/20 rounded-xl">
                <h3 className="text-sm font-bold text-tdf-blue uppercase tracking-wider mb-2">Autoridades / Staff</h3>

                <div className="flex gap-2 items-end mb-4">
                  <div className="flex-1">
                    <input placeholder="Nombre" className="w-full p-2 text-sm rounded border bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10" value={newStaff.name} onChange={e => setNewStaff({ ...newStaff, name: e.target.value })} />
                  </div>
                  <div className="flex-1">
                    <input placeholder="Cargo (Ej: Presidente)" className="w-full p-2 text-sm rounded border bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10" value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} />
                  </div>
                  <div className="flex-1">
                    <input placeholder="Teléfono" className="w-full p-2 text-sm rounded border bg-white dark:bg-zinc-950 border-slate-200 dark:border-white/10" value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} />
                  </div>
                  <button type="button" onClick={handleAddStaff} className="p-2 bg-slate-200 dark:bg-white/10 rounded hover:bg-slate-300 transition text-slate-700 dark:text-white">
                    <Plus size={16} />
                  </button>
                </div>

                {staff.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {staff.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/5 text-sm">
                        <span className="font-bold">{s.name}</span>
                        <span className="text-slate-500">({s.role})</span>
                        <button type="button" onClick={() => handleRemoveStaff(i)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 bg-tdf-orange hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
                >
                  {creating ? <Loader2 className="animate-spin" /> : 'Confirmar Alta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ELIMINACIÓN SEGURA */}
      {clubToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
            <div className="bg-red-50 dark:bg-red-500/10 p-6 flex flex-col items-center border-b border-red-100 dark:border-red-500/20">
              <div className="w-16 h-16 bg-white dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4 shadow-sm border border-red-200 dark:border-red-500/30">
                <Trash2 className="text-red-500 w-8 h-8" />
              </div>
              <h2 className="text-xl font-black text-red-600 dark:text-red-400 text-center uppercase tracking-tight">Acción Destructiva</h2>
              <p className="text-sm text-red-500 text-center mt-2 font-medium">Estás a punto de eliminar permanentemente al club <strong>"{clubToDelete.name}"</strong> y a todo su historial.</p>
            </div>

            <div className="p-6">
              {deleteError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 text-sm font-medium rounded-lg text-center">
                  {deleteError}
                </div>
              )}

              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Contraseña de Administrador Requerida</label>
              <div className="relative mb-6">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  required
                  placeholder="Por seguridad, verifica tu contraseña..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-red-500 transition-all font-mono"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !deleting && deletePassword) {
                      e.preventDefault();
                      document.getElementById('btn-confirm-delete')?.click();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setClubToDelete(null); setDeleteError(null); }}
                  className="flex-1 py-3 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition"
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-delete"
                  disabled={deleting || !deletePassword}
                  onClick={async () => {
                   setDeleting(true);
                   setDeleteError(null);
                   try {
                     // 1. Obtener User Current
                     const { data: { user } } = await supabase.auth.getUser();
                     if (!user || !user.email) throw new Error("Sesión no válida");
                     
                     // 2. Verificar contraseña intentando re-signin
                     const { error: authError } = await supabase.auth.signInWithPassword({
                       email: user.email,
                       password: deletePassword.trim()
                     });

                     if (authError) {
                       throw new Error("Contraseña incorrecta. Operación cancelada.");
                     }

                     // 3. Ejecutar Delete
                     const response = await fetch('/api/admin/delete-club', {
                       method: 'POST',
                       headers: { 'Content-Type': 'application/json' },
                       body: JSON.stringify({ teamId: clubToDelete.id })
                     });

                     if (!response.ok) {
                       const errorData = await response.json();
                       throw new Error(errorData.error || 'Fallo interno del servidor');
                     }

                     setTeams(teams.filter(t => t.id !== clubToDelete.id));
                     toast.success('El equipo ha sido erradicado del sistema de manera segura.');
                     setClubToDelete(null);

                   } catch (err: any) {
                     setDeleteError(err.message);
                   } finally {
                     setDeleting(false);
                   }
                  }}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 disabled:opacity-50 flex items-center justify-center gap-2 transition uppercase tracking-wider text-sm"
                >
                  {deleting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Eliminar Club'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}