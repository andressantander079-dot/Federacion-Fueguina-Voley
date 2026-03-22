---
name: voley-scoring-rules
description: Utiliza esta skill SIEMPRE que necesites interactuar con la planilla digital de un partido en vivo. Cárgala para calcular puntos, registrar o deshacer cambios de jugadores, validar rotaciones, aplicar sanciones y gestionar los tiempos muertos (FIVB 2026).
---

# Reglas de la Planilla Digital de Vóley (Máquina de Estados del Partido)

## 1. Puntuación y Sets
- **Configuración:** Al crear el partido, se define si es al mejor de 3 o al mejor de 5 sets.
- **Puntuaje normal:** Los sets se juegan a 25 puntos.
- **Tie-Break:** El set definitivo (3ro o 5to) se juega a 15 puntos. El sistema debe detectarlo automáticamente.
- **Diferencia de 2 (Sin Tope):** Si hay empate en 24-24 (o 14-14 en Tie-Break), el set continúa sin límite de puntos hasta que un equipo logre una diferencia de 2 puntos (ej. 26-24, 30-28).
- **⚠️ REGLA DE CORRECCIÓN (Deshacer Punto):** Si el árbitro resta un punto por error humano, el sistema DEBE revertir el marcador Y revertir la rotación del equipo a la posición exactamente anterior.

## 2. Sustituciones y Líbero
- **Filtro de Deuda (CRÍTICO):** NUNCA permitas el ingreso a la cancha de un jugador que tenga la etiqueta visual "Inhabilitado para jugar" (por deudas de tesorería).
- **Límite de Cambios:** 6 sustituciones por equipo por set. Si se intenta un 7mo cambio, mostrar alerta "Límite alcanzado" pero PERMITIR el cambio si el árbitro confirma (Soft block).
- **Regla de Emparejamiento (Por Categoría):** 
  - Si el partido es categoría Sub-13 o mayor: Control ESTRICTO. Si el Jugador A sale por el B, el Jugador A SOLO puede volver a entrar a la cancha reemplazando al Jugador B.
  - Si el partido es categoría Menor a Sub-13 (ej. Sub-12 o Mini Voley eliminado): Cambios libres.
- **Líbero (Regla 2026):** El líbero PUEDE sacar si se cumplen las condiciones de rotación. Sus entradas/salidas son ilimitadas y no cuentan para el límite de 6 cambios.

## 3. Rotación (Delegación)
- Cada vez que un equipo recupere el saque o sume un punto que implique rotar, **DEBES invocar la skill `@voley-rotation-validator`** para calcular correctamente las posiciones (1 a 6) en la cancha. No intentes calcular la rotación sin esta skill.

## 4. Sanciones e Incidentes
- **Tarjeta Roja:** Suma automáticamente +1 punto al equipo rival y realiza la rotación si corresponde.
- **Expulsión/Descalificación:** Bloquea al jugador/DT afectado. Si el jugador estaba en cancha, el sistema obliga a registrar una sustitución para poder continuar.
- **Suspensión de Partido:** Guarda el estado exacto del partido (puntos, tiempos, rotación) en la base de datos de Supabase para reanudarlo en el futuro.

## 5. Tiempos Muertos y Cierre
- **Tiempos Muertos:** Máximo 2 por equipo por set (Hard block: no permitir un 3ro bajo ninguna circunstancia).
- **Cierre de Set/Partido:** Nunca se cierra automáticamente. Al llegar al puntaje final, se muestra una alerta de victoria, pero requiere que el árbitro presione "Cerrar Set" o "Cerrar Partido" manualmente para permitir correcciones finales.
