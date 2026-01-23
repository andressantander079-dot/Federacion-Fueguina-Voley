export interface Match {
    id: string;
    tournament_id: string;
    category_id?: string;
    home_team_id: string;
    away_team_id: string;
    home_score: number;
    away_score: number;
    set_scores: string[];
    status: 'programado' | 'en_curso' | 'finalizado';
    sheet_data?: {
        sets: MatchSet[];
        current_set_idx: number;
        events: MatchEvent[]; // Log of every point/action
        config: {
            sets_to_win: number; // 3 or 2
            points_per_set: number; // 25
            tie_break_points: number; // 15
        };
    };
    created_at: string;

    // Joined fields (optional because they depend on the query)
    home_team?: { name: string; shield_url?: string };
    away_team?: { name: string; shield_url?: string };
    round?: string;
}

export interface MatchSet {
    set_number: number;
    home_points: number;
    away_points: number;
    history: PointHistory[];
    start_time?: string;
    end_time?: string;
    winner?: 'home' | 'away';
}

export interface PointHistory {
    team: 'home' | 'away';
    score_snapshot: string; // "1-0"
    timestamp: number;
    player_number?: number; // Who scored
}

export interface MatchEvent {
    type: 'point' | 'timeout' | 'substitution' | 'card';
    team?: 'home' | 'away';
    detail?: string;
    timestamp: number;
}
