'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    LayoutDashboard,
    Trophy,
    Users,
    ClipboardList,
    Settings,
    FileText,
    Megaphone,
    ArrowRight,
    MessageSquare,
    UserPlus,
    FileSignature,
    Loader2,
    Wallet,
    Shield,
    UserCog,
    Calendar,
    Download
} from 'lucide-react'
import RecentMatches from '@/components/admin/RecentMatches';
import { createClient } from '@/lib/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// Definición de las tarjetas del mosaico
const getMosaicCards = (counts: any) => [
    {
        title: 'Mesa de Entrada',
        description: 'Bandeja de mensajes.',
        href: '/admin/mensajes',
        icon: <MessageSquare className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-purple-500 to-indigo-600',
        delay: 'delay-100',
        badge: counts.mensajes
    },
    {
        title: 'Competencias',
        description: 'Gestión de torneos y fixture.',
        href: '/admin/competencias',
        icon: <Trophy className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-blue-400 to-tdf-blue',
        delay: 'delay-200',
        badge: 0
    },
    {
        title: 'Equipos',
        description: 'Clubes, planteles y jugadores.',
        href: '/admin/equipos',
        icon: <Users className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-emerald-400 to-teal-600',
        delay: 'delay-300',
        badge: 0
    },
    {
        title: 'Agenda',
        description: 'Calendario y reuniones.',
        href: '/admin/agenda',
        icon: <Calendar className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-pink-500 to-rose-600',
        delay: 'delay-300',
        badge: 0
    },
    {
        title: 'Trámites',
        description: 'Pagos, pases y fichajes.',
        href: '/admin/tramites',
        icon: <FileSignature className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-indigo-400 to-purple-600',
        delay: 'delay-400',
        badge: counts.tramites
    },
    {
        title: 'Reglamentos',
        description: 'Documentación oficial.',
        href: '/admin/reglamentos',
        icon: <ClipboardList className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-slate-400 to-slate-600',
        delay: 'delay-500',
        badge: 0
    },
    {
        title: 'Configuración',
        description: 'Sedes y sistema.',
        href: '/admin/configuracion',
        icon: <Settings className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-gray-700 to-black',
        delay: 'delay-500',
        badge: 0
    },
    {
        title: 'Tesorería',
        description: 'Gestión financiera y balance.',
        href: '/admin/treasury',
        icon: <Wallet className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-emerald-600 to-teal-800',
        delay: 'delay-500',
        badge: 0
    },
    {
        title: 'Colegio de Árbitros',
        description: 'Padrón, designaciones y actas.',
        href: '/admin/arbitros',
        icon: <Shield className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-blue-600 to-cyan-700',
        delay: 'delay-500',
        badge: 0
    },
    {
        title: 'Designaciones',
        description: 'Asignar árbitros a partidos.',
        href: '/admin/designaciones',
        icon: <UserCog className="w-8 h-8" />,
        color: '',
        tdfColor: 'from-orange-500 to-red-500',
        delay: 'delay-500',
        badge: 0
    }
]

