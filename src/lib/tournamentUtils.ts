export type Match = {
    id: string;
    home_team_id: string;
    away_team_id: string;
    home_score: number;
    away_score: number;
    set_scores: string[] | null;
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

        if (m.set_scores && m.set_scores.length > 0) {
            m.set_scores.forEach(s => {
                const parts = s.split('-');
                if (parts.length === 2) {
                    const h = parseInt(parts[0]);
                    const a = parseInt(parts[1]);
                    pwHome += h;
                    pwAway += a;
                    if (h > a) swHome++; else swAway++;
                }
            });
        } else {
            // Fallback if no set scores but final score exists (unlikely in volleyball but safe)
            swHome = m.home_score;
            swAway = m.away_score;
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
            if (winnerIsHome) {
                if (swAway <= 1) stats[m.home_team_id].pts += 3; // 3-0 or 3-1
                else {
                    stats[m.home_team_id].pts += 2; // 3-2
                    stats[m.away_team_id].pts += 1;
                }
            } else {
                if (swHome <= 1) stats[m.away_team_id].pts += 3; // 0-3 or 1-3
                else {
                    stats[m.away_team_id].pts += 2; // 2-3
                    stats[m.home_team_id].pts += 1;
                }
            }
        } else {
            // Simple System: 2pts win, 1pt loss
            stats[m.home_team_id].pts += winnerIsHome ? 2 : 1;
            stats[m.away_team_id].pts += winnerIsHome ? 1 : 2;
        }
    });

    return Object.values(stats).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts; // Main sorting by points
        // Tie-breakers (Ratio Sets, then Ratio Points)
        const aSetRatio = a.setsL === 0 ? a.setsW : a.setsW / a.setsL;
        const bSetRatio = b.setsL === 0 ? b.setsW : b.setsW / b.setsL;
        if (bSetRatio !== aSetRatio) return bSetRatio - aSetRatio;

        const aPointRatio = a.pL === 0 ? a.pW : a.pW / a.pL;
        const bPointRatio = b.pL === 0 ? b.pW : b.pW / b.pL;
        return bPointRatio - aPointRatio;
    });
}
