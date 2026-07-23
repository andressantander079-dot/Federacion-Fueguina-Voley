'use client';

import { Player, TeamSide, SetData } from '@/types/match';
import { getContrastColor } from '@/lib/colorUtils';

// Icono inline de pelota de voley en SVG si no existe localmente
function VolleyballIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10" />
            <path d="M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10" />
            <path d="M2 12h20" />
        </svg>
    );
}

interface CourtViewProps {
    readOnly: boolean;
    currentSetIdx: number;
    sets: SetData[];
    servingTeam: TeamSide | null;
    subHistory: any[];
    fullRosterHome: Player[];
    fullRosterAway: Player[];
    posHome: (Player | null)[];
    posAway: (Player | null)[];
    courtPositionsHome: Map<number, Player | null>;
    courtPositionsAway: Map<number, Player | null>;
    isSidesSwapped: boolean;
    openR5: (team: TeamSide) => void;
    handleJerseyClick: (player: Player, team: TeamSide) => void;
    teamColors?: {
        home: string[];
        away: string[];
    };
}

export function CourtView({
    readOnly,
    currentSetIdx,
    sets,
    servingTeam,
    subHistory,
    fullRosterHome,
    fullRosterAway,
    posHome,
    posAway,
    courtPositionsHome,
    courtPositionsAway,
    isSidesSwapped,
    openR5,
    handleJerseyClick,
    teamColors
}: CourtViewProps) {

    const leftTeam: TeamSide = isSidesSwapped ? 'away' : 'home';
    const rightTeam: TeamSide = isSidesSwapped ? 'home' : 'away';

    const leftPositions = leftTeam === 'home' ? courtPositionsHome : courtPositionsAway;
    const rightPositions = rightTeam === 'home' ? courtPositionsHome : courtPositionsAway;

    const leftRawPos = leftTeam === 'home' ? posHome : posAway;
    const rightRawPos = rightTeam === 'home' ? posHome : posAway;

    const currentSet = sets[currentSetIdx];

    const Jersey = ({ player, team, isPos1 }: { player: Player | null; team: TeamSide; isPos1?: boolean }) => {
        if (!player) {
            return (
                <div className="relative flex flex-col items-center">
                    <div className="w-16 h-14 flex items-center justify-center rounded-xl border-dashed border-2 border-slate-300 bg-slate-50/50">
                        <span className="font-bold text-[10px] text-slate-400 -rotate-12">VACANTE</span>
                    </div>
                </div>
            );
        }

        const isServing = servingTeam === team && isPos1;
        
        let mainColorClass = "";
        let inlineStyle: React.CSSProperties = {};

        if (player.isLibero) {
            // Líbero mantiene su color contrastante reglamentario de la FIVB
            mainColorClass = 'bg-purple-100 border-purple-400 text-purple-900 shadow-purple-200/50';
        } else {
            const primaryColor = team === 'home' ? (teamColors?.home[0] || '#E11D48') : (teamColors?.away[0] || '#2563EB');
            const contrastColor = getContrastColor(primaryColor);
            inlineStyle = {
                backgroundColor: primaryColor,
                borderColor: primaryColor,
                color: contrastColor
            };
        }

        const teamSubHistory = subHistory.filter(s => s.team === team && !s.isLiberoAction);
        const lastAction = teamSubHistory.filter(s => s.playerInId === player.id).pop();
        
        let subOutNumber: number | null = null;
        if (lastAction) {
            const fullRoster = team === 'home' ? fullRosterHome : fullRosterAway;
            const subOutPlayer = fullRoster.find(p => p.id === lastAction.playerOutId);
            if (subOutPlayer) {
                subOutNumber = subOutPlayer.number;
            }
        }

        return (
            <div 
                onClick={() => !readOnly && handleJerseyClick(player, team)} 
                className={`relative flex flex-col items-center group ${!readOnly ? 'cursor-pointer' : ''}`}
            >
                <div 
                    className={`w-16 h-14 flex items-center justify-center rounded-xl shadow-sm border-b-4 transition-all ${!readOnly ? 'active:scale-95' : ''} ${mainColorClass}`}
                    style={inlineStyle}
                >
                    <span className="font-black text-2xl">{player.number}</span>
                </div>
                {subOutNumber !== null && (
                    <div className="absolute -top-2 -left-2 bg-slate-800 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full shadow-md border-2 border-white z-10">
                        {subOutNumber}
                    </div>
                )}
                {isServing && (
                    <div className="absolute -top-3 -right-2 bg-yellow-400 text-yellow-950 rounded-full p-1.5 shadow-sm border-2 border-white animate-bounce z-10">
                        <VolleyballIcon size={14} className="fill-current" />
                    </div>
                )}
                <span className="mt-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 rounded-full truncate max-w-[70px]">{player.name}</span>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-3xl shadow-lg border-4 border-slate-800 relative aspect-[1.8/1] w-full flex overflow-hidden flex-row">
            <div className="absolute left-1/2 top-0 bottom-0 border-l-[6px] border-dashed border-slate-800 z-10 -ml-[3px]"></div>
            
            {/* Cancha Lado Izquierdo (Red a la derecha) */}
            <div 
                className="relative flex-1 border-slate-200/50 border-r transition-all duration-300"
                style={{ backgroundColor: (leftTeam === 'home' ? (teamColors?.home[0] || '#2563EB') : (teamColors?.away[0] || '#E11D48')) + '0D' }}
            >
                {leftRawPos.filter(p => !!p).length === 0 && currentSet.home === 0 && currentSet.away === 0 && !readOnly && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <button 
                            onClick={() => openR5(leftTeam)} 
                            className="text-white font-black text-sm md:text-xl uppercase px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition border-4 border-white/20"
                            style={{ 
                                backgroundColor: leftTeam === 'home' ? (teamColors?.home[0] || '#2563EB') : (teamColors?.away[0] || '#E11D48'),
                                color: getContrastColor(leftTeam === 'home' ? (teamColors?.home[0] || '#2563EB') : (teamColors?.away[0] || '#E11D48'))
                            }}
                        >
                            R5 {leftTeam === 'home' ? 'Local' : 'Visitante'}
                        </button>
                    </div>
                )}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-4 gap-4">
                    <div className="row-start-1 col-start-2 flex justify-center items-center border-b border-dashed border-slate-300">
                        <Jersey player={leftPositions.get(4) || null} team={leftTeam} />
                    </div>
                    <div className="row-start-2 col-start-2 flex justify-center items-center border-b border-dashed border-slate-300">
                        <Jersey player={leftPositions.get(5) || null} team={leftTeam} />
                    </div>
                    <div className="row-start-3 col-start-2 flex justify-center items-center">
                        <Jersey player={leftPositions.get(6) || null} team={leftTeam} />
                    </div>
                    <div className="row-start-1 col-start-1 flex justify-center items-center border-b border-dashed border-slate-300">
                        <Jersey player={leftPositions.get(3) || null} team={leftTeam} />
                    </div>
                    <div className="row-start-2 col-start-1 flex justify-center items-center border-b border-dashed border-slate-300">
                        <Jersey player={leftPositions.get(2) || null} team={leftTeam} />
                    </div>
                    <div className="row-start-3 col-start-1 flex justify-center items-center">
                        <Jersey player={leftPositions.get(1) || null} team={leftTeam} isPos1={true} />
                    </div>
                </div>
            </div>

            {/* Cancha Lado Derecho (Red a la izquierda) */}
            <div 
                className="relative flex-1 transition-all duration-300"
                style={{ backgroundColor: (rightTeam === 'home' ? (teamColors?.home[0] || '#2563EB') : (teamColors?.away[0] || '#E11D48')) + '0D' }}
            >
                {rightRawPos.filter(p => !!p).length === 0 && currentSet.home === 0 && currentSet.away === 0 && !readOnly && (
                    <div className="absolute inset-0 flex items-center justify-center z-20">
                        <button 
                            onClick={() => openR5(rightTeam)} 
                            className="text-white font-black text-sm md:text-xl uppercase px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 hover:scale-105 active:scale-95 transition border-4 border-white/20"
                            style={{ 
                                backgroundColor: rightTeam === 'home' ? (teamColors?.home[0] || '#2563EB') : (teamColors?.away[0] || '#E11D48'),
                                color: getContrastColor(rightTeam === 'home' ? (teamColors?.home[0] || '#2563EB') : (teamColors?.away[0] || '#E11D48'))
                            }}
                        >
                            R5 {rightTeam === 'home' ? 'Local' : 'Visitante'}
                        </button>
                    </div>
                )}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 p-4 gap-4">
                    <div className="row-start-1 col-start-1 flex justify-center items-center border-b border-dashed border-slate-300">
                        <Jersey player={rightPositions.get(6) || null} team={rightTeam} />
                    </div>
                    <div className="row-start-2 col-start-1 flex justify-center items-center border-b border-dashed border-slate-300">
                        <Jersey player={rightPositions.get(5) || null} team={rightTeam} />
                    </div>
                    <div className="row-start-3 col-start-1 flex justify-center items-center">
                        <Jersey player={rightPositions.get(4) || null} team={rightTeam} />
                    </div>
                    <div className="row-start-1 col-start-2 flex justify-center items-center border-b border-dashed border-slate-300">
                        <Jersey player={rightPositions.get(1) || null} team={rightTeam} isPos1={true} />
                    </div>
                    <div className="row-start-2 col-start-2 flex justify-center items-center border-b border-dashed border-slate-300">
                        <Jersey player={rightPositions.get(2) || null} team={rightTeam} />
                    </div>
                    <div className="row-start-3 col-start-2 flex justify-center items-center">
                        <Jersey player={rightPositions.get(3) || null} team={rightTeam} />
                    </div>
                </div>
            </div>
        </div>
    );
}
