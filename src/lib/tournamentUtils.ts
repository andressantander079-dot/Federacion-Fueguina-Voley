export type Match = {
    id: string;
    home_team_id: string;
    away_team_id: string;
    home_score: number;
    away_score: number;
    set_scores: string[] | null;
    sheet_data?: any;
    status: string;
    home_team?: { name: string };
    away_team?: { name: string };
};

export type StandingRow = {
    id: string;
    name: string;
    pts: number;
    pg: number;
    pp: number;
    setsW: number;
    setsL: number;
    pW: number;
    pL: number;
};

export function calculateStandings(matches: Match[], pointSystem: string, participants: { id: string, name: string }[]): StandingRow[] {
    const stats: Record<string, StandingRow> = {};

    // Initialize stats for all participants
    participants.forEach(p => {
        stats[p.id] = { id: p.id, name: p.name, pts: 0, pg: 0, pp: 0, setsW: 0, setsL: 0, pW: 0, pL: 0 };
    });

    // Process matches
    matches.forEach(m => {
        // Ensure teams exist in stats (in case they weren't in participants list)
        if (!stats[m.home_team_id]) stats[m.home_team_id] = { id: m.home_team_id, name: m.home_team?.name || 'Unknown', pts: 0, pg: 0, pp: 0, setsW: 0, setsL: 0, pW: 0, pL: 0 };
        if (!stats[m.away_team_id]) stats[m.away_team_id] = { id: m.away_team_id, name: m.away_team?.name || 'Unknown', pts: 0, pg: 0, pp: 0, setsW: 0, setsL: 0, pW: 0, pL: 0 };

        if (m.status !== 'finalizado') return;

        let swHome = 0, swAway = 0, pwHome = 0, pwAway = 0;

        // 1. Try sheet_data.sets_history
        if (m.sheet_data?.sets_history && Array.isArray(m.sheet_data.sets_history)) {
            m.sheet_data.sets_history.forEach((s: any) => {
                if (s.finished !== false) {
                    const h = parseInt(s.home ?? s.score_home ?? s.homeScore ?? 0, 10);
                    const a = parseInt(s.away ?? s.score_away ?? s.awayScore ?? 0, 10);
                    if (h > 0 || a > 0) {
                        pwHome += h; pwAway += a;
                        if (h > a) swHome++; else if (a > h) swAway++;
                    }
                }
            });
        }
        // 2. Try sheet_data.sets
        else if (m.sheet_data?.sets && Array.isArray(m.sheet_data.sets)) {
            m.sheet_data.sets.forEach((s: any) => {
                const h = parseInt(s.homeScore ?? s.home_score ?? s.scoreA ?? 0, 10);
                const a = parseInt(s.awayScore ?? s.away_score ?? s.scoreB ?? 0, 10);
                if (h > 0 || a > 0) {
                    pwHome += h; pwAway += a;
                    if (h > a) swHome++; else if (a > h) swAway++;
                }
            });
        }
        // 3. Try set_scores column
        else if (m.set_scores && Array.isArray(m.set_scores) && m.set_scores.length > 0) {
            m.set_scores.forEach(s => {
                const parts = String(s).split('-');
                if (parts.length === 2) {
                    const h = parseInt(parts[0], 10) || 0;
                    const a = parseInt(parts[1], 10) || 0;
                    pwHome += h; pwAway += a;
                    if (h > a) swHome++; else if (a > h) swAway++;
                }
            });
        }

        // Fallback sets won if swHome & swAway remain 0
        if (swHome === 0 && swAway === 0) {
            swHome = m.home_score || 0;
            swAway = m.away_score || 0;
        }

        const winnerIsHome = swHome > swAway;

        // Update basic stats
        if (stats[m.home_team_id]) {
            stats[m.home_team_id].pg += winnerIsHome ? 1 : 0;
            stats[m.home_team_id].pp += winnerIsHome ? 0 : 1;
            stats[m.home_team_id].setsW += swHome;
            stats[m.home_team_id].setsL += swAway;
            stats[m.home_team_id].pW += pwHome;
            stats[m.home_team_id].pL += pwAway;
        }

        if (stats[m.away_team_id]) {
            stats[m.away_team_id].pg += winnerIsHome ? 0 : 1;
            stats[m.away_team_id].pp += winnerIsHome ? 1 : 0;
            stats[m.away_team_id].setsW += swAway;
            stats[m.away_team_id].setsL += swHome;
            stats[m.away_team_id].pW += pwAway;
            stats[m.away_team_id].pL += pwHome;
        }

        // Points Calculation
        if (pointSystem === 'fivb') {
            const diff = Math.abs(swHome - swAway);
            const winnerPts = diff === 1 ? 2 : 3;
            const loserPts = diff === 1 ? 1 : 0;

            if (winnerIsHome) {
                stats[m.home_team_id].pts += winnerPts;
                stats[m.away_team_id].pts += loserPts;
            } else {
                stats[m.away_team_id].pts += winnerPts;
                stats[m.home_team_id].pts += loserPts;
            }
        } else {
            // Simple System: 2pts win, 1pt loss
            stats[m.home_team_id].pts += winnerIsHome ? 2 : 1;
            stats[m.away_team_id].pts += winnerIsHome ? 1 : 2;
        }
    });

    return Object.values(stats).sort((a, b) => {
        // Jerarquía FIVB Estricta: 1° PG, 2° PTS, 3° Cociente Sets, 4° Cociente Tantos
        if (b.pg !== a.pg) return b.pg - a.pg;     // 1° Partidos Ganados
        if (b.pts !== a.pts) return b.pts - a.pts; // 2° Puntos Acumulados
        const aSetRatio = a.setsL === 0 ? a.setsW : a.setsW / a.setsL;
        const bSetRatio = b.setsL === 0 ? b.setsW : b.setsW / b.setsL;
        if (bSetRatio !== aSetRatio) return bSetRatio - aSetRatio; // 3° Cociente de Sets

        const aPointRatio = a.pL === 0 ? a.pW : a.pW / a.pL;
        const bPointRatio = b.pL === 0 ? b.pW : b.pW / b.pL;
        return bPointRatio - aPointRatio; // 4° Cociente de Tantos
    });
}
