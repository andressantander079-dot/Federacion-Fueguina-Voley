import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVolleyMatch, Player } from './useVolleyMatch';

// Helper to create mock players with positions
const createMockPlayers = (count: number = 6): Player[] => {
    return Array.from({ length: count }, (_, i) => ({
        id: `player-${i + 1}`,
        name: `Jugador ${i + 1}`,
        number: i + 1,
        posicion_cancha: i + 1 // Inicializado 1 a 6
    }));
};

describe('useVolleyMatch - Lógica de Rotaciones y Saques', () => {
    test('Inicialización de posiciones con posicion_cancha', () => {
        const initialPlayers = createMockPlayers(6);
        const { result } = renderHook(() => useVolleyMatch({
            posHome: initialPlayers,
            posAway: Array(6).fill(null),
            servingTeam: 'home'
        }));

        expect(result.current.posHome).toHaveLength(6);
        expect(result.current.posHome[0]?.posicion_cancha).toBe(1);
        expect(result.current.posHome[5]?.posicion_cancha).toBe(6);
    });

    test('Rotación FIVB - El receptor rota al ganar el punto (Sentido Horario)', () => {
        const initialHome = createMockPlayers(6); // P1..P6 tienen posicion_cancha 1..6
        const initialAway = createMockPlayers(6);

        const { result } = renderHook(() => useVolleyMatch({
            posHome: initialHome,
            posAway: initialAway,
            servingTeam: 'away', // Saca Away
            sets: [{ number: 1, home: 0, away: 0, finished: false }],
            currentSetIdx: 0
        }));

        // Si Home gana el punto, como estaba recibiendo, debe ROTAR
        act(() => {
            result.current.addPoint('home');
        });

        // El marcador debe subir
        expect(result.current.sets[0].home).toBe(1);
        // El saque debe cambiar a Home
        expect(result.current.servingTeam).toBe('home');

        // Los jugadores no deben moverse físicamente del array (inmutabilidad de índices)
        expect(result.current.posHome[0]?.id).toBe('player-1');
        expect(result.current.posHome[1]?.id).toBe('player-2');
        expect(result.current.posHome[5]?.id).toBe('player-6');

        // Pero sus posicion_cancha deben haber rotado en sentido horario:
        // Jugador en posHome[0] (antes posicion_cancha 1) ahora debe ser posicion_cancha 6
        // Jugador en posHome[1] (antes posicion_cancha 2) ahora debe ser posicion_cancha 1 (pasa al saque)
        expect(result.current.posHome[0]?.posicion_cancha).toBe(6);
        expect(result.current.posHome[1]?.posicion_cancha).toBe(1); // Jugador 2 saca
        expect(result.current.posHome[5]?.posicion_cancha).toBe(5);
    });

    test('Rotación FIVB - El servidor NO rota al ganar el punto', () => {
        const initialHome = createMockPlayers(6);
        const { result } = renderHook(() => useVolleyMatch({
            posHome: initialHome,
            servingTeam: 'home', // Saca Home
            sets: [{ number: 1, home: 0, away: 0, finished: false }],
            currentSetIdx: 0
        }));

        // Home saca y gana punto -> Marcador sube pero NO rota
        act(() => {
            result.current.addPoint('home');
        });

        expect(result.current.sets[0].home).toBe(1);
        expect(result.current.posHome[0]?.posicion_cancha).toBe(1);
        expect(result.current.posHome[5]?.posicion_cancha).toBe(6);
    });

    test('Undo revierte la rotación y el saque al estado exacto anterior', () => {
        const initialHome = createMockPlayers(6);
        const initialAway = createMockPlayers(6);

        const { result } = renderHook(() => useVolleyMatch({
            posHome: initialHome,
            posAway: initialAway,
            servingTeam: 'away', // Saca Away
            sets: [{ number: 1, home: 0, away: 0, finished: false }],
            currentSetIdx: 0
        }));

        // Gana punto Home (rota y obtiene saque)
        act(() => {
            result.current.addPoint('home');
        });

        expect(result.current.sets[0].home).toBe(1);
        expect(result.current.posHome[1]?.posicion_cancha).toBe(1); // Rotado

        // Deshacer el punto
        act(() => {
            result.current.subtractPoint('home');
        });

        // Marcador vuelve a 0
        expect(result.current.sets[0].home).toBe(0);
        // Saque vuelve a Away
        expect(result.current.servingTeam).toBe('away');
        // Las posiciones deben revertirse al estado original
        expect(result.current.posHome[0]?.posicion_cancha).toBe(1);
        expect(result.current.posHome[1]?.posicion_cancha).toBe(2);
    });

    test('Sustituciones - El jugador entrante se mantiene en el mismo índice físico y hereda la posicion_cancha', () => {
        const initialHome = createMockPlayers(6);
        const playerIn: Player = { id: 'player-replacement', name: 'Entrante', number: 99 }; // Sin posicion_cancha definida

        const { result } = renderHook(() => useVolleyMatch({
            posHome: initialHome,
            benchHome: [playerIn],
            servingTeam: 'home'
        }));

        // Sustituir al jugador en index 2 (player-3, posicion_cancha 3) por el entrante (player-replacement)
        act(() => {
            result.current.substitutePlayer('home', 'player-3', playerIn);
        });

        // El jugador entrante debe estar físicamente en el index 2 del array posHome
        expect(result.current.posHome[2]?.id).toBe('player-replacement');
        // Debe haber heredado la posicion_cancha = 3
        expect(result.current.posHome[2]?.posicion_cancha).toBe(3);
        // El jugador saliente (player-3) debe haberse ido al banco
        expect(result.current.benchHome).toContainEqual(expect.objectContaining({ id: 'player-3' }));
    });

    test('Prevención de duplicaciones de posicion_cancha', () => {
        // En una confirmación de R5 o asignación, cada jugador debe tener un posicion_cancha único
        const players = createMockPlayers(6);
        // Duplicamos una posición a mano para testear
        players[1].posicion_cancha = 1; // Dos jugadores con posicion_cancha: 1

        const { result } = renderHook(() => useVolleyMatch());

        // Al intentar llamar a setAllState con posiciones duplicadas, la validación interna debería sanearlo o arrojar un warning
        act(() => {
            result.current.setAllState({
                posHome: players
            });
        });

        // El saneador automático de duplicados debería resolverlo re-asignando posiciones válidas únicas
        const positions = result.current.posHome.map(p => p?.posicion_cancha);
        const uniquePositions = new Set(positions);
        expect(uniquePositions.size).toBe(6);
    });
});
