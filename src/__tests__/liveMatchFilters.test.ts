import { describe, it, expect } from 'vitest';
import {
    parseTimestamp,
    getLatestActivityTimestamp,
    LiveMatchCandidate
} from '../components/home/LiveMatchFloater';

describe('Live Match Filters & Activity Timestamp Engine', () => {
    describe('parseTimestamp', () => {
        it('parses valid ISO string to milliseconds', () => {
            const iso = '2026-09-08T15:00:00.000Z';
            const res = parseTimestamp(iso);
            expect(res).toBe(new Date(iso).getTime());
        });

        it('parses valid number to number', () => {
            const num = 1769029305000;
            expect(parseTimestamp(num)).toBe(num);
        });

        it('returns null for null, undefined, empty string or invalid date strings without throwing NaN', () => {
            expect(parseTimestamp(null)).toBeNull();
            expect(parseTimestamp(undefined)).toBeNull();
            expect(parseTimestamp('')).toBeNull();
            expect(parseTimestamp('   ')).toBeNull();
            expect(parseTimestamp('invalid-date')).toBeNull();
            expect(parseTimestamp(-10)).toBeNull();
            expect(parseTimestamp(NaN)).toBeNull();
        });
    });

    describe('getLatestActivityTimestamp', () => {
        it('retrieves the highest timestamp among candidates safely without returning NaN', () => {
            const tOlder = new Date('2026-09-08T10:00:00Z').getTime();
            const tNewer = new Date('2026-09-08T12:00:00Z').getTime();

            const match: LiveMatchCandidate = {
                id: 'm-1',
                status: 'en_curso',
                created_at: '2026-09-08T09:00:00Z',
                scheduled_time: '2026-09-08T10:00:00Z',
                sheet_data: {
                    started_at: '2026-09-08T10:05:00Z',
                    last_point_at: '2026-09-08T12:00:00Z'
                }
            };

            const latest = getLatestActivityTimestamp(match);
            expect(latest).toBe(tNewer);
            expect(isNaN(latest)).toBe(false);
        });

        it('does not crash or return NaN if last_point_at and started_at are null (e.g. 0-0 score)', () => {
            const scheduledIso = '2026-09-08T14:00:00Z';
            const match: LiveMatchCandidate = {
                id: 'm-2',
                status: 'en_curso',
                scheduled_time: scheduledIso,
                created_at: '2026-09-08T13:00:00Z',
                sheet_data: {
                    last_point_at: null,
                    started_at: null,
                    sets_history: []
                }
            };

            const latest = getLatestActivityTimestamp(match);
            expect(latest).toBe(new Date(scheduledIso).getTime());
            expect(isNaN(latest)).toBe(false);
        });

        it('falls back to Date.now() when all candidate timestamps are missing or invalid', () => {
            const match: LiveMatchCandidate = {
                id: 'm-3',
                status: 'en_curso',
                scheduled_time: null,
                created_at: null,
                sheet_data: null
            };

            const before = Date.now();
            const latest = getLatestActivityTimestamp(match);
            const after = Date.now();

            expect(isNaN(latest)).toBe(false);
            expect(latest).toBeGreaterThanOrEqual(before);
            expect(latest).toBeLessThanOrEqual(after);
        });
    });

    describe('Live Match Acceptance Filter Pipeline', () => {
        const MAX_INACTIVE_LIVE_MS = 40 * 60 * 1000; // 40 min
        const MAX_LIVE_WINDOW_MS = 18 * 60 * 60 * 1000; // 18 hours

        const evaluateMatchVisibility = (match: LiveMatchCandidate, now: number): boolean => {
            const sheet = match.sheet_data || {};
            const sets = sheet.sets_history || sheet.sets || [];

            // 1. Cierre deportivo
            const bestOf = sheet.metadata?.bestOfSets || 5;
            const targetSets = Math.ceil(bestOf / 2);
            const setsWonHome = sets.filter((s) => s.finished && ((s.home ?? s.score_home ?? 0) > (s.away ?? s.score_away ?? 0))).length;
            const setsWonAway = sets.filter((s) => s.finished && ((s.away ?? s.score_away ?? 0) > (s.home ?? s.score_home ?? 0))).length;

            if (setsWonHome >= targetSets || setsWonAway >= targetSets) {
                return false;
            }

            // 2. Abandono en juego (>40m sin puntos anotados)
            const lastPointMs = parseTimestamp(sheet.last_point_at);
            if (lastPointMs !== null && (now - lastPointMs > MAX_INACTIVE_LIVE_MS)) {
                return false;
            }

            // 3. Ventana móvil de 18 horas
            const latestActivityMs = getLatestActivityTimestamp(match);
            if (now - latestActivityMs > MAX_LIVE_WINDOW_MS) {
                return false;
            }

            return true;
        };

        it('acepta un partido activo reciente con puntos en los últimos minutos', () => {
            const now = Date.now();
            const match: LiveMatchCandidate = {
                id: 'active-1',
                status: 'en_curso',
                scheduled_time: new Date(now - 1 * 3600 * 1000).toISOString(),
                sheet_data: {
                    last_point_at: new Date(now - 2 * 60 * 1000).toISOString(), // 2 min ago
                    sets_history: [{ number: 1, home: 18, away: 15, finished: false }],
                    metadata: { bestOfSets: 5 }
                }
            };

            expect(evaluateMatchVisibility(match, now)).toBe(true);
        });

        it('acepta un partido recién iniciado con marcador 0-0 sin puntos registrados aún', () => {
            const now = Date.now();
            const match: LiveMatchCandidate = {
                id: 'active-new',
                status: 'en_curso',
                scheduled_time: new Date(now - 15 * 60 * 1000).toISOString(),
                sheet_data: {
                    last_point_at: null,
                    started_at: new Date(now - 5 * 60 * 1000).toISOString(),
                    sets_history: [{ number: 1, home: 0, away: 0, finished: false }],
                    metadata: { bestOfSets: 3 }
                }
            };

            expect(evaluateMatchVisibility(match, now)).toBe(true);
        });

        it('descarta un partido por abandono si pasaron más de 40 minutos desde el último punto', () => {
            const now = Date.now();
            const match: LiveMatchCandidate = {
                id: 'abandoned-in-game',
                status: 'en_curso',
                scheduled_time: new Date(now - 2 * 3600 * 1000).toISOString(),
                sheet_data: {
                    last_point_at: new Date(now - 45 * 60 * 1000).toISOString(), // 45 min ago (> 40 min)
                    sets_history: [{ number: 1, home: 10, away: 8, finished: false }],
                    metadata: { bestOfSets: 5 }
                }
            };

            expect(evaluateMatchVisibility(match, now)).toBe(false);
        });

        it('descarta un partido zombi cuya actividad supera las 18 horas (caso ADEFU 72h)', () => {
            const now = Date.now();
            const match: LiveMatchCandidate = {
                id: 'zombie-72h',
                status: 'en_curso',
                created_at: new Date(now - 72 * 3600 * 1000).toISOString(),
                scheduled_time: new Date(now - 70 * 3600 * 1000).toISOString(),
                sheet_data: {
                    last_point_at: new Date(now - 69 * 3600 * 1000).toISOString(),
                    sets_history: [{ number: 1, home: 25, away: 20, finished: true }],
                    metadata: { bestOfSets: 3 }
                }
            };

            expect(evaluateMatchVisibility(match, now)).toBe(false);
        });

        it('descarta un partido cuyo marcador ya definió el ganador por sets reglamentarios', () => {
            const now = Date.now();
            const match: LiveMatchCandidate = {
                id: 'finished-by-sets',
                status: 'en_curso',
                scheduled_time: new Date(now - 1 * 3600 * 1000).toISOString(),
                sheet_data: {
                    last_point_at: new Date(now - 1 * 60 * 1000).toISOString(),
                    sets_history: [
                        { number: 1, home: 25, away: 20, finished: true },
                        { number: 2, home: 25, away: 18, finished: true }
                    ],
                    metadata: { bestOfSets: 3 } // targetSets = 2, Home ganó 2
                }
            };

            expect(evaluateMatchVisibility(match, now)).toBe(false);
        });
    });
});
