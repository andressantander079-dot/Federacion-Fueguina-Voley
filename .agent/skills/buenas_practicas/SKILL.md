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

## 4. Optimización Visual Móvil (Cero Scroll en Modales)
**REGLA:** Los modales de detalles o información densa en dispositivos móviles deben caber en un solo viewport (`h-[100dvh]`) sin barras de scroll general redundantes.

- **Layout**: Utiliza `overflow-hidden` y `flex flex-col` en el contenedor del modal. Pon clases `shrink-0` a los componentes estáticos (cabecera y pie de página) para que solo el área de contenido (`flex-1 overflow-y-auto`) haga scroll si fuera necesario. En mobile, quita paddings externos redundantes (`p-0 sm:p-4`) y ajusta redondeados (`rounded-none sm:rounded-3xl`).
- **Tablas Densas**: Si hay tablas de resultados o datos con múltiples columnas (como 5 sets), usa `table-layout: fixed` y anchos pequeños fijos en las columnas (ej: `w-10 sm:w-16`) junto con abreviaciones responsivas (`S1`, `S2` en móviles; `Set 1`, `Set 2` en escritorio usando `hidden sm:inline`). Esto evita desbordamientos horizontales.

## 5. Captura con Canvas y Web Share API (Compatibilidad Tailwind v4)
**REGLA:** Al capturar elementos del DOM mediante `html2canvas` para compartir imágenes en proyectos que usen Tailwind CSS v4, se deben prever y solucionar las incompatibilidades cromáticas.

- **Incompatibilidad de Colores**: Tailwind v4 define variables y colores usando el estándar moderno CSS Color Module Level 4 (formatos `oklch`, `lab`, `oklab`, `lch`). `html2canvas` se rompe catastróficamente al intentar parsear estas funciones y arroja errores como `unsupported color function`.
- **Solución Dinámica (Proxy)**: Intercepta temporalmente `window.getComputedStyle` y su método `getPropertyValue` a través de un `Proxy` durante el renderizado del canvas. Usa una expresión regular global como `/(oklch|oklab|lab|lch)\s*\([^)]+\)/gi` para capturar cualquier función de color moderna dentro de cualquier propiedad (degradados en `background` o sombras en `box-shadow` incluidos) y traducirla a su representación `rgba` tradicional de forma rápida y nativa dibujándola en un canvas temporal singleton de `1x1` píxeles (`ctx.fillStyle = match; ctx.fillRect(0,0,1,1); ctx.getImageData(...)`). Restaura el método original en el bloque `finally` de la función.
- **Rendimiento**: Evita crear elementos canvas en el DOM de forma recursiva. Utiliza una única instancia de canvas en memoria (Singleton) y un mapa de caché (`Map<string, string>`) de colores procesados para acelerar las conversiones a **0ms** por color repetido, previniendo congelamientos de la UI.
- **Placa Off-Screen**: Diseña un contenedor oculto fuera de la pantalla (`absolute -left-[9999px] w-[600px] h-[800px]`) con estilos y márgenes específicos (alineaciones simétricas exactas para nombres y escudos, sin botones de la UI y sin `line-clamp` que cause cortes físicos de texto en el renderizador). Esta placa es la que debe capturar `html2canvas` para compartir.

## 6. Portapapeles y Gestión de Gestos de Usuario
**REGLA:** Las llamadas a `navigator.share` y `navigator.clipboard` requieren que la acción se inicie por un gesto inmediato del usuario (evento de click sincrónico). Si hay promesas asíncronas largas en el medio (como capturas pesadas de canvas), el navegador invalidará el gesto y lanzará un `NotAllowedError`.

- **Mantener Gesto Vivo**: Optimiza el renderizado del canvas con cachés para que tarde menos de 100ms.
- **Reutilización de Recursos**: Reutiliza el Blob de imagen ya generado en el bloque principal para la descarga del Plan B de fallback, evitando hacer doble captura de canvas redundante en el bloque `catch`.
- **Copia de Seguridad Robustecida (Clipboard)**: Si la API moderna `navigator.clipboard` falla o arroja errores de permisos de escritura, ten siempre una función robusta de copia con fallback legacy que inyecte un `<textarea>` temporal invisible, haga `.select()` y ejecute sincrónicamente `document.execCommand('copy')`.

