---
name: voley-scoring-rules
description: "Use this when working with the live digital match sheet, scoring points, registering or undoing player substitutions, validating rotations, applying sanctions, or managing timeouts in a volleyball match. Activate for any real-time match operation including point scoring, set closure, R5 formation, or referee decisions."
---

# Reglas de la Planilla Digital de Vóley (Máquina de Estados del Partido)

## Use this skill when
- Scoring or undoing points in a live match
- Managing player substitutions (regular or libero)
- Validating R5 rotations and court positions
- Applying sanctions (yellow, red, expulsion, disqualification)
- Managing timeouts per set
- Closing sets or matches manually
- Handling match suspension and resumption
- Any operation that affects the match state in real-time

## Do not use this skill when
- Calculating tournament standings or playoff brackets (use playoff-tiebreaker-engine)
- Managing team registrations or DT transfers (use dt-management-workflow)
- Designing UI components or responsive layouts (use buenas-practicas-fvf)
- Working with database schemas or RLS policies (use buenas-practicas-fvf)

## 1. Puntuación y Sets

### Configuración Inicial
- Al crear el partido, se define si es **Best of 3** (Sub-12, Sub-13, Sub-14 en lo general pero puede ser extendido por el administrador) o **Best of 5** (Sub-16, Sub-18, Mayores en lo general pero puede ser reducido por el administrador).
- Sets normales: **25 puntos**.
- Tie-break (set decisivo): **15 puntos**.
- **Diferencia de 2 sin tope:** Si hay empate 24-24 (o 14-14 en tie-break), el set continúa indefinidamente hasta que exista una diferencia de 2 puntos.

### ⚠️ REGLA DE CORRECCIÓN (Deshacer Punto) — CRÍTICA
Si el árbitro resta un punto por error humano, el sistema **DEBE**:
1. Revertir el marcador.
2. **Revertir la rotación del equipo a la posición exactamente anterior**.
3. Restaurar el saque al equipo que lo tenía antes del punto.

**Validación:** El undo debe ser idempotente — ejecutar undo dos veces seguidas no debe dejar el estado más atrás del punto anterior.

---

## 2. Sustituciones y Líbero

### Filtro de Deuda (CRÍTICO)
**NUNCA** permitir el ingreso a la cancha de un jugador con etiqueta visual **"Inhabilitado para jugar"** (deudas de tesorería).

### Límite de Cambios
- **6 sustituciones por equipo por set**.
- Intento de 7mo cambio: mostrar alerta **"Límite alcanzado"** pero **PERMITIR** si el árbitro confirma (soft block).

### Regla de Emparejamiento (Por Categoría)
| Categoría | Control |
|---|---|
| Sub-13 o mayor | **ESTRICTO:** Si Jugador A sale por B, A solo puede volver reemplazando a B |
| Sub-12 o menor | **Libre:** Cambios sin restricción de emparejamiento |

### Líbero (Regla 2026)
- **PUEDE sacar** si se cumplen condiciones de rotación.
- Entradas/salidas **ilimitadas**.
- **NO cuenta** para el límite de 6 cambios.
- No puede ser capitán ni realizar sustituciones regulares.

---

## 3. Rotación (Delegación OBLIGATORIA)

### ⚠️ REGLA CRÍTICA: Trigger de Rotación FIVB
**La rotación ocurre SOLO cuando el equipo que TIENE el saque GANA el punto.**

| Escenario | ¿Rota? | ¿Quién rota? |
|---|---|---|
| Equipo con saque gana punto | ❌ NO | Ninguno |
| Equipo con saque pierde punto (side-out) | ✅ SÍ | El equipo que **GANÓ** el punto (obtiene el saque) |
| Equipo sin saque gana punto | ✅ SÍ | El equipo que **GANÓ** el punto (obtiene el saque) |
| Equipo sin saque pierde punto | ❌ NO | Ninguno |

*Nota aclaratoria: La regla oficial establece que cuando el equipo receptor (el que no tenía el saque) gana el derecho a sacar (gana el punto), sus jugadores deben rotar una posición en el sentido de las agujas del reloj antes de efectuar el saque.*

**Sentido de rotación:** CLOCKWISE (horario) — P1→P6→P5→P4→P3→P2→P1.

**Implementación:** Usar `posicion_cancha` como propiedad inmutable del jugador. El array físico de jugadores NO debe mutar su orden.

```typescript
// ✅ CORRECTO: Mutar propiedad, no array
const rotateTeamPositions = (arr: (Player | null)[]) => {
    return arr.map(p => {
        if (!p) return p;
        const currentPos = p.posicion_cancha || 1;
        const nextPos = currentPos === 1 ? 6 : currentPos - 1; // Clockwise
        return { ...p, posicion_cancha: nextPos };
    });
};

// ❌ INCORRECTO: Mutar array (rompe React reconciliation)
const rotateTeamArray = (arr: (Player | null)[]) => {
    const newArr = [...arr];
    const first = newArr.shift();  // Rompe identidad de componentes
    newArr.push(first);
    return newArr;
};
```
