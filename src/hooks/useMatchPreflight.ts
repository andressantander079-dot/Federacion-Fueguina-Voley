'use client';

import { useMemo } from 'react';
import { Player, TeamSide } from '../types/match';

export interface PreflightStatus {
    refereesAssigned: boolean;
    r5Loaded: boolean;
    captainsAssigned: boolean;
    numbersUnique: boolean;
    dtSignatures: boolean;
    isAllDone: boolean;
}

export interface PreflightParams {
    sheet_data: any;
    posHome: (Player | null)[];
    posAway: (Player | null)[];
    benchHome: Player[];
    benchAway: Player[];
    staff: { ref1?: string | null; ref2?: string | null; [key: string]: any };
    signatures: { dtHome?: string | null; dtAway?: string | null; [key: string]: any };
}

export function useMatchPreflight({
    sheet_data,
    posHome,
    posAway,
    benchHome,
    benchAway,
    staff,
    signatures
}: PreflightParams): PreflightStatus {
    return useMemo(() => {
        // 1. Árbitros Asignados
        const refereesAssigned = 
            (Array.isArray(sheet_data?.referees) && sheet_data.referees.length > 0) ||
            !!sheet_data?.staff?.ref1 ||
            !!staff?.ref1;

        // 2. Formación R5 Cargada (6 jugadores posicionados por lado)
        const r5Loaded = 
            posHome.length === 6 &&
            posAway.length === 6 &&
            posHome.every(p => p !== null) &&
            posAway.every(p => p !== null);

        // 3. Capitanes Asignados (Un capitán en cada equipo en planilla)
        const homePlayers = [...posHome, ...benchHome].filter((p): p is Player => p !== null);
        const awayPlayers = [...posAway, ...benchAway].filter((p): p is Player => p !== null);
        const homeCaptain = homePlayers.some(p => p.isCaptain);
        const awayCaptain = awayPlayers.some(p => p.isCaptain);
        const captainsAssigned = homeCaptain && awayCaptain;

        // 4. Números Únicos (Las camisetas deben ser únicas por equipo)
        const homeUnique = new Set(homePlayers.map(p => p.number)).size === homePlayers.length;
        const awayUnique = new Set(awayPlayers.map(p => p.number)).size === awayPlayers.length;
        const numbersUnique = homeUnique && awayUnique;

        // 5. Firmas de Directores Técnicos
        const dtSignatures = 
            !!sheet_data?.dtSignatures ||
            (!!sheet_data?.signatures?.dtHome && !!sheet_data?.signatures?.dtAway) ||
            (!!signatures?.dtHome && !!signatures?.dtAway);

        // 6. Todo Listo
        const isAllDone = refereesAssigned && r5Loaded && captainsAssigned && numbersUnique && dtSignatures;

        return {
            refereesAssigned,
            r5Loaded,
            captainsAssigned,
            numbersUnique,
            dtSignatures,
            isAllDone
        };
    }, [sheet_data, posHome, posAway, benchHome, benchAway, staff, signatures]);
}
