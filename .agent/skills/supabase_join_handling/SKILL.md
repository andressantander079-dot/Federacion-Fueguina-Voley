---
name: Supabase Join Handling
description: Guía crítica para manejar tipos de retorno de Supabase con Joins (relaciones) y evitar errores de TypeScript.
---

# Supabase Join Handling

## El Problema
Cuando usas el cliente de Supabase JS para hacer queries con relaciones (`joins`), TypeScript a menudo infiere incorrectamente los tipos de retorno, especialmente cuando:
1. La relación es 1:1 conceptualmente, pero Supabase devuelve un array por defecto.
2. Usas `!inner` o alias complejos.
3. La query es dinámica o compleja.

Esto resulta en errores como:
- `Property 'name' does not exist on type '{ ... }[]'` (intentas acceder a propiedad de objeto en un array)
- `Property 'name' does not exist on type 'never'` (TS infiere que el array está vacío o la relación es imposible)

## Solución: Patrón Defensivo de Acceso

SIEMPRE asume que una relación puede venir como **Objeto**, **Array de Objetos** o **Null/Undefined**, sin importar cómo definas tu query.

### ❌ Forma Incorrecta (Lo que causa errores)

```typescript
const { data } = await supabase.from('matches').select('..., home_team:teams(...)');

// Error potencial: home_team podría ser array
console.log(data[0].home_team.name); 
```

### ✅ Forma Correcta (Robustez Total)

Usa verificaciones de tipo y acceso seguro. Si el error persiste, usa casting explícito a `any` de forma controlada SOLO en la extracción inicial.

```typescript
const item = data[0];

// 1. Extracción segura manejando Array vs Objeto
// Usamos 'as any' para silenciar la inferencia errónea de 'never' o tipos incompatibles de Supabase
const homeTeam = Array.isArray(item.home_team) 
    ? (item.home_team[0] as any) 
    : (item.home_team as any);

// 2. Uso con Optional Chaining
const homeTeamName = homeTeam?.name || 'Desconocido';
```

## Reglas de Oro

1. **Array.isArray es tu amigo**: Nunca asumas que Supabase devuelve un objeto simple para una relación, incluso si es Foreign Key única.
2. **Casting Táctico**: Es aceptable usar `as any` **SOLO** al momento de normalizar la estructura (como en el ejemplo arriba) para salir del paso de errores de inferencia de librería. No uses `any` para todo el objeto de datos.
3. **Normalización Temprana**: Si tienes una lista de objetos complejos, mapéalos a una interfaz limpia de TypeScript lo antes posible, resolviendo estas ambigüedades en la función de fetch.

```typescript
// Ejemplo de normalización
const cleanMatches = rawMatches.map(m => ({
    id: m.id,
    // Resuelve la ambigüedad AQUÍ, una sola vez
    home_team: Array.isArray(m.home_team) ? m.home_team[0]?.name : m.home_team?.name,
    // ...
}));
```
