---
name: match-validation-rules
description: Reglas de validación estricta para cerrar sets y partidos en voleibol. Define las precondiciones matemáticas (25 puntos, diferencia de 2) para evitar cierres inválidos como 0-0.
---

# Reglas de Validación de Sets y Partidos

## 1. Validación de Cierre de Set
Ningún set puede ser cerrado por el usuario a menos que cumpla matemáticamente con las reglas del vóley:
- **Set Normal (1 a 4):** Un equipo debe tener AL MENOS 25 puntos Y una ventaja de AL MENOS 2 puntos sobre el rival (Ej: 25-23, 26-24).
- **Tie-Break (Set 5 o Set 3):** Un equipo debe tener AL MENOS 15 puntos Y una ventaja de AL MENOS 2 puntos sobre el rival (Ej: 15-13, 16-14).
- **Excepción W.O.:** Si se declara W.O., el sistema adjudicará los sets 25-0 automáticamente.

## 2. Flujo UX de Transición de Sets
- **Paso 1 (Cerrar Set):** Cuando se alcanza el puntaje ganador, el botón 'Cerrar Set' se habilita. Al pulsarlo, el set se marca como `finished = true` PERO la pantalla se mantiene en el set actual para revisión.
- **Paso 2 (Iniciar Siguiente Set):** Solo cuando el set actual está `finished = true`, aparece el botón 'Iniciar Set X'. Al pulsarlo, se incrementa el `currentSetIdx`, se limpian las rotaciones (Regla R5), y se resetean tiempos y conteo de cambios.

## 3. Fin del Partido
El partido termina automáticamente cuando un equipo gana la cantidad requerida de sets:
- **Mejor de 3:** 2 sets ganados.
- **Mejor de 5:** 3 sets ganados.
No permitir seguir sumando sets ni puntos una vez que el partido está matemáticamente definido.
