'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Calendar, MapPin, Clock, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react'
import { useRefereeAuth } from '@/hooks/useRefereeAuth'
import { formatArgentinaDateLiteral, formatArgentinaTimeLiteral } from '@/lib/dateUtils'

export default function RefereeDashboard() {
    const supabase = createClient()
    const { userId, loading: authLoading } = useRefereeAuth()
    const [matches, setMatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    // Stats for Widgets
    const [pendingCount, setPendingCount] = useState(0)

    useEffect(() => {
        if (userId) fetchAssignments(userId)
    }, [userId])

    async function fetchAssignments(uid: string) {
        const { data } = await supabase
            .from('match_officials')
            .select(`
                id, role, status,
                match:matches (
                    id, scheduled_time, court_name, status,
                    home_team:teams!home_team_id(name, shield_url),
                    away_team:teams!away_team_id(name, shield_url),
                    category:categories(name),
                    tournament:tournaments(gender)
                )
            `)
            .eq('user_id', uid)

        if (data) {
            const validMatches = data
                .map(item => {
                    // @ts-ignore
                    const m = Array.isArray(item.match) ? item.match[0] : item.match;
                    return { ...item, match: m };
                })
                .filter(item => item.match && item.match.id && item.match.status !== 'finalizado');

            // Sort by date ASC
            validMatches.sort((a, b) => {
                const dateA = a.match?.scheduled_time || '';
                const dateB = b.match?.scheduled_time || '';
                return dateA.localeCompare(dateB);
            });

            setMatches(validMatches)
            setPendingCount(validMatches.filter(m => m.status === 'assigned').length)
        }
        setLoading(false)
    }

    if (authLoading || (loading && !matches.length && userId)) return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tdf-orange"></div>
        </div>
    )

    return (
        <div className="max-w-xl mx-auto space-y-8 pb-20">

            {/* HERO: MATCHES LIST */}
            <section>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-lg font-black text-white uppercase flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-tdf-orange rounded-full"></span>
                        Mis Partidos Asignados
                    </h2>
                </div>

                {matches.length > 0 ? (
                    <div className="space-y-4">
                        {matches.map(matchItem => {
                            const isSuspended = matchItem.match.status === 'suspendido';
                            return (
                            <Link 
                                key={matchItem.id} 
                                href={isSuspended ? '#' : `/referee/partido/${matchItem.match.id}`} 
                                onClick={(e) => { 
                                    if(isSuspended) { 
                                        e.preventDefault(); 
                                        alert("Este partido está SUSPENDIDO. No puedes ingresar hasta que la Federación lo reprograme y te habilite nuevamente."); 
                                    } 
                                }}
                                className={`group relative block bg-gradient-to-br from-zinc-900 via-zinc-900 to-black rounded-3xl border ${isSuspended ? 'border-red-900/50 opacity-80 cursor-not-allowed' : 'border-zinc-800'} overflow-hidden shadow-2xl hover:shadow-orange-900/10 hover:border-zinc-700 transition-all duration-300`}
                            >
                                {/* Status Label */}
                                <div className="absolute top-4 right-4 z-10 flex gap-2">
                                    {matchItem.match.status === 'suspendido' && <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg animate-pulse border border-red-400">Suspendido</span>}
                                    {matchItem.status === 'assigned' && matchItem.match.status !== 'suspendido' && <span className="bg-orange-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg animate-pulse">Pendiente</span>}
                                    {matchItem.status === 'confirmed' && matchItem.match.status !== 'suspendido' && <span className="bg-emerald-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded shadow-lg">Confirmado</span>}
                                </div>

                                <div className="p-6 relative z-0">
                                    {/* Header Info */}
                                    <div className="flex items-center gap-2 mb-6 text-zinc-400 text-xs font-bold uppercase tracking-widest">
                                        <span className="text-tdf-orange"><Clock size={12} /></span>
                                        <span>{formatArgentinaDateLiteral(matchItem.match.scheduled_time).split(',').slice(0, 2).join(',')} - {formatArgentinaTimeLiteral(matchItem.match.scheduled_time)} HS</span>
                                        <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
                                        <span>{matchItem.match.court_name || 'A Confirmar'}</span>
                                    </div>

                                    {/* Teams Face-off */}
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex flex-col items-center gap-2 w-1/3">
                                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center p-2 border border-zinc-700 shadow-inner group-hover:scale-110 transition-transform">
                                                {matchItem.match.home_team.shield_url
                                                    ? <img src={matchItem.match.home_team.shield_url} className="w-full h-full object-contain" />
                                                    : <span className="font-black text-2xl text-zinc-600">{matchItem.match.home_team.name.charAt(0)}</span>
                                                }
                                            </div>
                                            <span className="text-[10px] sm:text-xs font-bold text-white text-center leading-tight line-clamp-2 w-full px-1">{matchItem.match.home_team.name}</span>
                                        </div>

                                        <div className="flex flex-col items-center gap-1">
                                            <span className="text-3xl font-black text-zinc-700 italic">VS</span>
                                            <span className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800 text-center max-w-[80px] line-clamp-2">
                                                {matchItem.match.category?.name} {matchItem.match.tournament?.gender?.charAt(0)}
                                            </span>
                                        </div>

                                        <div className="flex flex-col items-center gap-2 w-1/3">
                                            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center p-2 border border-zinc-700 shadow-inner group-hover:scale-110 transition-transform">
                                                {matchItem.match.away_team.shield_url
                                                    ? <img src={matchItem.match.away_team.shield_url} className="w-full h-full object-contain" />
                                                    : <span className="font-black text-2xl text-zinc-600">{matchItem.match.away_team.name.charAt(0)}</span>
                                                }
                                            </div>
                                            <span className="text-[10px] sm:text-xs font-bold text-white text-center leading-tight line-clamp-2 w-full px-1">{matchItem.match.away_team.name}</span>
                                        </div>
                                    </div>

                                    {/* Footer Action */}
                                    <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-zinc-500 uppercase">Tu Rol</span>
                                            <span className="text-xs font-bold text-white capitalize">{matchItem.role.replace('_', ' ')}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-tdf-orange text-xs font-bold group-hover:translate-x-1 transition-transform">
                                            Ver Detalles <ChevronRight size={14} />
                                        </div>
                                    </div>
                                </div>
                            </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl p-8 text-center">
                        <Calendar size={32} className="mx-auto text-zinc-700 mb-3" />
                        <p className="text-zinc-500 font-medium text-sm">No tienes partidos asignados.</p>
                    </div>
                )}
            </section>

            {/* WIDGETS GRID (MOSAIC) */}
            <section>
                <div className="grid grid-cols-2 gap-3">
                    {/* Widget Agenda */}
                    <Link href="/referee/agenda" className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-800 transition group flex flex-col justify-between h-28">
                        <div className="flex justify-between items-start">
                            <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500"><Calendar size={20} /></div>
                            <span className="text-zinc-600 group-hover:text-white transition"><ChevronRight size={16} /></span>
                        </div>
                        <div>
                            <span className="block text-2xl font-black text-white">{matches.length}</span>
                            <span className="text-xs font-bold text-zinc-500 uppercase">Agenda Total</span>
                        </div>
                    </Link>

                    {/* Widget Pendientes */}
                    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex flex-col justify-between h-28 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500"><AlertCircle size={20} /></div>
                        </div>
                        <div className="relative z-10">
                            <span className="block text-2xl font-black text-white">{pendingCount}</span>
                            <span className="text-xs font-bold text-zinc-500 uppercase">Pendientes</span>
                        </div>
                    </div>

                    {/* Widget Reportes (Placeholder) */}
                    <Link href="/referee/reportes" className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-800 transition group flex flex-col justify-between h-28">
                        <div className="flex justify-between items-start">
                            {/* Using CheckCircle as generic 'Report/Done' icon for now if FileText not imported */}
                            <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500"><CheckCircle size={20} /></div>
                            <span className="text-zinc-600 group-hover:text-white transition"><ChevronRight size={16} /></span>
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-white mt-1">Reportes</span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase leading-tight">Historial y Pagos</span>
                        </div>
                    </Link>

                    {/* Widget Perfil */}
                    <Link href="/referee/perfil" className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl hover:bg-zinc-800 transition group flex flex-col justify-between h-28">
                        <div className="flex justify-between items-start">
                            <div className="bg-purple-500/10 p-2 rounded-lg text-purple-500"><MapPin size={20} /></div>
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-white mt-1">Mi Perfil</span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase leading-tight">Configuración</span>
                        </div>
                    </Link>
                </div>
            </section>

            {/* Quick Link to Messages (Full Width) */}
            <Link href="/referee/mensajes" className="block bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between hover:bg-zinc-900 transition">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="font-bold text-zinc-300 text-sm">Mensajes de Federación</span>
                </div>
                <ChevronRight size={16} className="text-zinc-600" />
            </Link>

        </div>
    )
}
