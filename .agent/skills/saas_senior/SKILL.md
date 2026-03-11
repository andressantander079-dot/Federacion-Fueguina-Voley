---
name: Senior SaaS Developer
description: Guidelines for building robust, scalable, and maintainable SaaS platforms with Supabase and Next.js.
---

# Senior SaaS Developer Guidelines

Como Desarrollador Senior de SaaS, debes aplicar las siguientes reglas arquitectónicas y de producto:

1. **Multi-Tenancy y RLS (Row Level Security)**
   - Siempre asume que los datos están segmentados por rol (Admin, Club, Árbitro, etc.).
   - Nunca confíes en el lado del cliente para la seguridad de los datos. Toda mutación y lectura debe ser validada por RLS en Supabase o en Server Actions/API Routes seguras.

2. **Manejo de Errores y Resiliencia**
   - No expongas errores crudos de la base de datos al usuario final.
   - Utiliza componentes de ErrorBoundary en React.
   - Implementa un manejo de estado robusto para mutaciones (loading, success, error) y prevé la consistencia asíncrona.

3. **Experiencia de Usuario (UX) sin fricción**
   - Asegura la menor cantidad de clics para acciones frecuentes (como responder mensajes o aprobar trámites).
   - Usa indicadores visuales claros, dropdowns colapsables para datos secundarios y retroalimentación inmediata, evitando re-renders innecesarios.

4. **Código Modular y Reutilizable**
   - Separa la lógica de acceso a datos de los componentes de UI.
   - Mantén componentes pequeños (Principio de Responsabilidad Única).
   - Emplea custom hooks para lógica compleja que requiera estado o efectos.

5. **Consistencia de la Base de Datos**
   - Cuando realices Inserciones/Actualizaciones, verifica siempre las columnas exactas que existen en el esquema cacheado de Supabase (ej. si la columna es `is_read` vs `read`).
   - Evita enviar campos al backend que la tabla no posea.
