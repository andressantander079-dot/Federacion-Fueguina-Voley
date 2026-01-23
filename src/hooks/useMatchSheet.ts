import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Match, MatchSet, MatchEvent } from '@/types/match';

const INITIAL_POSITIONS = {
    home: [1, 2, 3, 4, 5, 6], // Jugadores en cancha (referencia numérica p/ rotación)
    away: [1, 2, 3, 4, 5, 6]
};

export function useMatchSheet(matchId: string) {
    const [match, setMatch] = useState<Match | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estado volátil (local) del set en curso para UI rápida
    const [currentSet, setCurrentSet] = useState<MatchSet | null>(null);
    const [homeRotation, setHomeRotation] = useState(INITIAL_POSITIONS.home);
    const [awayRotation, setAwayRotation] = useState(INITIAL_POSITIONS.away);
    const [servingTeam, setServingTeam] = useState<'home' | 'away' | null>(null);

    const supabase = createClient();

    const fetchMatch = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('matches')
            .select('*, home_team:home_team_id(name, shield_url), away_team:away_team_id(name, shield_url)')
            .eq('id', matchId)
            .single();

        if (error) {
            console.error(error);
        } else {
            setMatch(data);
            if (data.sheet_data?.current_set_idx !== undefined) {
                // Restaurar estado si ya existe
                // Por ahora simplificado
            }
        }
        setLoading(false);
    }, [matchId]);

    useEffect(() => {
        fetchMatch();
    }, [fetchMatch]);

    // Actions
    const checkSetWinner = (home: number, away: number, setNumber: number) => {
        // Config defaults
        const CONFIG = match?.sheet_data?.config || { sets_to_win: 3, points_per_set: 25, tie_break_points: 15 };

        // Is Tie Break? (Assuming 5th set is tie-break for Best of 5, or 3rd for Best of 3)
        // setNumber is 1-based index here for logic checking?
        // Actually match.sheet_data.current_set_idx is 0-based.
        // Let's assume standard volleyball rules: 5 sets max. Set 5 is tie-break.

        const isTieBreak = setNumber === 5;
        const target = isTieBreak ? CONFIG.tie_break_points : CONFIG.points_per_set;

        if (home >= target && home - away >= 2) return 'home';
        if (away >= target && away - home >= 2) return 'away';
        return null;
    };

    const addPoint = async (team: 'home' | 'away') => {
        if (!currentSet || !match) return;

        // 1. Update Local State (Optimistic)
        const newSet = { ...currentSet };
        if (team === 'home') newSet.home_points++;
        else newSet.away_points++;

        // Add to history
        newSet.history.push({
            team,
            score_snapshot: `${newSet.home_points}-${newSet.away_points}`,
            timestamp: Date.now()
        });

        // 2. Check Set Winner
        const winner = checkSetWinner(newSet.home_points, newSet.away_points, newSet.set_number);

        // 3. Update Match State based on result
        let updatedMatch = { ...match };
        let shouldRotate = false;

        if (winner) {
            newSet.winner = winner;
            newSet.end_time = new Date().toISOString();

            // Update Global Scores
            if (winner === 'home') updatedMatch.home_score++;
            else updatedMatch.away_score++;

            updatedMatch.set_scores = [...updatedMatch.set_scores, `${newSet.home_points}-${newSet.away_points}`];

            // Archive Set
            const previousSets = updatedMatch.sheet_data?.sets || [];
            updatedMatch.sheet_data = {
                ...updatedMatch.sheet_data!,
                sets: [...previousSets, newSet],
                current_set_idx: (updatedMatch.sheet_data?.current_set_idx || 0) + 1
            };

            // Check Match Winner
            const setsToWin = updatedMatch.sheet_data!.config.sets_to_win;
            if (updatedMatch.home_score === setsToWin || updatedMatch.away_score === setsToWin) {
                updatedMatch.status = 'finalizado';
                // TODO: Trigger Match End visual
            } else {
                // Ready for next set
                // We don't auto-start next set to allow for break time
            }

            setCurrentSet(null); // Clear current set UI until initialized again
        } else {
            // Game Continues
            setCurrentSet(newSet);

            // Rotation Logic: If the team satisfying the point wasn't serving, they rotate.
            if (servingTeam && servingTeam !== team) {
                shouldRotate = true;
                rotateTeam(team);
            }
            setServingTeam(team); // Winner of point serves
        }

        setMatch(updatedMatch);

        // 4. Persistence
        await saveGameState(updatedMatch, newSet, winner ? undefined : team);
    };

    const rotateTeam = (team: 'home' | 'away') => {
        if (team === 'home') {
            const rot = [...homeRotation];
            const last = rot.pop();
            if (last) rot.unshift(last);
            setHomeRotation(rot);
        } else {
            const rot = [...awayRotation];
            const last = rot.pop();
            if (last) rot.unshift(last);
            setAwayRotation(rot);
        }
    };

    const saveGameState = async (updatedMatch: Match, activeSet: MatchSet, servingTeam?: 'home' | 'away') => {
        // We persist the entire match object structure that matters for resume
        // In a real optimized app we might just patch 'sheet_data' and 'scores'

        try {
            setSaving(true);
            const { error } = await supabase
                .from('matches')
                .update({
                    home_score: updatedMatch.home_score,
                    away_score: updatedMatch.away_score,
                    set_scores: updatedMatch.set_scores,
                    status: updatedMatch.status,
                    sheet_data: {
                        ...updatedMatch.sheet_data,
                        // If set is in progress, we might want to save it in a "current_set_snapshot" or similar
                        // For now we assume we only save completed sets in 'sets' array
                        // and we might need a way to restore in-progress set if page reload.
                        // Let's save 'current_set_snapshot' in sheet_data for restoration
                        current_set_snapshot: !activeSet.winner ? {
                            ...activeSet,
                            serving_team: servingTeam,
                            rotations: { home: homeRotation, away: awayRotation }
                        } : null
                    }
                })
                .eq('id', updatedMatch.id);

            if (error) throw error;
        } catch (err) {
            console.error("Error saving match state:", err);
        } finally {
            setSaving(false);
        }
    };

    const initializeSet = () => {
        if (!match) return;
        const setNum = (match.set_scores?.length || 0) + 1;

        const newSet: MatchSet = {
            set_number: setNum,
            home_points: 0,
            away_points: 0,
            history: [],
            start_time: new Date().toISOString()
        };

        setCurrentSet(newSet);
        setServingTeam(null); // User must select server to start
    };

    // Restore state effect (simplified)
    useEffect(() => {
        if (match?.sheet_data?.current_set_idx !== undefined) {
            // Logic to restore from snapshot if exists could go here
            // For now we trust the flow
        }
    }, [match]);

    return {
        match,
        loading,
        saving,
        currentSet,
        homeRotation,
        awayRotation,
        servingTeam,
        initializeSet,
        setServingTeam,
        addPoint,
        rotateTeam
    };
}
