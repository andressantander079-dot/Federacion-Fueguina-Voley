---
name: Buenas Practicas de Desarrollo
description: Lista de reglas de oro y errores comunes prohibidos para asegurar código de calidad en Next.js y Supabase. LEER ANTES DE CREAR COMPONENTES.
---

# Buenas Prácticas y Reglas de Oro

Este skill contiene lecciones aprendidas de errores previos. Úsalo para validar tu código antes de escribirlo.

## 1. Next.js App Router & Client Components
**REGLA:** Si tu componente usa React Hooks (`useState`, `useEffect`, `useCallback`, etc.) o gestores de eventos (`onClick`, `onChange`), **DEBE** ser un Client Component.

- **INSTRUCCIÓN:** Verifica SIEMPRE si el archivo comienza con `'use client'`.
- **ERROR COMÚN:** Al usar `replace_file_content` o `write_to_file` para reescribir un componente, olvidar agregar `'use client'` al principio.
- **ACCIÓN PREVENTIVA:** Antes de enviar el código, pregúntate: "¿Estoy usando `useState`? ¿Puse `'use client'` al inicio?".

## 2. Supabase Row Level Security (RLS)
**REGLA:** Nunca dejes una tabla o bucket desprotegido, pero tampoco inutilizable.

- **INSTRUCCIÓN:** Al crear una tabla nueva, incluye siempre:
  ```sql
  ALTER TABLE nombre_tabla ENABLE ROW LEVEL SECURITY;
  -- Política básica de lectura pública (si aplica)
  CREATE POLICY "Public Read" ON nombre_tabla FOR SELECT TO public USING (true);
  -- Política de administración total
  CREATE POLICY "Admin All" ON nombre_tabla FOR ALL TO authenticated USING (true);
  ```
- **Storage:** Los buckets de Storage también necesitan políticas RLS en la tabla `storage.objects`.

## 3. Manipulación de Archivos
**REGLA:** Al editar archivos con `replace_file_content`, asegúrate de mantener las directivas e importaciones críticas.

- **INSTRUCCIÓN:** Revisa el contenido original (`view_file`) para ver si tiene `'use client'` u otras directivas importantes antes de sobreescribir.
