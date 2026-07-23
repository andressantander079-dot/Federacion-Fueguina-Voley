import { describe, it, expect } from 'vitest';
import { useMatchPreflight } from '../hooks/useMatchPreflight';
import { renderHook } from '@testing-library/react';

describe('useMatchPreflight - Verificación Previa al Partido', () => {
    const mockPlayer = (id: string, number: number, position?: number, isCaptain = false) => ({
        id,
        first_name: `Jugador ${number}`,
        last_name: 'Test',
        name: `Jugador ${number} Test`,
        number,
        posicion_cancha: position,
        isCaptain
    });

    it('debe marcar todo listo si todas las condiciones se cumplen', () => {
        const posHome = Array(6).fill(null).map((_, i) => mockPlayer(`h-${i}`, i + 1, i + 1, i === 0));
        const posAway = Array(6).fill(null).map((_, i) => mockPlayer(`a-${i}`, i + 1, i + 1, i === 0));
        
        const { result } = renderHook(() => useMatchPreflight({
            sheet_data: { referees: ['ref-1'] },
            posHome,
            posAway,
            benchHome: [],
            benchAway: [],
            staff: { ref1: 'ref-1' },
            signatures: { dtHome: 'sig-home', dtAway: 'sig-away' }
        }));

        expect(result.current.refereesAssigned).toBe(true);
        expect(result.current.r5Loaded).toBe(true);
        expect(result.current.captainsAssigned).toBe(true);
        expect(result.current.numbersUnique).toBe(true);
        expect(result.current.dtSignatures).toBe(true);
        expect(result.current.isAllDone).toBe(true);
    });

    it('debe fallar si falta algún DT por firmar', () => {
        const posHome = Array(6).fill(null).map((_, i) => mockPlayer(`h-${i}`, i + 1, i + 1, i === 0));
        const posAway = Array(6).fill(null).map((_, i) => mockPlayer(`a-${i}`, i + 1, i + 1, i === 0));

        const { result } = renderHook(() => useMatchPreflight({
            sheet_data: {},
            posHome,
            posAway,
            benchHome: [],
            benchAway: [],
            staff: { ref1: 'ref-1' },
            signatures: { dtHome: 'sig-home' } // Falta dtAway
        }));

        expect(result.current.dtSignatures).toBe(false);
        expect(result.current.isAllDone).toBe(false);
    });

    it('debe fallar si no hay capitán en alguno de los equipos', () => {
        const posHome = Array(6).fill(null).map((_, i) => mockPlayer(`h-${i}`, i + 1, i + 1, false)); // Sin capitán
        const posAway = Array(6).fill(null).map((_, i) => mockPlayer(`a-${i}`, i + 1, i + 1, true));

        const { result } = renderHook(() => useMatchPreflight({
            sheet_data: { referees: ['ref-1'] },
            posHome,
            posAway,
            benchHome: [],
            benchAway: [],
            staff: { ref1: 'ref-1' },
            signatures: { dtHome: 'sig-home', dtAway: 'sig-away' }
        }));

        expect(result.current.captainsAssigned).toBe(false);
        expect(result.current.isAllDone).toBe(false);
    });

    it('debe fallar si hay números de camiseta duplicados en un equipo', () => {
        const posHome = Array(6).fill(null).map((_, i) => mockPlayer(`h-${i}`, i === 1 ? 1 : i + 1, i + 1, i === 0)); // Número 1 duplicado
        const posAway = Array(6).fill(null).map((_, i) => mockPlayer(`a-${i}`, i + 1, i + 1, i === 0));

        const { result } = renderHook(() => useMatchPreflight({
            sheet_data: { referees: ['ref-1'] },
            posHome,
            posAway,
            benchHome: [],
            benchAway: [],
            staff: { ref1: 'ref-1' },
            signatures: { dtHome: 'sig-home', dtAway: 'sig-away' }
        }));

        expect(result.current.numbersUnique).toBe(false);
        expect(result.current.isAllDone).toBe(false);
    });
});
