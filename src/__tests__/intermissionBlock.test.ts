import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVolleyMatch } from '../hooks/useVolleyMatch';

describe('useVolleyMatch - Bloqueo de Puntuación durante el Descanso', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('addPoint y subtractPoint deben bloquearse durante el descanso y desbloquearse al pasar los 180 segundos', () => {
        const { result, rerender } = renderHook(() => useVolleyMatch({
            sets: [{ number: 1, home: 24, away: 24, finished: false }],
            currentSetIdx: 0,
            intermissionStartAt: Date.now() // Descanso iniciado justo ahora
        }));

        // 1. Verificar que isScoringBlocked es verdadero inicialmente
        expect(result.current.isScoringBlocked).toBe(true);

        // 2. Intentar sumar y restar puntos. Deben ser rechazados
        act(() => {
            result.current.addPoint('home');
        });
        expect(result.current.sets[0].home).toBe(24);

        act(() => {
            result.current.subtractPoint('home');
        });
        expect(result.current.sets[0].home).toBe(24);

        // 3. Adelantar el reloj 179 segundos (el descanso sigue activo)
        act(() => {
            vi.advanceTimersByTime(179000);
        });
        rerender();
        expect(result.current.isScoringBlocked).toBe(true);

        act(() => {
            result.current.addPoint('home');
        });
        expect(result.current.sets[0].home).toBe(24);

        // 4. Adelantar 2 segundos más (total 181 segundos, descanso expirado)
        act(() => {
            vi.advanceTimersByTime(2000);
        });
        rerender();
        expect(result.current.isScoringBlocked).toBe(false);

        // Ahora sí debe permitir sumar puntos
        act(() => {
            result.current.addPoint('home');
        });
    });
});
