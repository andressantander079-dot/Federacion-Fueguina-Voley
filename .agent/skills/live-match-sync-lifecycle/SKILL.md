---
name: live-match-sync-lifecycle
description: Reglas estrictas para el ciclo de vida del partido en vivo en FVF Voley. Define la sincronización Realtime, invalidación atómica de caché con Server Actions, salida del Home al finalizar y el renderizado del Banner Dorado de Victoria.
---

# Live Match Sync & Lifecycle Engineering (FVF Platform)

## 📌 Principios de Arquitectura

El ciclo de vida del partido en vivo abarca desde el silbatazo inicial en la planilla del árbitro hasta la firma del acta y la remoción automática de la portada de la Federación.

---

## 🛑 Reglas de Oro Obligatorias

### 1. Prohibido Consultar Columnas Inexistentes en Supabase
- **REGLA CRÍTICA:** La tabla `matches` **NO** contiene la columna `updated_at`.
- **Causa de Falla Evitada:** Consultar `updated_at` en `.select()` provoca errores SQL `code 42703 (column matches.updated_at does not exist)`, rompiendo la respuesta Supabase a `data: null` y ocultando el banner de en vivo.
- **Consulta Correcta:**
  ```typescript
  const { data, error } = await supabase
    .from('matches')
    .select('id, created_at, scheduled_time, home_team:teams!home_team_id(name, shield_url), away_team:teams!away_team_id(name, shield_url), sheet_data')
    .in('status', ['live', 'en_curso']);
  ```

### 2. Cierre Atómico de Vivo con Server Actions e Invalidación de Caché
- Realtime WebSocket por sí solo NO purga el Next.js Data Cache del servidor.
- Todo cambio de estado a `'finalizado'` o `'suspendido'` **DEBE** ejecutarse mediante la Server Action `finishLiveMatchAction` en `src/app/admin/actions/liveMatchActions.ts`.
- La Server Action ejecutará de forma atómica:
  ```typescript
  revalidatePath('/');
  revalidatePath('/admin/competencias/[id]', 'page');
  revalidatePath('/partidos');
  revalidatePath(`/vivo/${matchId}`);
  revalidatePath(`/partido/${matchId}`);
  ```

### 3. Escucha de Eventos Realtime Globales en el Home
- En `LiveMatchesBanner.tsx` y `LiveMatchFloater.tsx`, el canal de Supabase Realtime **DEBE** escuchar todos los eventos (`event: '*'`) para procesar cuando un partido pasa de `en_curso` a `finalizado` y removerlo instantáneamente de la portada:
  ```typescript
  const channel = supabase
    .channel('live_matches_banner')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => {
      fetchLiveMatches();
    })
    .subscribe();
  ```

### 4. Transformación Visual al Finalizar Encuentro (`PublicMatchView.tsx`)
- Al cambiar la propiedad `status` a `'finalizado'` o `'finished'`:
  1. El badge superior de la vista se transforma de `🔴 EN VIVO` (rojo animado) a `🏆 FINALIZADO` (dorado).
  2. Se renderiza en la parte superior del marcador el **Banner Dorado de Victoria**:
     ```tsx
     {isFinished && (
       <div className="w-full max-w-4xl bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 border-2 border-amber-500/50 rounded-2xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left shadow-2xl shadow-yellow-500/10 animate-in fade-in zoom-in-95">
         <div className="flex items-center gap-4">
           <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-zinc-950 font-black shadow-lg shrink-0">
             <Trophy size={28} />
           </div>
           <div>
             <span className="text-xs font-black text-yellow-400 uppercase tracking-widest block">Partido Finalizado</span>
             <h3 className="text-xl md:text-2xl font-black text-white leading-tight">
               {winnerName ? <>¡Ganador: <span className="text-yellow-400">{winnerName}</span>!</> : 'Resultado Registrado'}
             </h3>
           </div>
         </div>
         <div className="px-5 py-2.5 bg-zinc-900/80 border border-yellow-500/30 rounded-xl font-mono font-black text-xl text-yellow-400">
           {setsWonHome} - {setsWonAway} SETS
         </div>
       </div>
     )}
     ```

---

## 🛠️ Archivos Clave
- `src/app/admin/actions/liveMatchActions.ts` (Server Actions aisladas)
- `src/components/home/LiveMatchesBanner.tsx` (Banner superior del Home)
- `src/components/home/LiveMatchFloater.tsx` (Pelota flotante del Home)
- `src/components/match/PublicMatchView.tsx` (Vista interactiva en tiempo real)
