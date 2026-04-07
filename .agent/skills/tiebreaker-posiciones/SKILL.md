---
name: tiebreaker-posiciones
description: Define la lógica estricta universal FIVB para el cálculo de Puntos en Tablas de Posiciones basado en diferencia de sets, y la regla de Set Máximo (Mejor de 3 vs Mejor de 5). Usa esta skill SIEMPRE que programes métricas de torneos o corrijas cálculos de Puntuación.
---

# Lógica Oficial de Posiciones y Sets (FIVB)

## 1. Puntos en la Tabla de Posiciones
Ya NO se utilizan números de set estáticos (como "Si gana 3 sets... o si gana 2 sets"). **El único cálculo válido es por Diferencia de Sets**.
Al procesar un partido finalizado:
1. Validar quién ganó (Home vs Away) usando `m.home_score > m.away_score`.
2. Para otorgar puntos, calcular la diferencia entre ganados y perdidos:
   - **Diferencia de 1 Set Exacto (`setsHome - setsAway === 1` o viceversa):** Es una victoria en Tie-Break (ej. 3-2 en Mayores, ó 2-1 en Inferiores).
     - Ganador: +2 Pts.
     - Perdedor: +1 Pts.
   - **Diferencia mayor a 1 Set:** Es una victoria Clara (ej. 3-0, 3-1, 2-0).
     - Ganador: +3 Pts.
     - Perdedor: +0 Pts.

*Importante: Al implementar en código, utiliza la resta exacta (`Math.abs(setsHome - setsAway) === 1`) para evitar bugs en torneos de 3 sets.*

## 2. Máquina de Estados de Sets (Best of 3 vs Best of 5)
Nunca asumas que todos los partidos llegan a 3 sets. 
- **Sub-12, Sub-13 y Sub-14:** Oficialmente son **AL MEJOR DE 3 (Best of 3)**. Esto significa que **el ganador es el que llega a 2 sets**. Los resultados finales válidos SOLO pueden ser `2-0`, `0-2`, `2-1`, `1-2`. JAMÁS puede haber un `3-0` ni registrarse un tercer set si un equipo ya ganó 2.
- **Sub-16, Sub-18 y Mayores:** Son **AL MEJOR DE 5 (Best of 5)**. El ganador llega a 3 sets (ej. `3-0`, `3-1`, `3-2`).

Si por algún motivo el JSON visual o los árbitros insertan sets posteriores después de alcanzada la condición de victoria matemática del `best_of_sets`, la plataforma debe descartar e ignorar automáticamente esos "Sets amistosos/Fantasma" al momento de tabular métricas.
