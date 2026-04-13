# Tareas de Implementación del Modal de Detalles de Partido

- [x] 1. Crear el componente `MatchDetailsModal.tsx` en `src/components/fixture/`.
  - [x] Implementar el *Data Fetching* (Lazy Loading) mediante Supabase (matches + joins).
  - [x] Añadir `Skeleton Loader` estilo Dark Theme.
  - [x] Maquetar la UI (Fondo darken-blur, Escudos grandes, Tabla de Set Scores minimalista, Footer para el Árbitro).
  - [x] Manejar la lógica de cierre con la tecla <kbd>Esc</kbd> y *click outside*.
- [x] 2. Modificar la página del Fixture (`src/app/fixture/page.tsx`).
  - [x] Envolver la lógica principal en un `Suspense` y extraer la lectura de `useSearchParams` hacia adentro si fuera necesario (o un hook al inicio de la página habilitada como `'use client'`).
  - [x] Obtener el parámetro `match_details` de la URL.
  - [x] Agregar `onClick` sobre las tarjetas únicamente si el estado es `'finalizado'`, disparando un push al Router.
  - [x] Inyectar `<MatchDetailsModal>` si existe el parámetro, pasando el ID como prop.
- [x] 3. Chequeos finales y verificación manual de UX e hidratación de URL.
