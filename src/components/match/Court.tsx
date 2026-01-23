interface CourtProps {
    homeRotation: number[]; // Array de 6 numeros (jugadores) [P1, P6, P5, P4, P3, P2] típicamente, pero simplificado a posiciones 1-6
    awayRotation: number[];
}

export default function Court({ homeRotation, awayRotation }: CourtProps) {
    // Posiciones visuales en Grid 3x2 por lado
    // Lado Izq (Local): Red a la derecha
    // 4 3 2
    // 5 6 1
    // Lado Der (Visita): Red a la izquierda
    // 2 3 4
    // 1 6 5

    // Mapeo simple de Indices del Array -> Posición en Cancha
    // homeRotation[0] = Posición 1 (Saque)
    // homeRotation[1] = Posición 2 (Delantero Der)
    // homeRotation[2] = Posición 3 (Central)
    // ... etc. Depende de cómo guardemos el array.
    // Asumiremos array ordenado por Posición: [Jugador en Pos 1, Jugador en Pos 2, ... Pos 6]

    return (
        <div className="w-full max-w-4xl mx-auto mt-8 bg-tdf-blue-dark/5 p-4 rounded-3xl">
            <h4 className="text-center text-xs font-bold text-gray-400 uppercase mb-4">Rotación en Cancha</h4>

            <div className="relative aspect-[2/1] w-full bg-tdf-orange rounded border-4 border-white shadow-inner flex overflow-hidden">
                {/* LADO LOCAL (Izquierda) */}
                <div className="w-1/2 h-full border-r-2 border-white/50 relative grid grid-cols-3 grid-rows-2">
                    {/* Zona Ataque (3m) */}
                    <div className="absolute right-0 top-0 bottom-0 w-1/3 border-l-2 border-dashed border-white/30 pointer-events-none"></div>

                    {/* Posiciones (Hardcoded logic for standard 6-1 mapping if array is [Pos1, Pos2, Pos3, Pos4, Pos5, Pos6]) */}
                    {/* Fila Arriba: 4, 3, 2 */}
                    <PlayerNode p={homeRotation[3]} pos="4" className="col-start-1 row-start-1" />
                    <PlayerNode p={homeRotation[2]} pos="3" className="col-start-2 row-start-1" />
                    <PlayerNode p={homeRotation[1]} pos="2" className="col-start-3 row-start-1" />

                    {/* Fila Abajo: 5, 6, 1 */}
                    <PlayerNode p={homeRotation[4]} pos="5" className="col-start-1 row-start-2" />
                    <PlayerNode p={homeRotation[5]} pos="6" className="col-start-2 row-start-2" />
                    <PlayerNode p={homeRotation[0]} pos="1" className="col-start-3 row-start-2 is-server" />
                </div>

                {/* RED */}
                <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-white z-10 shadow-lg transform -translate-x-1/2"></div>

                {/* LADO VISITA (Derecha) */}
                <div className="w-1/2 h-full border-l-2 border-white/50 relative grid grid-cols-3 grid-rows-2">
                    {/* Zona Ataque */}
                    <div className="absolute left-0 top-0 bottom-0 w-1/3 border-r-2 border-dashed border-white/30 pointer-events-none"></div>

                    {/* Fila Arriba: 2, 3, 4 */}
                    <PlayerNode p={awayRotation[1]} pos="2" className="col-start-1 row-start-1" />
                    <PlayerNode p={awayRotation[2]} pos="3" className="col-start-2 row-start-1" />
                    <PlayerNode p={awayRotation[3]} pos="4" className="col-start-3 row-start-1" />

                    {/* Fila Abajo: 1, 6, 5 */}
                    <PlayerNode p={awayRotation[0]} pos="1" className="col-start-1 row-start-2 is-server" />
                    <PlayerNode p={awayRotation[5]} pos="6" className="col-start-2 row-start-2" />
                    <PlayerNode p={awayRotation[4]} pos="5" className="col-start-3 row-start-2" />
                </div>
            </div>
        </div>
    )
}

function PlayerNode({ p, pos, className = '' }: { p: number, pos: string, className?: string }) {
    return (
        <div className={`flex items-center justify-center relative ${className}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black border-2 shadow-sm 
                ${className.includes('is-server') ? 'bg-white border-yellow-400 text-black' : 'bg-tdf-blue text-white border-white'}`}>
                {p}
            </div>
            <span className="absolute bottom-2 right-2 text-[10px] text-white/50 font-bold">{pos}</span>
        </div>
    )
}
