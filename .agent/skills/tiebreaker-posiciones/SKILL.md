---
name: tiebreaker-posiciones
description: "Use this when calculating tournament standings, position tables, or points per match in volleyball competitions. Activate for any logic involving set differences, best of 3 vs best of 5 determination, or phantom set validation. Always use when processing finished matches to update team rankings."
---

# Lógica Oficial de Posiciones y Sets (FIVB)

## Use this skill when
- Calculating points for the position table after a match
- Determining if a match is Best of 3 or Best of 5 based on category
- Validating that no phantom sets exist beyond the mathematical winner
- Processing tournament standings or tiebreaker scenarios
- Updating team rankings in the database

## Do not use this skill when
- Managing live match scoring (use voley-scoring-rules)
- Creating playoff brackets (use playoff-tiebreaker-engine)
- Managing DT registrations (use dt-management-workflow)
- Working on UI components (use buenas-practicas-fvf)

## 1. Puntos en la Tabla de Posiciones

**Ya NO se utilizan números de set estáticos** (como "Si gana 3 sets...").  
**El único cálculo válido es por Diferencia de Sets.**

### Al procesar un partido finalizado:

1. Validar ganador: `m.home_score > m.away_score` → Home ganó, else Away ganó.

2. Calcular diferencia de sets: `Math.abs(setsHome - setsAway)`.

| Diferencia | Tipo de Victoria | Ganador | Perdedor |
|---|---|---|---|
| **1 set exacto** | Tie-Break (ej: 3-2, 2-1) | **+2 pts** | **+1 pt** |
| **> 1 set** | Clara (ej: 3-0, 3-1, 2-0) | **+3 pts** | **+0 pts** |

```typescript
// ✅ CORRECTO: Usar resta exacta
const diff = Math.abs(setsHome - setsAway);
let winnerPoints = 0;
let loserPoints = 0;

if (diff === 1) {
    winnerPoints = 2;
    loserPoints = 1;
} else {
    winnerPoints = 3;
    loserPoints = 0;
}

// ❌ INCORRECTO: Números estáticos
if (setsHome === 3 && setsAway === 2) { 
    // No escalaría a Best of 3 (ej. marcador 2-1)
}
```
