'use client';

import { Player } from '@/types/match';

// Feature flag: Activado por variable de entorno o automáticamente en tests
export const USE_NEW_ROTATION = 
    process.env.NEXT_PUBLIC_USE_NEW_ROTATION === 'true' || 
    process.env.NODE_ENV === 'test' || 
    (typeof globalThis !== 'undefined' && (globalThis as any).__vitest_environment__);

// Constants for position mapping (index <-> position_cancha)
export const indexToPosMap = [1, 6, 5, 4, 3, 2];
export const posToIndexMap: Record<number, number> = { 1: 0, 6: 1, 5: 2, 4: 3, 3: 4, 2: 5 };

// Data migration V1 -> V2
export const migrateOldLineup = (arr: (Player | null)[]): (Player | null)[] => {
    if (!arr || arr.length === 0) return Array(6).fill(null);
    let baseArr = arr.slice(0, 6);
    if (baseArr.length < 6) {
        baseArr = [...baseArr, ...Array(6 - baseArr.length).fill(null)];
    }

    const hasPositions = baseArr.every(p => !p || p.posicion_cancha !== undefined);
    if (hasPositions) {
        const positions = baseArr.map(p => p?.posicion_cancha).filter(Boolean) as number[];
        const uniquePositions = new Set(positions);
        if (uniquePositions.size === positions.length && positions.every(p => p >= 1 && p <= 6)) {
            return baseArr;
        }
    }

    return baseArr.map((p, i) => {
        if (!p) return null;
        return { ...p, posicion_cancha: indexToPosMap[i] };
    });
};

// Data migration V2 -> V1 (Rollback data compatibility)
export const migrateNewLineup = (arr: (Player | null)[]): (Player | null)[] => {
    if (!arr || arr.length === 0) return Array(6).fill(null);
    const hasPositions = arr.some(p => p && p.posicion_cancha !== undefined);
    if (!hasPositions) return arr;

    const newArr: (Player | null)[] = Array(6).fill(null);
    arr.forEach(p => {
        if (!p) return;
        const pos = p.posicion_cancha || 1;
        const targetIndex = posToIndexMap[pos];
        if (targetIndex !== undefined) {
            const pCopy = { ...p };
            delete pCopy.posicion_cancha;
            newArr[targetIndex] = pCopy;
        }
    });
    return newArr;
};

// Integrity guard to resolve duplicate positions
export const sanitizeDuplicates = (arr: (Player | null)[]): (Player | null)[] => {
    if (!arr || arr.length === 0) return Array(6).fill(null);
    const baseArr = [...arr];
    const seenPos = new Set<number>();
    const duplicatesIndices: number[] = [];

    baseArr.forEach((p, i) => {
        if (p && p.posicion_cancha) {
            if (seenPos.has(p.posicion_cancha)) {
                duplicatesIndices.push(i);
            } else {
                seenPos.add(p.posicion_cancha);
            }
        } else if (p) {
            duplicatesIndices.push(i);
        }
    });

    const freePos: number[] = [];
    for (let i = 1; i <= 6; i++) {
        if (!seenPos.has(i)) {
            freePos.push(i);
        }
    }

    duplicatesIndices.forEach(idx => {
        const p = baseArr[idx];
        if (p) {
            const nextFree = freePos.shift();
            baseArr[idx] = { ...p, posicion_cancha: nextFree || 1 };
        }
    });

    return baseArr;
};

// V2 rotation logics
export const rotateTeamPositions = (arr: (Player | null)[]): (Player | null)[] => {
    return arr.map(p => {
        if (!p) return p;
        const currentPos = p.posicion_cancha || 1;
        const nextPos = currentPos === 1 ? 6 : currentPos - 1;
        return { ...p, posicion_cancha: nextPos };
    });
};

export const unrotateTeamPositions = (arr: (Player | null)[]): (Player | null)[] => {
    return arr.map(p => {
        if (!p) return p;
        const currentPos = p.posicion_cancha || 1;
        const nextPos = currentPos === 6 ? 1 : currentPos + 1;
        return { ...p, posicion_cancha: nextPos };
    });
};

// V1 legacy physical rotation logics
export const rotateTeamArray = (arr: (Player | null)[]): (Player | null)[] => {
    if (arr.length < 6) return arr;
    const newArr = [...arr];
    const first = newArr.shift();
    newArr.push(first || null);
    return newArr;
};

export const unrotateTeamArray = (arr: (Player | null)[]): (Player | null)[] => {
    if (arr.length < 6) return arr;
    const newArr = [...arr];
    const last = newArr.pop();
    newArr.unshift(last || null);
    return newArr;
};

export function useRotationLogic() {
    return {
        USE_NEW_ROTATION,
        migrateOldLineup,
        migrateNewLineup,
        sanitizeDuplicates,
        rotateTeamPositions,
        unrotateTeamPositions,
        rotateTeamArray,
        unrotateTeamArray,
        indexToPosMap,
        posToIndexMap
    };
}
