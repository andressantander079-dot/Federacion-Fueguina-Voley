---
name: official-match-sheet-persistence
description: Reglas de persistencia inmutable en la planilla oficial de juego (OfficialMatchSheet.tsx y useVolleyMatch.ts). Garantiza que la configuración de camisetas elegida por el árbitro perdure sin borrarse en los auto-guardados.
---

# Official Match Sheet Persistence & Auto-Save Rules

## 📌 Principios de Garantía de Datos

En la planilla digital de arbitraje, la persistencia debe ser inmutable y tolerante a fallos de red. Ninguna operación de anotación de puntos, rotación de alineación o sanción disciplinaria debe desconfigurar la meta-información del partido.

---

## 🛑 Regla de Oro N° 1: Inclusión Obligatoria de `teamColors` en Auto-Guardados

- **EL PROBLEMA HISTÓRICO:** Cuando la mesa de control realizaba auto-guardado en tiempo real al sumar o restar puntos, si la estructura enviada a Supabase omitía `teamColors`, la propiedad `sheet_data.teamColors` en la base de datos se sobreescribía con `undefined`.
- **REGLA MANDATORIA:** Todo objeto de estado generado para guardar en Supabase (`currentSheetData`, `allCurrentData()`, o `finalSheetData`) **DEBE INCLUIR** explícitamente:
  ```typescript
  teamColors: localTeamColors
  ```

---

## 🛠️ Estructura Estándar de Auto-Guardado (`OfficialMatchSheet.tsx`)

```typescript
const currentSheetData = {
    sets_history: sets,
    final_score: { home: sets[currentSetIdx].home, away: sets[currentSetIdx].away },
    roster_home: [...posHome, ...benchHome].filter(p => !!p).map(p => ({ number: p!.number, name: p!.name })),
    roster_away: [...posAway, ...benchAway].filter(p => !!p).map(p => ({ number: p!.number, name: p!.name })),
    staff,
    signatures,
    observations,
    current_set_idx: currentSetIdx,
    pos_home: posHome,
    pos_away: posAway,
    bench_home: benchHome,
    bench_away: benchAway,
    serving_team: servingTeam,
    blocked_players: blockedPlayers,
    sanctionsLog,
    intermission_start_at: intermissionStartAt,
    teamColors: localTeamColors, // MANDATORIO PARA PERPETUAR LOS KITS
    metadata: {
        category: teamsInfo?.category || 'Voley',
        competition: 'Torneo Oficial',
        bestOfSets
    }
};
```

---

## 🛠️ Archivos Clave
- `src/components/match/OfficialMatchSheet.tsx`
- `src/hooks/useVolleyMatch.ts`
- `src/app/admin/actions/liveMatchActions.ts`
