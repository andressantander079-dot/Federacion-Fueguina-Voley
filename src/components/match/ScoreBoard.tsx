import { Minus, Plus } from 'lucide-react';

interface ScoreBoardProps {
    homeScore: number;
    awayScore: number;
    homeName: string;
    awayName: string;
    servingTeam: 'home' | 'away' | null;
    onAddPoint: (team: 'home' | 'away') => void;
    onSubPoint?: (team: 'home' | 'away') => void; // Para correcciones
}

export default function ScoreBoard({
    homeScore, awayScore, homeName, awayName, servingTeam, onAddPoint
}: ScoreBoardProps) {
    return (
        <div className="grid grid-cols-2 gap-4 w-full max-w-4xl mx-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-xl overflow-hidden border border-gray-200 dark:border-white/10">

            {/* LOCAL */}
            <div className={`p-6 flex flex-col items-center justify-center relative transition-colors duration-300 ${servingTeam === 'home' ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                <h3 className="text-xl font-bold text-gray-500 uppercase tracking-widest mb-4">{homeName}</h3>
                <div className="text-[8rem] leading-none font-black text-slate-800 dark:text-white tabular-nums tracking-tighter">
                    {homeScore}
                </div>
                {servingTeam === 'home' && (
                    <div className="absolute top-4 right-4 animate-pulse">
                        <span className="bg-tdf-orange text-white text-xs font-bold px-2 py-1 rounded-full">SAQUE</span>
                    </div>
                )}
                <div className="mt-8 flex gap-4">
                    <button
                        onClick={() => onAddPoint('home')}
                        className="w-20 h-20 bg-tdf-blue hover:bg-blue-700 text-white rounded-2xl flex items-center justify-center shadow-lg transform active:scale-95 transition"
                    >
                        <Plus size={40} strokeWidth={3} />
                    </button>
                    {/* Botón Restar pequeño para correcciones */}
                    {/* <button className="w-12 h-12 bg-gray-100 text-gray-400 rounded-xl flex items-center justify-center hover:bg-red-100 hover:text-red-500"><Minus size={20} /></button> */}
                </div>
            </div>

            {/* VISITA */}
            <div className={`p-6 flex flex-col items-center justify-center relative transition-colors duration-300 ${servingTeam === 'away' ? 'bg-orange-50 dark:bg-orange-900/20' : ''}`}>
                <h3 className="text-xl font-bold text-gray-500 uppercase tracking-widest mb-4">{awayName}</h3>
                <div className="text-[8rem] leading-none font-black text-slate-800 dark:text-white tabular-nums tracking-tighter">
                    {awayScore}
                </div>
                {servingTeam === 'away' && (
                    <div className="absolute top-4 right-4 animate-pulse">
                        <span className="bg-tdf-orange text-white text-xs font-bold px-2 py-1 rounded-full">SAQUE</span>
                    </div>
                )}
                <div className="mt-8 flex gap-4">
                    <button
                        onClick={() => onAddPoint('away')}
                        className="w-20 h-20 bg-tdf-orange hover:bg-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg transform active:scale-95 transition"
                    >
                        <Plus size={40} strokeWidth={3} />
                    </button>
                </div>
            </div>
        </div>
    );
}
