export interface SetScoreEntry {
  home?: number | string;
  away?: number | string;
  score_home?: number | string;
  score_away?: number | string;
  homeScore?: number | string;
  awayScore?: number | string;
  home_score?: number | string;
  away_score?: number | string;
  scoreA?: number | string;
  scoreB?: number | string;
  finished?: boolean;
}

export interface MatchReference {
  id?: string;
  home_team_id: string;
  away_team_id: string;
  home_score?: number;
  away_score?: number;
  round?: string;
  status: string;
  sheet_data?: {
    sets_history?: SetScoreEntry[];
    sets?: SetScoreEntry[];
    [key: string]: unknown;
  } | null;
  set_scores?: string[] | null;
}

export interface RawStandingInput {
  id?: string;
  team_id?: string;
  name?: string;
  team?: { id?: string; name?: string; shield_url?: string | null };
  shield_url?: string | null;
  pts?: number;
  points?: number;
  pj?: number;
  pg?: number;
  matchesWon?: number;
  pp?: number;
  matchesLost?: number;
  sf?: number;
  setsW?: number;
  setsWon?: number;
  sc?: number;
  setsL?: number;
  setsLost?: number;
  pf?: number;
  pW?: number;
  pointsWon?: number;
  pc?: number;
  pL?: number;
  pointsLost?: number;
}

export interface FederativeStandingRow {
  id: string;
  name: string;
  shield_url: string | null;
  pts: number;
  pj: number;
  pg: number;
  pp: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  setQuotient: number;
  pointQuotient: number;
  pointDiff: number;
}

