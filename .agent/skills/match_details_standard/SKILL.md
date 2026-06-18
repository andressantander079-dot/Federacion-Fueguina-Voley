---
name: Diseño y Estructura de Detalles de Partido y Compartir
description: Guía de diseño responsivo móvil para Detalles del Partido y especificación técnica para la generación de placas deportivas premium (captura canvas, compatibilidad cromática Tailwind v4 y Web Share API).
---

# Guía Estándar para Detalles de Partido y Placas Deportivas

Este documento establece las especificaciones de diseño frontend responsivo para el modal de Detalles del Partido, así como las pautas técnicas obligatorias para la generación y compartición de placas oficiales (imágenes).

---

## 1. Diseño Responsivo Móvil del Modal (Cero Scroll)
Los modales de detalles de partidos deben diseñarse con un enfoque "Mobile-First" para encajar perfectamente en un solo viewport vertical estándar de teléfono móvil (`h-[100dvh]`), evitando barras de desplazamiento externas.

### Especificaciones del Layout:
- **Estructura Principal**:
  ```html
  <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-0 sm:p-4">
      <div className="bg-zinc-900 w-full h-[100dvh] sm:h-auto max-w-2xl sm:max-h-[90vh] overflow-hidden flex flex-col sm:rounded-3xl border border-white/10">
          <!-- Cabecera (shrink-0) -->
          <div className="p-4 sm:p-6 border-b border-white/5 bg-zinc-900/50 shrink-0">...</div>
          
          <!-- Cuerpo (flex-1 overflow-y-auto) -->
          <div className="p-4 sm:p-8 overflow-y-auto flex-1">...</div>
          
          <!-- Footer (shrink-0) -->
          <div className="p-3 sm:p-4 bg-zinc-950/80 border-t border-white/5 shrink-0">...</div>
      </div>
  </div>
  ```
- **Tamaño de Escudos y Puntajes**:
  - En móviles, los escudos no deben exceder `w-16 h-16` (`sm:w-28 sm:h-28`) y el marcador debe ser compacto (`text-3xl px-4 py-1.5`) para optimizar el espacio vertical.
- **Tabla de Sets Compacta**:
  - Utilizar `table-fixed w-full` para evitar scroll horizontal.
  - El ancho de las columnas de los sets debe ser pequeño y fijo (ej: `w-10 sm:w-16`).
  - Abreviar las cabeceras en móviles (ej: usar `S1`, `S2` en lugar de `Set 1`, `Set 2` mediante clases responsivas: `<span className="hidden sm:inline">Set </span>{i + 1}`).

---

## 2. Placa Deportiva Premium Off-Screen (Diseño para Compartir)
Para asegurar que la imagen compartida sea simétrica, no contenga botones interactivos del modal (como "Cerrar") y sea de alta definición, se renderiza un contenedor invisible en pantalla (`absolute -left-[9999px] top-0 w-[600px] h-[800px] bg-zinc-950`) que es el que captura `html2canvas`.

### Reglas de Alineación Simétrica:
Para evitar desalineaciones por diferencias de contenido (por ejemplo, cuando un equipo tiene la etiqueta "Ganador" y el otro no) o recortes de texto en el canvas:
1. **Separar Escudos de Nombres**: No estructurar los escudos y nombres en columnas flex verticales completas. Dividir la visualización en dos filas horizontales coordinadas:
   - **Fila 1 (Escudos y Marcador)**: Flex row centrada verticalmente (`flex items-center justify-between w-full`). Los dos escudos se posicionan en extremos opuestos con dimensiones idénticas (`w-28 h-28`), y el marcador en el centro. Esto asegura una altura horizontal unificada para los logos.
   - **Fila 2 (Nombres e Indicadores)**: Flex row alineada arriba (`flex items-start justify-between w-full`). Los nombres de los clubes arrancan a la misma altura, utilizando un espacio de relleno central (`w-[144px] shrink-0 mx-6`) que coincide con el ancho del marcador.
2. **Evitar line-clamp**: No utilices clases como `line-clamp-2` en el generador de canvas, ya que el motor de `html2canvas` renderiza textos incompletos o con recortes físicos bajo esta directiva. En su lugar, usa un contenedor con altura mínima (`min-h-[40px] flex items-start justify-center`) y un tamaño de letra adecuado (`text-base`).
3. **Contenedores de Altura Fija para Badges**: Ubicar etiquetas de estado (como "Ganador") en cajas de altura fija (ej: `h-6 mt-1`). Si un equipo no tiene el badge, el contenedor vacío sigue ocupando espacio, impidiendo desalineaciones verticales de los elementos inferiores de la placa.
4. **Encabezado y Branding Oficial**: El encabezado de la placa debe decir obligatoriamente `FEDERACIÓN DE VOLEIBOL FUEGUINA` y contener a la izquierda el logo oficial del archivo `/logo-fvf.png` encapsulado dentro de un contenedor circular blanco con sombras (`w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 shrink-0 overflow-hidden shadow-md`) en lugar de iconos genéricos (como la medalla/Award), consolidando la identidad de la FVF.

---

## 3. Implementación del Hook de Compartición (`useMatchShare.ts`)
El hook de compartir debe encapsular la lógica de captura, conversión, Web Share API y fallbacks resilientes.

### Requerimientos Técnicos:
1. **Proxy de Compatibilidad Cromática**:
   - `html2canvas` no tolera funciones modernas de color de Tailwind v4 (`oklch`, `lab`, `oklab`, `lch`).
   - Durante la captura, se debe envolver temporalmente `window.getComputedStyle` y su método `getPropertyValue` en un `Proxy` para interceptar cualquier valor que contenga estas cadenas de color modernas.
   - Traducir los colores dinámicamente usando un **Canvas Singleton de `1x1` en memoria** y almacenar los resultados en una **caché (`Map<string, string>`)** para reducir el procesamiento a **0ms** en llamadas repetidas.
   - Enlazar correctamente el contexto (`.bind(target)`) de las funciones nativas interceptadas en el Proxy para evitar errores `Illegal invocation`.
2. **Optimización de Recursos**:
   - No ejecutar dos capturas de `html2canvas`. Si el envío a través de `navigator.share` falla o no es compatible, el bloque `catch` de fallback **debe reutilizar el Blob de imagen ya generado** para realizar la descarga directa.
3. **Copia de Seguridad del Portapapeles**:
   - El copiado de texto formateado debe tener un fallback robusto. Si `navigator.clipboard.writeText` es denegado o falla debido a la expiración de gestos de usuario en promesas largas, la función debe inyectar temporalmente un `<textarea>` invisible en el documento, seleccionarlo y ejecutar sincrónicamente `document.execCommand('copy')`.
