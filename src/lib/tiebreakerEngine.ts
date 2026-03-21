export interface TeamStats {
  team_id: string;
  name?: string;
  matchesWon: number;
  points: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
}

export class AbsoluteTieException extends Error {
  public tiedTeams: TeamStats[];

  constructor(tiedTeams: TeamStats[]) {
    super("Empate Absoluto: Intervención Manual Requerida");
    this.name = "AbsoluteTieException";
    this.tiedTeams = tiedTeams;
  }
}

/**
 * Motor de Desempate y Cruces de Voleibol (Play-Offs)
 * Siguiendo estrictamente las reglas definidas en SKILL.md.
 */
export function calculateStandings(teams: TeamStats[]): TeamStats[] {
  // Clonar array para no mutar original
  const sorted = [...teams].sort((a, b) => {
    // 1. Partidos Ganados
    if (a.matchesWon !== b.matchesWon) {
      return b.matchesWon - a.matchesWon; // Mayor a Menor
    }

    // 2. Puntos Acumulados
    if (a.points !== b.points) {
      return b.points - a.points;
    }

    // 3. Diferencia/Cociente de Sets
    const getSetQuotient = (t: TeamStats) => t.setsLost === 0 ? (t.setsWon === 0 ? 0 : 9999) : t.setsWon / t.setsLost;
    const sqA = getSetQuotient(a);
    const sqB = getSetQuotient(b);
    
    // Usar epsilon para problemas de flotantes en JS
    if (Math.abs(sqA - sqB) > 0.0001) {
      return sqB - sqA;
    }

    // 4. Diferencia/Cociente de Puntos
    const getPointQuotient = (t: TeamStats) => t.pointsLost === 0 ? (t.pointsWon === 0 ? 0 : 9999) : t.pointsWon / t.pointsLost;
    const pqA = getPointQuotient(a);
    const pqB = getPointQuotient(b);

    if (Math.abs(pqA - pqB) > 0.0001) {
      return pqB - pqA;
    }

    // Persiste el empate
    return 0; 
  });

  // Chequear por Empates Absolutos Matemáticos
  // Como están ordenados, los empates adyacentes pueden colapsar.
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    
    // Mismas métricas para a y b
    if (
        a.matchesWon === b.matchesWon &&
        a.points === b.points &&
        Math.abs((a.setsLost === 0 ? (a.setsWon === 0 ? 0 : 9999) : a.setsWon / a.setsLost) - (b.setsLost === 0 ? (b.setsWon === 0 ? 0 : 9999) : b.setsWon / b.setsLost)) <= 0.0001 &&
        Math.abs((a.pointsLost === 0 ? (a.pointsWon === 0 ? 0 : 9999) : a.pointsWon / a.pointsLost) - (b.pointsLost === 0 ? (b.pointsWon === 0 ? 0 : 9999) : b.pointsWon / b.pointsLost)) <= 0.0001
    ) {
        // Encontramos al menos 2 equipos con Empate Absoluto
        // Debemos lanzar la excepción devolviendo todos los que comparten este empate exacto
        const tiedGroup = sorted.filter(t => 
            t.matchesWon === a.matchesWon &&
            t.points === a.points &&
            Math.abs((t.setsLost === 0 ? (t.setsWon === 0 ? 0 : 9999) : t.setsWon / t.setsLost) - (a.setsLost === 0 ? (a.setsWon === 0 ? 0 : 9999) : a.setsWon / a.setsLost)) <= 0.0001 &&
            Math.abs((t.pointsLost === 0 ? (t.pointsWon === 0 ? 0 : 9999) : t.pointsWon / t.pointsLost) - (a.pointsLost === 0 ? (a.pointsWon === 0 ? 0 : 9999) : a.pointsWon / a.pointsLost)) <= 0.0001
        );
        throw new AbsoluteTieException(tiedGroup);
    }
  }

  return sorted;
}

/**
 * Generador de Cruces Estándar (El 1° contra el Último, 2° contra Penúltimo, etc.)
 */
export function generateCrosses(standings: TeamStats[]): { home: TeamStats, away: TeamStats }[] {
  const crosses = [];
  const total = standings.length;
  for (let i = 0; i < total / 2; i++) {
    crosses.push({
      home: standings[i],
      away: standings[total - 1 - i]
    });
  }
  return crosses;
}