export interface TeamStats {
  team_id: string;
  name?: string;
  matchesWon: number;
  points: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
  setsW?: number;
  setsL?: number;
  pW?: number;
  pL?: number;
  pg?: number;
  pts?: number;
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
 * Cociente seguro con continuidad numérica.
 * Si el denominador es 0 y el numerador > 0, retorna 999999 + numerador (infinito ordenable).
 */
export function getSafeQuotient(won: number, lost: number): number {
  if (lost === 0) {
    return won > 0 ? 999999 + won : 0;
  }
  return won / lost;
}

/**
 * Determina si un partido corresponde a la Fase Regular del torneo,
 * excluyendo cruces de Play-Offs o eliminatorias.
 */
export function isRegularPhaseMatch(m: MatchReference): boolean {
  if (!m.round) return true;
  const lower = m.round.toLowerCase();
  return (
    !lower.includes('final') &&
    !lower.includes('playoff') &&
    !lower.includes('semifinal') &&
    !lower.includes('cuartos') &&
    !lower.includes('octavos') &&
    !lower.includes('3er')
  );
}

/**
 * Normalizador seguro contra NaN y ausencias de claves.
 */
export function normalizeStandingStats(raw: RawStandingInput): FederativeStandingRow {
  const setsWon = Number(raw.sf ?? raw.setsW ?? raw.setsWon ?? 0);
  const setsLost = Number(raw.sc ?? raw.setsL ?? raw.setsLost ?? 0);
  const pointsWon = Number(raw.pf ?? raw.pW ?? raw.pointsWon ?? 0);
  const pointsLost = Number(raw.pc ?? raw.pL ?? raw.pointsLost ?? 0);
  const pg = Number(raw.pg ?? raw.matchesWon ?? 0);
  const pp = Number(raw.pp ?? raw.matchesLost ?? 0);

  return {
    id: raw.id || raw.team_id || '',
    name: raw.team?.name || raw.name || 'Equipo',
    shield_url: raw.team?.shield_url || raw.shield_url || null,
    pts: Number(raw.pts ?? raw.points ?? 0),
    pj: Number(raw.pj ?? (pg + pp)),
    pg,
    pp,
    setsWon,
    setsLost,
    pointsWon,
    pointsLost,
    setQuotient: getSafeQuotient(setsWon, setsLost),
    pointQuotient: getSafeQuotient(pointsWon, pointsLost),
    pointDiff: pointsWon - pointsLost,
  };
}

/**
 * Resuelve el Duelo Directo (Head-to-Head) agregado en Fase Regular considerando series de Ida y Vuelta.
 * Retorna:
 *  < 0 si 'a' supera a 'b' en el mano a mano
 *  > 0 si 'b' supera a 'a' en el mano a mano
 *    0 si no jugaron o empataron en todos los criterios directos
 */
export function resolveHeadToHead(
  a: FederativeStandingRow,
  b: FederativeStandingRow,
  matches?: MatchReference[]
): number {
  if (!matches || matches.length === 0) return 0;

  // Filtrar exclusivamente enfrentamientos finalizados de FASE REGULAR entre ambos
  const directMatches = matches.filter(
    m =>
      m.status === 'finalizado' &&
      isRegularPhaseMatch(m) &&
      ((m.home_team_id === a.id && m.away_team_id === b.id) ||
       (m.home_team_id === b.id && m.away_team_id === a.id))
  );

  if (directMatches.length === 0) return 0;

  let directWinsA = 0;
  let directWinsB = 0;
  let directPtsA = 0;
  let directPtsB = 0;
  let directSetsA = 0;
  let directSetsB = 0;
  let directPointsWonA = 0;
  let directPointsWonB = 0;

  for (const m of directMatches) {
    const isAHome = m.home_team_id === a.id;
    const setsHome = m.home_score || 0;
    const setsAway = m.away_score || 0;
    const setsA = isAHome ? setsHome : setsAway;
    const setsB = isAHome ? setsAway : setsHome;

    directSetsA += setsA;
    directSetsB += setsB;

    // Calcular victorias y puntos FIVB 3-2-1-0 del partido directo
    if (setsA > setsB) {
      directWinsA++;
      const diffSets = setsA - setsB;
      directPtsA += diffSets === 1 ? 2 : 3;
      directPtsB += diffSets === 1 ? 1 : 0;
    } else if (setsB > setsA) {
      directWinsB++;
      const diffSets = setsB - setsA;
      directPtsB += diffSets === 1 ? 2 : 3;
      directPtsA += diffSets === 1 ? 1 : 0;
    }

    // Tantos por set sin 'any'
    const setsHistory = m.sheet_data?.sets_history || m.sheet_data?.sets;
    if (Array.isArray(setsHistory)) {
      for (const set of setsHistory) {
        const hPoints = Number(set.home ?? set.score_home ?? set.homeScore ?? set.scoreA ?? 0);
        const aPoints = Number(set.away ?? set.score_away ?? set.awayScore ?? set.scoreB ?? 0);
        directPointsWonA += isAHome ? hPoints : aPoints;
        directPointsWonB += isAHome ? aPoints : hPoints;
      }
    }
  }

  // 1. Partidos Ganados Directos
  if (directWinsB !== directWinsA) {
    return directWinsB - directWinsA;
  }

  // 2. Puntos Federativos Directos (ej. ida 3-2 vs vuelta 3-0)
  if (directPtsB !== directPtsA) {
    return directPtsB - directPtsA;
  }

  // 3. Cociente de Sets Directo
  const directSetRatioA = getSafeQuotient(directSetsA, directSetsB);
  const directSetRatioB = getSafeQuotient(directSetsB, directSetsA);
  if (Math.abs(directSetRatioB - directSetRatioA) > 0.0001) {
    return directSetRatioB - directSetRatioA;
  }

  // 4. Cociente de Tantos Directo
  const directPointRatioA = getSafeQuotient(directPointsWonA, directPointsWonB);
  const directPointRatioB = getSafeQuotient(directPointsWonB, directPointsWonA);
  if (Math.abs(directPointRatioB - directPointRatioA) > 0.0001) {
    return directPointRatioB - directPointRatioA;
  }

  return 0;
}

/**
 * Comparador Oficial Federativo Transitivo (FEVA / FVF)
 * 1° Puntos Acumulados (PTS) - Clasificador Primario
 * 2° Partidos Ganados (PG) - Desempate 1
 * 3° Coeficiente de Sets General (SF / SC) - Desempate 2
 * 4° Coeficiente de Tantos General (PF / PC) - Desempate 3
 * 5° Duelo Directo Agregado de Fase Regular - Desempate 4
 * 6° Diferencia Aritmética de Puntos General (PF - PC) - Desempate 5
 * 7° Ancla Determinista Final por Nombre (localeCompare)
 */
export function compareFederativeStandings(
  a: FederativeStandingRow,
  b: FederativeStandingRow,
  matches?: MatchReference[]
): number {
  // 1. Puntos Acumulados (PTS) - Clasificador Primario
  if (b.pts !== a.pts) {
    return b.pts - a.pts;
  }

  // 2. Partidos Ganados (PG) - Desempate 1
  if (b.pg !== a.pg) {
    return b.pg - a.pg;
  }

  // 3. Coeficiente de Sets General (SF / SC) - Desempate 2 (Transitivo continuo)
  if (Math.abs(b.setQuotient - a.setQuotient) > 0.0001) {
    return b.setQuotient - a.setQuotient;
  }

  // 4. Coeficiente de Tantos General (PF / PC) - Desempate 3 (Transitivo continuo)
  if (Math.abs(b.pointQuotient - a.pointQuotient) > 0.0001) {
    return b.pointQuotient - a.pointQuotient;
  }

  // 5. Duelo Directo (Head-to-Head) Agregado de Fase Regular - Desempate 4
  if (matches && matches.length > 0) {
    const h2h = resolveHeadToHead(a, b, matches);
    if (h2h !== 0) return h2h;
  }

  // 6. Diferencia Aritmética de Puntos General (PF - PC) - Desempate 5
  if (b.pointDiff !== a.pointDiff) {
    return b.pointDiff - a.pointDiff;
  }

  // 7. Ancla Determinista Final por Nombre (localeCompare)
  return a.name.localeCompare(b.name);
}

/**
 * Motor de Desempate y Cruces de Voleibol (Play-Offs)
 * Siguiendo estrictamente las reglas oficiales FEVA / FVF.
 */
export function calculateStandings(teams: TeamStats[], matches?: MatchReference[]): TeamStats[] {
  const normalizedMap = new Map<string, FederativeStandingRow>();
  for (const t of teams) {
    normalizedMap.set(t.team_id, normalizeStandingStats(t));
  }

  // Clonar array para no mutar original
  const sorted = [...teams].sort((a, b) => {
    const rowA = normalizedMap.get(a.team_id)!;
    const rowB = normalizedMap.get(b.team_id)!;
    return compareFederativeStandings(rowA, rowB, matches);
  });

  // Chequear por Empates Absolutos Matemáticos
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    const rowA = normalizedMap.get(a.team_id)!;
    const rowB = normalizedMap.get(b.team_id)!;

    const isTie =
      rowA.pts === rowB.pts &&
      rowA.pg === rowB.pg &&
      Math.abs(rowA.setQuotient - rowB.setQuotient) <= 0.0001 &&
      Math.abs(rowA.pointQuotient - rowB.pointQuotient) <= 0.0001 &&
      (matches ? resolveHeadToHead(rowA, rowB, matches) === 0 : true) &&
      rowA.pointDiff === rowB.pointDiff;

    if (isTie) {
      const tiedGroup = sorted.filter(t => {
        const rowT = normalizedMap.get(t.team_id)!;
        return (
          rowT.pts === rowA.pts &&
          rowT.pg === rowA.pg &&
          Math.abs(rowT.setQuotient - rowA.setQuotient) <= 0.0001 &&
          Math.abs(rowT.pointQuotient - rowA.pointQuotient) <= 0.0001 &&
          (matches ? resolveHeadToHead(rowT, rowA, matches) === 0 : true) &&
          rowT.pointDiff === rowA.pointDiff
        );
      });
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