export default function AdminDashboardPage() {
    const supabase = createClient();

    const [counts, setCounts] = useState({
        mensajes: 0,
        tramites: 0,
        equipos: 0,
        torneos: 0,
        jugadores: 0
    });
    const [topClubs, setTopClubs] = useState<{ name: string, count: number, logo: string | null }[]>([]);
    const [exporting, setExporting] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCounts();
    }, []);

    async function fetchCounts() {
        try {
            // 1. Mensajes sin leer / abiertos
            const { count: msgCount } = await supabase
                .from('tickets')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'abierto');

            // 2. Trámites en revisión
            const { count: procCount } = await supabase
                .from('procedures')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'en_revision');

            // 3. Equipos
            const { count: teamCount } = await supabase
                .from('teams')
                .select('*', { count: 'exact', head: true });

            // 4. Torneos Activos
            const { count: tournamentCount } = await supabase
                .from('tournaments')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'active');

            // 5. Jugadores
            const { count: playerCount } = await supabase
                .from('players')
                .select('*', { count: 'exact', head: true });


            // 6. Top 5 Clubes con mayor retención
            const { data: allP } = await supabase.from('players').select('team_id');
            const { data: allC } = await supabase.from('teams').select('id, name, logo_url');

            if (allP && allC) {
                const freqMap: Record<string, number> = {};
                allP.forEach(p => {
                    if (p.team_id) freqMap[p.team_id] = (freqMap[p.team_id] || 0) + 1;
                });

                const ranked = allC.map(c => ({
                    name: c.name,
                    logo: c.logo_url,
                    count: freqMap[c.id] || 0
                }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5);

                setTopClubs(ranked);
            }

            setCounts({
                mensajes: msgCount || 0,
                tramites: procCount || 0,
                equipos: teamCount || 0,
                torneos: tournamentCount || 0,
                jugadores: playerCount || 0
            });
        } catch (error) {
            console.error("Error fetching counts", error);
        } finally {
            setLoading(false);
        }
    }
    const exportToPDF = async () => {
        setExporting(true);
        try {
            // 1. Fetch all data using separate queries for robustness
            const [
                { data: clubs, error: clubsErr },
                { data: allSquads, error: squadsErr },
                { data: allPlayers, error: playersErr },
                { data: categories, error: catsErr }
            ] = await Promise.all([
                supabase.from('teams').select('id, name, city').order('name'),
                supabase.from('squads').select('id, team_id, name, coach_name, category_id'),
                supabase.from('players').select('name, number, squad_id'),
                supabase.from('categories').select('id, name')
            ]);

            if (clubsErr) throw clubsErr;
            if (squadsErr) throw squadsErr;
            if (playersErr) throw playersErr;

            // 2. Map and Assemble Data
            const catMap = (categories || []).reduce((acc: any, cat) => {
                acc[cat.id] = cat.name;
                return acc;
            }, {});

            // Group squads by team_id
            const squadsByTeam = (allSquads || []).reduce((acc: any, sq) => {
                if (!acc[sq.team_id]) acc[sq.team_id] = [];
                acc[sq.team_id].push(sq);
                return acc;
            }, {});

            // Group players by squad_id
            const playersBySquad = (allPlayers || []).reduce((acc: any, pl) => {
                if (!acc[pl.squad_id]) acc[pl.squad_id] = [];
                acc[pl.squad_id].push(pl);
                return acc;
            }, {});

            // Assemble everything into a structure similar to our original nested query
            const assembledClubs = (clubs || []).map(club => ({
                ...club,
                squads: (squadsByTeam[club.id] || []).map((sq: any) => ({
                    ...sq,
                    players: (playersBySquad[sq.id] || [])
                }))
            }));

            // 3. Create PDF
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            const dateStr = format(new Date(), 'dd/MM/yyyy HH:mm');

            // Header
            doc.setFillColor(15, 23, 42); // slate-900
            doc.rect(0, 0, pageWidth, 40, 'F');

            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.text('FEDERACIÓN DE VOLEY', pageWidth / 2, 20, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('REPORTE MAESTRO DE CLUBES Y PLANTELES', pageWidth / 2, 30, { align: 'center' });

            doc.setTextColor(100, 116, 139); // slate-400
            doc.text(`Generado: ${dateStr}`, pageWidth - 15, 30, { align: 'right' });

            let currentY = 50;

            assembledClubs.forEach((club) => {
                // Check page break
                if (currentY > 250) {
                    doc.addPage();
                    currentY = 20;
                }

                // Club Title
                doc.setTextColor(194, 65, 12); // orange-700
                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.text(club.name.toUpperCase(), 15, currentY);
                currentY += 5;
                doc.setDrawColor(229, 231, 235);
                doc.line(15, currentY, pageWidth - 15, currentY);
                currentY += 10;

                club.squads?.forEach((squad: any) => {
                    const catName = catMap[squad.category_id] || 'General';

                    // Squad Info
                    doc.setTextColor(30, 41, 59); // slate-800
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text(`${catName} - ${squad.name}`, 15, currentY);

                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(100, 116, 139);
                    doc.text(`Entrenador: ${squad.coach_name || 'Sin asignar'}`, 15, currentY + 5);

                    currentY += 10;

                    // Players Table
                    const tableData = squad.players.map((p: any) => [
                        p.number || '-',
                        p.name.toUpperCase()
                    ]);

                    autoTable(doc, {
                        startY: currentY,
                        head: [['#', 'NOMBRE Y APELLIDO']],
                        body: tableData.length > 0 ? tableData : [['-', 'SIN JUGADORES']],
                        theme: 'grid',
                        headStyles: {
                            fillColor: [30, 41, 59],
                            textColor: [255, 255, 255],
                            fontSize: 8,
                            halign: 'center'
                        },
                        styles: { fontSize: 8, cellPadding: 2 },
                        columnStyles: {
                            0: { halign: 'center', cellWidth: 15 }
                        },
                        margin: { left: 15, right: 15 }
                    });

                    currentY = (doc as any).lastAutoTable.finalY + 15;
                });

                currentY += 10;
            });

            // Footer / Page numbers
            const pageCount = doc.internal.pages.length - 1;
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }

            doc.save(`Ficha_Federacion_${format(new Date(), 'yyyyMMdd')}.pdf`);

        } catch (err: any) {
            console.error("Error al exportar PDF:", err);
            alert("Error al generar PDF: " + err.message);
        } finally {
            setExporting(false);
        }
    };

    const cards = getMosaicCards(counts);

    return (
        <div className="p-4 md:p-8 min-h-screen transition-colors duration-500">

            {/* Header / Top Metric Bar */}
            <div className="flex flex-col lg:flex-row gap-8 mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                <header className="flex-1">
                    <h1 className="text-3xl md:text-4xl font-black text-orange-900 dark:text-white tracking-tight mb-2">
                        Panel de Control <span className="text-tdf-orange">FVU</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 text-lg">
                        Bienvenido al sistema de gestión centralizada.
                    </p>
                </header>

                {/* KPI: Top Club Retention */}
                {!loading && topClubs.length > 0 && (
                    <div className="bg-white dark:bg-zinc-900 p-4 rounded-3xl shadow-lg border border-gray-100 dark:border-zinc-800 lg:min-w-[400px]">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-sm text-slate-700 dark:text-gray-200 flex items-center gap-2">
                                <Trophy size={16} className="text-tdf-orange" />
                                Top Retención (Atletas)
                            </h3>
                            <Link href="/admin/equipos" className="text-xs font-bold text-tdf-blue hover:underline">Ver Todos</Link>
                        </div>
                        <div className="space-y-3">
                            {topClubs.map((c, i) => (
                                <div key={i} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-slate-500 text-xs overflow-hidden">
                                            {c.logo ? <img src={c.logo} className="w-full h-full object-cover" /> : i + 1}
                                        </div>
                                        <span className="text-sm font-bold text-slate-800 dark:text-slate-300 truncate max-w-[150px]">{c.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="h-2 w-16 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-tdf-blue" style={{ width: `${Math.min((c.count / (topClubs[0]?.count || 1)) * 100, 100)}%` }}></div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-400 w-6 text-right">{c.count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Matches & Agenda */}
            <RecentMatches />

            {/* Mosaic Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
                {cards.map((card, index) => (
                    <Link
                        key={index}
                        href={card.href}
                        className={`group relative overflow-hidden rounded-3xl p-6 h-64 flex flex-col justify-between transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl shadow-lg bg-white dark:bg-zinc-900 border border-transparent hover:border-white/20 animate-in fade-in zoom-in ${card.delay}`}
                    >
                        {/* Background Gradient Effect on Hover */}
                        <div className={`absolute inset-0 bg-gradient-to-br ${card.tdfColor} opacity-0 group-hover:opacity-10 dark:group-hover:opacity-20 transition-opacity duration-500`} />

                        {/* Icon Background Bubble */}
                        <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full bg-gradient-to-br ${card.tdfColor} opacity-10 group-hover:scale-150 group-hover:opacity-20 transition-all duration-700 ease-out`} />

                        {/* Content */}
                        <div className="relative z-10">
                            <div className="flex justify-between items-start">
                                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${card.tdfColor} flex items-center justify-center text-white shadow-lg mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                    {card.icon}
                                </div>
                                {card.badge > 0 && (
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 text-white font-black text-xs shadow-lg animate-pulse ring-4 ring-white dark:ring-zinc-900">
                                        {card.badge}
                                    </div>
                                )}
                            </div>

                            <h3 className="text-2xl font-bold text-orange-900 dark:text-white mb-1 group-hover:text-tdf-blue dark:group-hover:text-tdf-orange transition-colors">
                                {card.title}
                            </h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                {card.description}
                            </p>
                        </div>

                        <div className="relative z-10 flex items-center gap-2 text-sm font-bold text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors uppercase tracking-widest bg-gray-50 dark:bg-black/20 w-fit px-4 py-2 rounded-full mt-auto backdrop-blur-sm self-start">
                            Ingresar
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                    </Link>
                ))}
            </div>

            {/* Quick Stats Row (Debajo del Mosaico) */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500">
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="text-4xl font-black text-tdf-blue dark:text-white mb-1">
                        {loading ? <Loader2 className="animate-spin" /> : counts.equipos}
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Equipos</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="text-4xl font-black text-tdf-orange mb-1">
                        {loading ? <Loader2 className="animate-spin" /> : counts.torneos}
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Torneos Activos</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5">
                    <div className="text-4xl font-black text-orange-900 dark:text-white mb-1">
                        {loading ? <Loader2 className="animate-spin" /> : counts.jugadores}
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase">Jugadores</div>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-white/5 flex flex-col justify-between">
                    <div>
                        <div className="text-4xl font-black text-emerald-500 mb-1">OK</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Estado Sistema</div>
                    </div>
                    <button
                        onClick={exportToPDF}
                        disabled={exporting}
                        className="mt-4 flex items-center justify-center gap-2 py-2 px-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-lg disabled:opacity-50"
                    >
                        {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        PORTAL PDF
                    </button>
                </div>
            </div>

        </div>
    )
}
