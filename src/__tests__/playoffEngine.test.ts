import { describe, it, expect } from 'vitest';
import { calculateStandings, AbsoluteTieException, TeamStats, generateCrosses } from '../lib/tiebreakerEngine';

describe('Playoff Tiebreaker Engine', () => {
  it('Ordena equipos correctamente según Partidos Ganados', () => {
    const teams: TeamStats[] = [
      { team_id: '1', matchesWon: 2, points: 5, setsWon: 6, setsLost: 3, pointsWon: 200, pointsLost: 180 },
      { team_id: '2', matchesWon: 3, points: 8, setsWon: 9, setsLost: 2, pointsWon: 250, pointsLost: 150 },
      { team_id: '3', matchesWon: 1, points: 2, setsWon: 4, setsLost: 8, pointsWon: 180, pointsLost: 250 }
    ];
    
    // Debería quedar 2, 1, 3
    const result = calculateStandings(teams);
    expect(result[0].team_id).toBe('2');
    expect(result[1].team_id).toBe('1');
    expect(result[2].team_id).toBe('3');
  });

  it('Desempata por Puntos cuando Partidos Ganados son idénticos', () => {
    const teams: TeamStats[] = [
      { team_id: 'A', matchesWon: 3, points: 8, setsWon: 9, setsLost: 4, pointsWon: 250, pointsLost: 200 },
      { team_id: 'B', matchesWon: 3, points: 9, setsWon: 9, setsLost: 2, pointsWon: 250, pointsLost: 150 }
    ];
    
    const result = calculateStandings(teams);
    expect(result[0].team_id).toBe('B'); // B tiene más puntos acumulados
  });

  it('Desempata por Cociente de Sets cuando Partidos Ganados y Puntos empatan', () => {
    const teams: TeamStats[] = [
      { team_id: 'X', matchesWon: 3, points: 9, setsWon: 9, setsLost: 4, pointsWon: 260, pointsLost: 200 }, // Cociente: 2.25
      { team_id: 'Y', matchesWon: 3, points: 9, setsWon: 9, setsLost: 3, pointsWon: 260, pointsLost: 200 }  // Cociente: 3.00
    ];
    
    const result = calculateStandings(teams);
    expect(result[0].team_id).toBe('Y'); // Y tiene mejor cociente de sets
  });

  it('Desempata por Cociente de Puntos cuando Sets también son idénticos', () => {
    const teams: TeamStats[] = [
      { team_id: 'T1', matchesWon: 3, points: 9, setsWon: 9, setsLost: 3, pointsWon: 280, pointsLost: 200 }, // Cociente pts: 1.4
      { team_id: 'T2', matchesWon: 3, points: 9, setsWon: 9, setsLost: 3, pointsWon: 300, pointsLost: 200 }  // Cociente pts: 1.5
    ];
    
    const result = calculateStandings(teams);
    expect(result[0].team_id).toBe('T2'); 
  });

  it('LANZA AbsoluteTieException y detiene ejecución en Empate Absoluto y Exacto', () => {
    const teams: TeamStats[] = [
      { team_id: 'Alpha', matchesWon: 3, points: 9, setsWon: 9, setsLost: 3, pointsWon: 250, pointsLost: 200 },
      { team_id: 'Omega', matchesWon: 3, points: 9, setsWon: 9, setsLost: 3, pointsWon: 250, pointsLost: 200 },
      { team_id: 'Beta', matchesWon: 1, points: 3, setsWon: 3, setsLost: 9, pointsWon: 150, pointsLost: 250 }
    ];
    
    expect(() => calculateStandings(teams)).toThrow(AbsoluteTieException);
    
    // Verificar que la excepcion contiene a los culpables
    try {
      calculateStandings(teams);
    } catch (e: any) {
      expect(e).toBeInstanceOf(AbsoluteTieException);
      expect(e.tiedTeams.length).toBe(2);
      expect(['Alpha', 'Omega']).toContain(e.tiedTeams[0].team_id);
    }
  });

  it('Genera llaves estándar (1 vs 4, 2 vs 3)', () => {
    const sortedStandings: TeamStats[] = [
      { team_id: '1', matchesWon: 3, points: 9, setsWon: 9, setsLost: 0, pointsWon: 225, pointsLost: 100 },
      { team_id: '2', matchesWon: 2, points: 6, setsWon: 6, setsLost: 3, pointsWon: 200, pointsLost: 150 },
      { team_id: '3', matchesWon: 1, points: 3, setsWon: 3, setsLost: 6, pointsWon: 150, pointsLost: 200 },
      { team_id: '4', matchesWon: 0, points: 0, setsWon: 0, setsLost: 9, pointsWon: 100, pointsLost: 225 }
    ];

    const crosses = generateCrosses(sortedStandings);
    expect(crosses.length).toBe(2);
    expect(crosses[0].home.team_id).toBe('1');
    expect(crosses[0].away.team_id).toBe('4');
    expect(crosses[1].home.team_id).toBe('2');
    expect(crosses[1].away.team_id).toBe('3');
  });
});
