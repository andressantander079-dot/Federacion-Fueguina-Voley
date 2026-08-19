'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Eye, FileCheck, Calendar, Download, Lock, AlertCircle, Loader2, CheckCircle2, Clock, ShieldCheck, X } from 'lucide-react';
import MatchSheetViewer from './MatchSheetViewer';
import { formatArgentinaDateNumerical } from '@/lib/dateUtils';
import { parseRoundOrder } from '@/lib/utils/roundParser';
import { buildTournamentCode } from '@/lib/utils/tournamentCode';
import { verifyAdminPasswordAction } from '@/app/admin/actions/verifyAdminAction';
import { useRouter } from 'next/navigation';

interface MatchSheetsTableProps {
    tournamentId?: string;
    categoryId?: string;
    gender?: string;
}

export default function MatchSheetsTable({ tournamentId, categoryId, gender }: MatchSheetsTableProps) {
    const [sheets, setSheets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);
    
    // Auth and Security Modal states
    const [userRole, setUserRole] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string>('');
    const [securityModalMatchId, setSecurityModalMatchId] = useState<string | null>(null);
    const [passwordInput, setPasswordInput] = useState('');
    const [securityError, setSecurityError] = useState<string | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        checkUserRole();
        fetchSheets();
    }, [tournamentId, categoryId, gender]);

    async function checkUserRole() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || '');
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                if (profile) {
                    setUserRole(profile.role);
                }
            }
        } catch (err) {
            console.error("Error checking user role:", err);
        }
    }

    async function fetchSheets() {
        setLoading(true);
        // Consulta inclusiva: Traemos todos los partidos que tengan sheet_data o estén jugados/programados
        let query = supabase
            .from('matches')
            .select(`
                id,
                scheduled_time,
                round,
                home_score,
                away_score,
                sheet_status,
                status,
                home_team:home_team_id(name),
                away_team:away_team_id(name),
                category:categories(name),
                tournament:tournaments!inner(id, name, gender, category_id, season)
            `);

        if (tournamentId) {
            query = query.eq('tournament_id', tournamentId);
        }

        if (categoryId) {
            query = query.eq('category_id', categoryId);
        }

        if (gender) {
            query = query.eq('tournament.gender', gender);
        }

        const { data, error } = await query.order('scheduled_time', { ascending: true });

        if (error) {
            console.error("Detalle del error al cargar planillas:", error.message, error.details, error.hint, error);
        }

        // Ordenamiento natural por Jornada / Playoffs usando parseRoundOrder
        const sortedData = (data || []).sort((a, b) => {
            const orderA = parseRoundOrder(a.round);
            const orderB = parseRoundOrder(b.round);
            if (orderA !== orderB) return orderA - orderB;
            // Orden secundario por fecha
            return new Date(a.scheduled_time || 0).getTime() - new Date(b.scheduled_time || 0).getTime();
        });

        setSheets(sortedData);
        setLoading(false);
    }

    const isAdmin = userRole === 'admin' || userRole === 'superadmin';

    const handleOpenSecurityModal = (matchId: string) => {
        setSecurityModalMatchId(matchId);
        setPasswordInput('');
        setSecurityError(null);
    };

    const handleVerifyPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!securityModalMatchId) return;

        setIsVerifying(true);
        setSecurityError(null);

        try {
            const res = await verifyAdminPasswordAction(passwordInput);
            if (res.success) {
                const matchIdToRedirect = securityModalMatchId;
                setSecurityModalMatchId(null);
                setPasswordInput('');
                router.push(`/referee/partido/${matchIdToRedirect}`);
            } else {
                setSecurityError(res.error || 'Verificación fallida. Verifique la contraseña.');
            }
        } catch (err: any) {
            setSecurityError(err.message || 'Error en la verificación de seguridad.');
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                {/* Header Tabla */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2">
                        <FileCheck className="text-tdf-blue" size={20} /> Planillas de Juego
                    </h3>
                    <span className="text-xs font-bold bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">
                        Total: {sheets.length}
                    </span>
                </div>

                {/* Tabla Responsiva */}
                <div className="overflow-x-auto min-w-[750px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-gray-400 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
                            <tr>
                                <th className="px-3 py-3 md:px-6 md:py-3 whitespace-nowrap">Fecha</th>
                                <th className="px-3 py-3 md:px-6 md:py-3 whitespace-nowrap">Jornada</th>
                                <th className="px-3 py-3 md:px-6 md:py-3">Encuentro</th>
                                <th className="px-3 py-3 md:px-6 md:py-3 text-center">Resultado</th>
                                <th className="px-3 py-3 md:px-6 md:py-3 text-center">Categoría / Código</th>
                                <th className="px-3 py-3 md:px-6 md:py-3 text-center">Estado Planilla</th>
                                <th className="px-3 py-3 md:px-6 md:py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Cargando planillas...</td></tr>
                            ) : sheets.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-gray-400">No hay planillas registradas aún.</td></tr>
                            ) : sheets.map((match) => {
                                const tourName = match.tournament?.name || 'Oficial';
                                const tourGender = match.tournament?.gender || 'femenino';
                                const catName = match.category?.name || 'Sub-14';
                                const tourYear = match.tournament?.season ? parseInt(match.tournament.season, 10) : 2026;
                                
                                const refCode = buildTournamentCode(tourName, tourGender, catName, isNaN(tourYear) ? 2026 : tourYear);
                                const isFemale = tourGender.toLowerCase() === 'femenino';

                                return (
                                    <tr key={match.id} className="hover:bg-gray-50 transition group">
                                        {/* Fecha */}
                                        <td className="px-3 py-4 md:px-6 font-bold text-gray-600 flex items-center gap-2 whitespace-nowrap text-xs md:text-sm">
                                            <Calendar size={14} className="text-gray-300 hidden md:block" />
                                            {formatArgentinaDateNumerical(match.scheduled_time)}
                                        </td>

                                        {/* Jornada */}
                                        <td className="px-3 py-4 md:px-6 whitespace-nowrap">
                                            <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-md text-xs border border-slate-200 inline-block">
                                                {match.round || 'S/F'}
                                            </span>
                                        </td>

                                        {/* Encuentro */}
                                        <td className="px-3 py-4 md:px-6 min-w-[150px]">
                                            <div className="font-black text-gray-800 uppercase text-xs md:text-sm leading-tight">
                                                {match.home_team?.name || 'Local'} <span className="text-gray-300 font-normal mx-1 block md:inline text-[10px] md:text-sm">vs</span> {match.away_team?.name || 'Visita'}
                                            </div>
                                        </td>

                                        {/* Resultado */}
                                        <td className="px-3 py-4 md:px-6 text-center">
                                            <span className="bg-slate-900 text-white px-2 py-1 md:px-3 rounded font-mono font-bold text-xs md:text-sm whitespace-nowrap">
                                                {match.home_score ?? 0} - {match.away_score ?? 0}
                                            </span>
                                        </td>

                                        {/* Categoría / Código Único */}
                                        <td className="px-3 py-4 md:px-6 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-xs font-bold text-gray-700">
                                                    {catName}
                                                </span>
                                                <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                                                    isFemale 
                                                        ? 'bg-pink-50 text-pink-700 border-pink-200' 
                                                        : 'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                    {refCode}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Estado Planilla */}
                                        <td className="px-3 py-4 md:px-6 text-center">
                                            {match.sheet_status === 'submitted' ? (
                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1 rounded-md text-xs inline-flex items-center gap-1 whitespace-nowrap">
                                                    <CheckCircle2 size={13} className="text-emerald-500" /> Firmada / Recibida
                                                </span>
                                            ) : (
                                                <span className="bg-amber-50 text-amber-700 border border-amber-200 font-bold px-2.5 py-1 rounded-md text-xs inline-flex items-center gap-1 whitespace-nowrap">
                                                    <Clock size={13} className="text-amber-500" /> Pendiente de Firma
                                                </span>
                                            )}
                                        </td>

                                        {/* Acciones */}
                                        <td className="px-3 py-4 md:px-6 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-2">
                                                {match.sheet_status === 'submitted' ? (
                                                    <>
                                                        <button
                                                            onClick={() => setSelectedSheetId(match.id)}
                                                            className="bg-tdf-blue text-white hover:bg-blue-600 font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                                                        >
                                                            <Eye size={14} /> Ver Planilla
                                                        </button>
                                                    </>
                                                ) : (
                                                    isAdmin ? (
                                                        <button
                                                            onClick={() => handleOpenSecurityModal(match.id)}
                                                            className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                                                        >
                                                            <ShieldCheck size={14} /> Completar Cierre
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs font-bold text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg inline-block">
                                                            En Proceso / Pendiente
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL VISOR DE PLANILLA */}
            {selectedSheetId && (
                <MatchSheetViewer
                    matchId={selectedSheetId}
                    onClose={() => setSelectedSheetId(null)}
                />
            )}

            {/* MODAL DE VERIFICACIÓN DE SEGURIDAD ADMIN */}
            {securityModalMatchId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative">
                        <button
                            onClick={() => setSecurityModalMatchId(null)}
                            className="absolute top-4 right-4 text-zinc-500 hover:text-white p-2 rounded-full transition"
                        >
                            <X size={18} />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3 text-amber-500">
                                <Lock size={28} />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Verificación de Seguridad</h3>
                            <p className="text-zinc-400 text-xs mt-2 font-medium">
                                Estás a punto de acceder al cierre oficial de planilla. Confirma la contraseña de tu cuenta de Administrador.
                            </p>
                        </div>

                        <form onSubmit={handleVerifyPassword} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                                    Usuario Administrador
                                </label>
                                <input
                                    type="text"
                                    readOnly
                                    value={userEmail}
                                    className="w-full bg-zinc-950/50 border border-zinc-800/80 rounded-xl px-4 py-2.5 text-zinc-400 text-xs font-mono outline-none cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-1">
                                    Contraseña
                                </label>
                                <input
                                    type="password"
                                    value={passwordInput}
                                    onChange={e => setPasswordInput(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-amber-500 outline-none font-bold placeholder-zinc-700 text-sm transition"
                                    placeholder="••••••••"
                                    autoFocus
                                />
                            </div>

                            {securityError && (
                                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex gap-2 items-center text-red-400 text-xs font-bold animate-in fade-in duration-150">
                                    <AlertCircle size={15} className="shrink-0" /> {securityError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSecurityModalMatchId(null)}
                                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition text-xs"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isVerifying}
                                    className="flex-1 py-3 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold transition shadow-lg shadow-amber-900/20 text-xs flex justify-center items-center gap-2"
                                >
                                    {isVerifying && <Loader2 size={15} className="animate-spin" />}
                                    Verificar e Ingresar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}