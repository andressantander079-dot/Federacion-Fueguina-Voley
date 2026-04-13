# Implementación: Match Details Modal en Vista Fixture

Se requiere desarrollar un Modal de Detalles para partidos finalizados en la página pública del Fixture (`/fixture`), manteniendo una experiencia fluida tipo SPA y evitando sobrecargas de red al implementar *Lazy Loading* y manejo de estado a través de la URL.

## User Review Required

> [!IMPORTANT]
> **Modo SPA y Navegación:** El requerimiento de basar el estado en la URL obliga a usar `useRouter` y `useSearchParams` del App Router de Next.js. El modal modificará la ruta empujando transiciones sin recargar (`scroll: false`), lo que interacciona naturalmente con el botón "Atrás" del móvil.

> [!NOTE]
> Estructura de los Sets: Como exploré en el esquema de la base de datos (Supabase), la tabla `matches` embebe los resultados de los parciales (sets) como un arreglo textual en `set_scores` (ej. `['25-23', '18-25', '15-10']`) o internamente dentro de `sheet_data`. Utilizaremos directamente esta columna embebida para el desglose minimalista, con fallback a `sheet_data.sets` si estuviera presente.

---

## Proposed Changes

### Componente Modal Aislado (Lazy Loading)

#### [NEW] `src/components/fixture/MatchDetailsModal.tsx`
Crearemos un componente que será responsable de aislar el *data fetching*. Así garantizamos que el Fixture principal no sufra penalizaciones de rendimiento.

**Estado y Efectos:**
1. Recibe por prop el `matchId`.
2. Al montarse, ejecuta un `useEffect` que consulta Supabase utilizando *Joins* hacia las tablas relacionales:
   ```typescript
   const { data } = await supabase
       .from('matches')
       .select(`
           *,
           home_team:teams!home_team_id(name, shield_url),
           away_team:teams!away_team_id(name, shield_url),
           referee:referees!referee_id(first_name, last_name)
       `)
       .eq('id', matchId)
       .single();
   ```
3. Mientras se resuelve, muestra un elegante `SkeletonLoader` adaptado para fondo oscuro.
4. Escucha eventos del teclado para cerrar con `<kbd>Esc</kbd>`.

**Estructura Visual:**
- **Backdrop**: `fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4`.
- **Top**: Fecha `scheduled_time`, `court_name`.
- **Middle**: Layout dividido en tres columnas (Local, Marcador Central, Visitante). El escudo usará `object-contain` y los textos `truncate`.
- **Desglose de Sets**: Tabla o `flex-row` minimalista renderizando el array `set_scores`.
- **Footer**: Tarjeta gris oscuro mostrando "Árbitro Principal: [Nombre]".

---

### Integración en la Página del Fixture

#### [MODIFY] `src/app/fixture/page.tsx`
Actualizaremos la página para manejar la lógica de estado a través de sus `SearchParams`.

1. **Estado URL:**
   Envolver en `Suspense` si es necesario, y capturar el Query Param instanciando el hook `useSearchParams()` de forma segura.
2. **Disparador del Modal (Trigger):**
   Dentro del *render loop* de la grilla de partidos (líneas ~360):
   ```tsx
   const isMatchFinished = m.status === 'finalizado';
   
   <div 
     onClick={() => isMatchFinished && router.push(`?match_details=${m.id}`, { scroll: false })}
     className={`bg-zinc-900 ... flex ... ${isMatchFinished ? 'cursor-pointer hover:border-tdf-orange/50 transition-all' : ''}`}
   >
      ...
   ```
3. **Inyección del Modal:**
   Al final de la jerarquía (luego del Footer o justo antes del cierre del main):
   ```tsx
   {matchDetailsId && (
       <MatchDetailsModal 
           matchId={matchDetailsId} 
           onClose={() => router.push(pathname, { scroll: false })} 
       />
   )}
   ```

---

## Definiciones de Estilos y Tipografía (UI/UX)
* Toda la vista usará la paleta oscura de la plataforma (`dark:bg-zinc-900`, textos blancos `text-white` o `text-slate-200`).
* Los escudos se mostrarán en círculos pulcros (`w-24 h-24 p-2 bg-white/5 rounded-full ring-1 ring-white/10`).
* El score principal poseerá una fuente *Black* en tamaño de bloque gigante (ej. `text-6xl font-black text-tdf-orange`).

---

## Open Questions

> [!WARNING]
> ¿Tienes previsto tener una tabla separada para Veedores o se puede simplemente agregar la lectura del listado en `match_officials` si quisiéramos listar a toda la mesa de control? Por ahora el plan solo traerá el árbitro principal alojado en `matches.referee_id`.

## Verification Plan

### Manual Verification
- Visualizar todos los torneos terminados.
- Hacer click en una tarjeta de *Finalizado*. Observar que la URL cambia y se abre el Modal con efecto blur; y durante medio segundo se ve el Skeleton Loading.
- Comprobar que en la URL aparece `?match_details={uuid}`.
- Refrescar la página completamente `F5`. Asegurarse que el modal re-hidrata y se muestra abierto.
- Presionar botón "Atrás" en el mouse o teclado y verificar que el Modal cierra suavemente sin dañar el resto del stack.
- Clickar un partido "EN CURSO" y confirmar que **no hace nada**.
