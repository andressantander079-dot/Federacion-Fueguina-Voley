'use client';

import React, { use } from 'react';
import { useMatchSheet } from '@/hooks/useMatchSheet';
import ScoreBoard from '@/components/match/ScoreBoard';
import Court from '@/components/match/Court';
import { ArrowLeft, RotateCcw, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function MatchSheetPage({ params }: { params: Promise<{ id: string }> }) {
    // Desempaquetar params usando React.use() como recomienda Next.js 15+
    const resolvedParams = use(params);
    const {
        match,
        loading,
        currentSet,
        homeRotation,
        awayRotation,
        servingTeam,
        addPoint,
        initializeSet
    } = useMatchSheet(resolvedParams.id);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white animate-pulse">Cargando planilla...</div>;

    if (!match) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white gap-4">
            <AlertTriangle className="text-red-500" size={48} />
            <h1 className="text-2xl font-bold">Partido no encontrado</h1>
            <Link href="/admin/competencias" className="text-tdf-orange hover:underline">Volver a Torneos</Link>
        </div>
    );

    // Si el partido finalizó, mostrar resumen
    if (match.status === 'finalizado') {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
                <div className="bg-slate-900 p-8 rounded-2xl border border-white/10 text-center max-w-md w-full animate-in zoom-in duration-500">
                    <h1 className="text-4xl font-black mb-2 text-tdf-blue">PARTIDO FINALIZADO</h1>
                    <p className="text-slate-400 mb-8 uppercase tracking-widest text-xs">Resultado Final</p>

                    <div className="flex justify-between items-center mb-8 px-4">
                        <div className="text-center">
                            <div className="text-xl font-bold mb-2">{match.home_team?.name}</div>
                            <div className={`text-6xl font-black ${match.home_score > match.away_score ? 'text-green-500' : 'text-slate-500'}`}>
                                {match.home_score}
                            </div>
                        </div>
                        <div className="text-2xl text-slate-600 font-bold">-</div>
                        <div className="text-center">
                            <div className="text-xl font-bold mb-2">{match.away_team?.name}</div>
                            <div className={`text-6xl font-black ${match.away_score > match.home_score ? 'text-green-500' : 'text-slate-500'}`}>
                                {match.away_score}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 justify-center mb-8">
                        {match.set_scores?.map((score, i) => (
                            <span key={i} className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-400 font-mono">
                                {score}
                            </span>
                        ))}
                    </div>

                    <Link
                        href="/admin"
                        className="block w-full py-4 bg-white text-slate-900 hover:bg-slate-200 font-black rounded-xl text-lg transition"
                    >
                        VOLVER AL MENU
                    </Link>
                </div>
            </div>
        );
    }

    // Si no hay set iniciado, mostrar pantalla de inicio de set
    if (!currentSet) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
                <h1 className="text-3xl font-black mb-8 text-center">{match.home_team?.name} vs {match.away_team?.name}</h1>
                <div className="bg-slate-900 p-8 rounded-2xl border border-white/10 text-center max-w-md w-full">
                    <h2 className="text-xl font-bold mb-4">¿Iniciar Set {(match.set_scores?.length || 0) + 1}?</h2>
                    <p className="text-slate-400 mb-8 text-sm">Verifique que las formaciones iniciales estén cargadas antes de comenzar.</p>
                    <button
                        onClick={initializeSet}
                        className="w-full py-4 bg-tdf-orange hover:bg-orange-600 text-white font-black rounded-xl text-lg shadow-lg shadow-orange-900/20 transition transform active:scale-95"
                    >
                        COMENZAR SET
                    </button>
                    <Link href="/admin" className="block mt-6 text-sm text-slate-500 hover:text-white">Cancelar y Volver</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
            {/* HEADER */}
            <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-white/5 p-4 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full text-slate-500">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                            Set {currentSet.set_number}
                        </h1>
                        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                            {match.category_id || 'Torneo Oficial'} • {match.round || 'Fase Regular'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Botones de acción rápida futuros (Timeout, Sustitución) */}
                    <button className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition" title="Deshacer última acción" onClick={() => alert('Función Deshacer pronto')}>
                        <RotateCcw size={18} />
                    </button>
                </div>
            </header>

            {/* MAIN GAME AREA */}
            <main className="flex-1 p-4 md:p-8 flex flex-col items-center max-w-7xl mx-auto w-full">

                {/* MARCADOR */}
                <ScoreBoard
                    homeScore={currentSet.home_points}
                    awayScore={currentSet.away_points}
                    homeName={match.home_team?.name || 'Local'}
                    awayName={match.away_team?.name || 'Visita'}
                    servingTeam={servingTeam}
                    onAddPoint={addPoint}
                />

                {/* CANCHA / ROTACIONES */}
                <Court
                    homeRotation={homeRotation}
                    awayRotation={awayRotation}
                />

                {/* CONTROLES ADICIONALES (Mobile Friendly) */}
                <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-8">
                    <button className="py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                        Pedido de Tiempo
                    </button>
                    <button className="py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 rounded-xl font-bold text-slate-600 dark:text-slate-300 shadow-sm">
                        Sustitución
                    </button>
                </div>

            </main>
        </div>
    );
}
