---
name: "treasury-calculation-rules"
description: "Define las reglas estrictas para interpretar cada movimiento de Tesorería, previniendo duplicados (DNI) y asegurando el cálculo preciso y en tiempo real del Saldo Actual de la Federación."
---

# Contexto y Objetivo
Esta skill establece las normativas obligatorias para el manejo y cálculo de movimientos en la Tesorería de la Federación de Voleibol Fueguino. Su propósito es garantizar que los ingresos y egresos impacten correctamente en el "Saldo Actual" global y que no existan cobros duplicados por trámites (ej. Inscripción de Jugadores).

# 1. Reglas de Prevención de Duplicados (Fichajes y Trámites)

**A. Actualizaciones vs Altas Nuevas**
- **CEMAD (Fichaje):** Cuando un jugador en estado `activo` (o `pendiente_cemad`) actualiza sus papeles (sube un nuevo certificado médico o foto), **NO** se debe volver a cobrar el arancel de inscripción de 60.000 ARS (o monto correspondiente).
- El sistema debe verificar la condición: `isCemadUpdate = status === 'pendiente_cemad'`. Si esto es verdadero, se omite el impacto en Tesorería.

**B. Verificación por DNI (Doble Barrera)**
- Antes de registrar un `INGRESO` por "Inscripción Jugador", el sistema **DEBE** consultar la tabla `treasury_movements` buscando en la columna `description` el DNI del jugador involucrado (`ilike '%DNI {dni}%'`).
- Si ya existe un registro asociado a ese DNI para ese concepto, se debe cancelar la inserción del nuevo movimiento para evitar la duplicación de fondos irreales en caja.

# 2. Reglas de Cálculo del "Saldo Actual" Global

**A. Suma y Resta Estricta**
- **INGRESO:** Suma al `total_ingresos`.
- **EGRESO:** Suma al `total_egresos` (representando una resta del neto).
- **Saldo Actual:** Se calcula como la diferencia exacta: `globalIn - globalOut`.

**B. Independencia Temporal del Saldo Global**
- A diferencia de los gráficos de rendimiento que se filtran por mes (`Este Mes` vs `Mes Anterior`), el "Saldo Actual de la Federación" debe ser histórico y acumulativo.
- No se debe aplicar ningún filtro de fecha (`gte` / `lte`) al momento de obtener los movimientos para el cálculo del `Saldo Actual`, de lo contrario el monto "desaparecerá" al cambiar de mes o año.

# 3. Flujo de Sincronización UI (Tiempo Real)

**A. Actualización Proactiva (Supabase Realtime)**
- Para que la interfaz refleje inmediatamente cualquier cambio sin recargar la página, se debe mantener una suscripción activa a la tabla `treasury_movements`.
- Al recibir un evento de cambio (`postgres_changes`), se debe volver a disparar la función `fetchStats()` de la vista para recalcular `globalIn`, `globalOut` y reconstruir el `Saldo Actual`.

**B. Manejo de Tipos de Datos**
- Siempre forzar la conversión numérica de los montos obtenidos de la base de datos para evitar concatenaciones de strings (`Number(m.amount) || 0`).

# 4. Auditoría de Movimientos
- Todo movimiento insertado debe llevar una `description` clara que incluya:
  1. Nombre del concepto (Ej. Inscripción Jugador, Trámite Pase).
  2. Nombre del individuo (Ej. Juan Perez).
  3. Identificador único verificable (Ej. DNI 12345678, o Código de Trámite).
  4. Entidad/Club responsable (Ej. Club AEP).

# 5. Visualización y UI/UX (Dashboard de Tesorería)

**A. Formateo de Fechas en Registros Históricos**
- Los historiales o "Detalles de Movimientos" deben mostrar explícitamente el día de la semana, la fecha y la hora en que la Federación impactó el movimiento, de manera clara.
- **Formato Estándar:** `Lunes, 15/05/2026 - 11:30 p.m.` (Implementado vía `toLocaleDateString` con `weekday: 'long'`).

**B. Prevención de Overlaps (Superposición de Capas CSS)**
- En dashboards divididos por grillas (ej. `grid-cols-3`), al tener componentes adyacentes de distintas alturas (ej. un Pie Chart a la izquierda y tarjetas de presupuesto a la derecha), **NUNCA** utilices `h-full` en los hijos internos si la columna padre es un flex container con espaciado (`space-y-6` o `gap-6`).
- **Razón:** El `h-full` obligará al elemento a ocupar el 100% de la altura expandida de la grilla principal, lo que empujará a sus componentes hermanos (ej. botón de Carga Rápida) fuera del contenedor y causará que se superpongan encima de las secciones inferiores.
- **Solución:** Utilizar `flex-1` en lugar de `h-full`, y omitir alturas fijas que rompan el cálculo de desbordamiento (overflow) en mobile y desktop.
