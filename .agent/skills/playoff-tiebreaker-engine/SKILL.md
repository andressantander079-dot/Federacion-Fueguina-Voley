---
name: playoff-tiebreaker-engine
description: Ejecuta la lógica de cruces de llaves y aplica las métricas de desempate estándar de voleibol para la generación de Play-Offs. Úsalo SIEMPRE que necesites calcular posiciones, cruces de torneos o desempatar equipos.
---
# Motor de Desempate y Cruces de Voleibol (Play-Offs)

## Objetivo
Calcular las posiciones exactas de los equipos en la tabla general de un torneo de voleibol y generar los cruces precisos para las fases de eliminación directa (Play-Offs).

## Instrucciones de Desempate (Jerarquía Estricta FEVA / FVF)
Cuando ordenes una tabla de posiciones o calcules quién pasa a la siguiente fase, DEBES aplicar las siguientes métricas en este orden exacto:
1. **Puntos Acumulados (PTS):** Clasificador Primario. El equipo con más puntos queda por encima (ej. 26 PTS supera a 25 PTS independientemente de los partidos ganados).
2. **Partidos Ganados (PG):** Si hay empate en puntos acumulados, se define por mayor cantidad de victorias.
3. **Cociente de Sets General (SF / SC):** Si persiste el empate, calcula Sets a Favor divididos Sets en Contra.
4. **Cociente de Tantos General (PF / PC):** Si persiste el empate, calcula Puntos a Favor divididos Puntos en Contra de todos los partidos.
5. **Duelo Directo (Head-to-Head) Agregado:** Si persiste el empate entre dos equipos, se computa la serie mano a mano en Fase Regular (Victorias Directas > Puntos Directos > Cociente Sets Directo > Cociente Tantos Directo).
6. **Diferencia Aritmética de Puntos General (PF - PC):** Si persiste el empate.

## ⚠️ REGLA CRÍTICA: Empate Absoluto
Si después de aplicar TODAS las métricas anteriores (hasta la diferencia de puntos) dos o más equipos tienen un empate EXACTO y ABSOLUTO:
- **DETÉN INMEDIATAMENTE** la generación automática de la llave.
- **NO elijas un ganador al azar.**
- Solicita intervención manual: Muestra un modal o envía una alerta en la UI para que la "Administración" elija manualmente el orden de esos equipos antes de poder continuar con la generación de los cruces.

## Generación de Cruces
Una vez que las posiciones están claras y no hay empates absolutos, genera la llave cruzando a los equipos en formato estándar (ej. El 1° juega contra el último clasificado, el 2° contra el penúltimo, etc.). 

## Restricciones
- Los partidos generados deben crearse con estado oculto (`is_published: false`) hasta que un administrador los apruebe.
