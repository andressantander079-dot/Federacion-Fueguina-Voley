'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Search, User, Shield, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useClubAuth } from '@/hooks/useClubAuth';
import SignaturePad from '@/components/ui/SignaturePad';
import { useSettings } from '@/hooks/useSettings';

export default function SolicitarPasePage() {
    const supabase = createClient();
    const router = useRouter();
    const { clubId, loading: authLoading } = useClubAuth();
    const { settings } = useSettings();

    // Derived Fee value
    const paseFee = settings?.procedure_fees?.find((f: any) => f.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes('pase'))?.price || '0';

    // Search State
    const [dniSearch, setDniSearch] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState('');
    
    // Player State
    const [player, setPlayer] = useState<any>(null);
    
    // Form State
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [signature, setSignature] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dniSearch.trim()) return;

        setIsSearching(true);
        setSearchError('');
        setPlayer(null);

        try {
            // Clean DNI
            const cleanDni = dniSearch.replace(/\D/g, '');

            const { data, error } = await supabase
                .from('players')
                .select(`
                    id, name, dni, category_id, team_id, squad_id,
                    team:teams!team_id(id, name, shield_url),
                    category:categories(name),
                    squad:squads(name)
                `)
                .eq('dni', cleanDni)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    setSearchError('No se encontró ningún jugador con ese DNI en el sistema.');
                } else {
                    throw error;
                }
                return;
            }

            if (data) {
                if (data.team_id === clubId) {
                    setSearchError('Este jugador ya pertenece a tu club.');
                    return;
                }
                
                const catName = Array.isArray(data.category) ? data.category[0]?.name : (data.category as any)?.name;
                const squadName = Array.isArray(data.squad) ? data.squad[0]?.name : (data.squad as any)?.name;
                
                setPlayer({
                    ...data,
                    categoryName: squadName ? `${catName} ${squadName}` : catName,
                    teamName: Array.isArray(data.team) ? data.team[0]?.name : (data.team as any)?.name,
                    teamShield: Array.isArray(data.team) ? data.team[0]?.shield_url : (data.team as any)?.shield_url
                });
            }

        } catch (error: any) {
            console.error("Error buscando jugador:", error);
            setSearchError('Error al contactar con el padrón federal.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSubmitPase = async () => {
        if (!player || !clubId || !acceptedTerms || !signature) return;
        
        setIsSubmitting(true);
        try {
            // Check if there is already a pending pass for this player
            const { data: existingPass, error: checkError } = await supabase
                .from('tramites_pases')
                .select('id')
                .eq('player_id', player.id)
                .not('estado', 'in', '("rechazado", "aprobado")')
                .maybeSingle();
                
            if (checkError) throw checkError;
            
            if (existingPass) {
                alert('Este jugador ya tiene un trámite de pase en curso.');
                setIsSubmitting(false);
                return;
            }

            // Create new Pass Request
            const { error: insertError } = await supabase
                .from('tramites_pases')
                .insert({
                    player_id: player.id,
                    solicitante_club_id: clubId,
                    origen_club_id: player.team_id,
                    estado: 'solicitado',
                    firma_solicitante: signature
                });

            if (insertError) throw insertError;

            setSuccessMessage(`Solicitud de pase iniciada correctamente para ${player.name}. El club de origen ha sido notificado.`);
            
        } catch (error: any) {
            console.error("Error al crear pase:", error);
            alert("No se pudo iniciar el trámite de pase. Inténtalo nuevamente.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (authLoading) return <div className="p-12 text-center text-white">Cargando...</div>;

    if (successMessage) {
        return (
            <div className="min-h-screen bg-zinc-950 font-sans p-6 flex flex-col items-center justify-center">
                <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 text-center shadow-2xl">
                    <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">¡Trámite Iniciado!</h2>
                    <p className="text-zinc-400 mb-8 leading-relaxed">{successMessage}</p>
                    <Link href="/club/tramites" className="inline-block bg-white text-black font-black px-8 py-4 rounded-xl hover:bg-zinc-200 transition">
                        Volver a Trámites
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white font-sans sm:pb-24">
            
            {/* Context Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center gap-4 sticky top-0 z-20">
                <Link href="/club/tramites" className="p-2 hover:bg-zinc-800 rounded-full transition">
                    <ArrowLeft size={20} className="text-zinc-400 hover:text-white" />
                </Link>
                <div>
                    <h1 className="font-black text-xl leading-tight">Solicitar Pase Oficial</h1>
                    <p className="text-xs text-tdf-blue font-bold uppercase tracking-wider">Fase 1: Identificación y Firma</p>
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-6 mt-6">
                
                {/* Paso 1: Busqueda */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-8 shadow-xl">
                    <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-white">
                        <Search className="text-tdf-blue" /> Buscar Jugador/a
                    </h2>
                    
                    <form onSubmit={handleSearch} className="flex gap-4">
                        <input
                            type="text"
                            placeholder="Ingresa el Nro. de DNI (sin puntos)..."
                            value={dniSearch}
                            onChange={(e) => setDniSearch(e.target.value)}
                            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-tdf-blue transition"
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            disabled={!dniSearch || isSearching}
                            className="bg-tdf-blue hover:bg-blue-600 disabled:opacity-50 text-white px-8 py-3 rounded-xl font-black transition flex items-center gap-2"
                        >
                            {isSearching ? <Loader2 size={20} className="animate-spin" /> : 'Buscar'}
                        </button>
                    </form>

                    {searchError && (
                        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-500 text-sm">
                            <AlertCircle size={16} /> {searchError}
                        </div>
                    )}
                </div>

                {/* Paso 2: Ficha del Jugador */}
                {player && (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl animate-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-xl font-bold flex items-center gap-2 mb-6 border-b border-zinc-800 pb-4">
                            <User className="text-tdf-blue" /> Ficha de Identificación
                        </h2>

                        <div className="grid md:grid-cols-2 gap-8 mb-8">
                            <div>
                                <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-1">Nombre Completo</p>
                                <p className="text-2xl font-black text-white leading-tight">{player.name}</p>
                                
                                <div className="mt-4 flex gap-4">
                                    <div>
                                        <p className="text-xs font-bold text-zinc-500 uppercase">DNI</p>
                                        <p className="text-lg font-mono font-bold">{player.dni}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-zinc-500 uppercase">Categoría Padrón</p>
                                        <p className="text-lg font-bold text-tdf-blue">{player.categoryName || 'S/D'}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-zinc-950 rounded-2xl p-6 border border-zinc-800 flex items-center gap-4">
                                <img src={player.teamShield || '/placeholder.png'} className="w-16 h-16 object-contain bg-white rounded-full p-1" alt="Escudo" />
                                <div>
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Club de Origen Actual</p>
                                    <p className="text-lg font-black text-white">{player.teamName}</p>
                                </div>
                            </div>
                        </div>

                        {/* Paso 2.5: Costos y Condiciones BANCARIAS */}
                        <div className="bg-zinc-950 p-6 md:p-8 rounded-2xl border border-zinc-800 mb-8 border-l-4 border-l-tdf-orange">
                            <h3 className="font-bold text-tdf-orange mb-4 flex items-center gap-2">
                                <AlertCircle size={20} /> Arancel Federativo Obligatorio
                            </h3>
                            <div className="grid md:grid-cols-2 gap-6 items-center">
                                <div className="bg-black/50 p-4 rounded-xl border border-zinc-900 border-l-tdf-blue border-l-4">
                                    <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mb-1">Costo Oficial del Trámite</p>
                                    <p className="text-4xl font-black text-white leading-none">$ {parseInt(paseFee).toLocaleString('es-AR')}</p>
                                </div>
                                <div className="text-sm text-zinc-400 space-y-2 relative">
                                    <p className="font-bold text-zinc-300">Deberá transferir a la cuenta de la FVF:</p>
                                    <div className="bg-black/50 p-3 rounded-lg border border-zinc-900">
                                        <p className="font-mono text-white text-xs"><span className="text-zinc-500 uppercase">Alias:</span> {settings?.bank_alias || '-'}</p>
                                        <p className="font-mono text-white text-xs mt-1"><span className="text-zinc-500 uppercase">CBU/CVU:</span> {settings?.bank_cbu || '-'}</p>
                                        <p className="font-mono text-white text-xs mt-1"><span className="text-zinc-500 uppercase">CUIT:</span> {settings?.bank_cuit || '-'}</p>
                                    </div>
                                    <p className="text-xs uppercase tracking-wider italic text-zinc-500 mt-2">* Guarde el comprobante. Se lo requerirán al finalizar.</p>
                                </div>
                            </div>
                        </div>

                        {/* Paso 3: Firma y Condiciones */}
                        <div className="bg-zinc-950 rounded-2xl p-6 md:p-8 border border-zinc-800">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <Shield className="text-green-500" /> Conformidad Oficial
                            </h3>
                            
                            <label className="flex items-start gap-4 cursor-pointer group mb-8">
                                <div className="mt-1">
                                    <input 
                                        type="checkbox" 
                                        checked={acceptedTerms}
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        className="w-5 h-5 rounded border-zinc-700 bg-zinc-900 text-tdf-blue focus:ring-tdf-blue focus:ring-offset-zinc-950"
                                    />
                                </div>
                                <p className="text-sm text-zinc-400 group-hover:text-zinc-300 transition leading-relaxed">
                                    En mi carácter de autoridad del club solicitante, pido formalmente la transferencia de los derechos federativos del jugador detallado. <strong className="text-white">Al firmar asumo la responsabilidad institucional del inicio de este trámite oficial.</strong>
                                </p>
                            </label>

                            <div className={`transition-all duration-500 ${!acceptedTerms ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100'}`}>
                                <SignaturePad 
                                    onSign={(url) => setSignature(url)} 
                                    label="FIRMA INSTITUCIONAL" 
                                />
                                <p className="text-center text-xs font-bold text-zinc-500 mt-3 uppercase tracking-wider">Por favor, firme dentro del recuadro.</p>
                            </div>

                            <button
                                onClick={handleSubmitPase}
                                disabled={!acceptedTerms || !signature || isSubmitting}
                                className="w-full mt-8 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:hover:bg-green-600 text-white font-black py-4 rounded-xl text-lg shadow-[0_0_20px_rgba(22,163,74,0.3)] hover:shadow-[0_0_30px_rgba(22,163,74,0.5)] transition flex justify-center items-center gap-2"
                            >
                                {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : 'Confirmar e Iniciar Solicitud Formal'}
                            </button>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}
