---
name: supreme-mobile-optimizer
description: Utiliza el Browser Subagent para realizar pruebas exhaustivas de UI en resoluciones móviles. Detecta visualmente problemas de renderizado, desbordamientos (overflow) y elementos superpuestos, y corrige automáticamente el código frontend para solucionarlos.
---
# Optimizador Supremo de UI Móvil y Auto-Corrección

## Objetivo
Garantizar que la aplicación sea 100% responsiva, dinámica y tenga una experiencia de usuario fluida en dispositivos móviles. Identificar proactivamente errores visuales (especialmente elementos superpuestos) y modificar el código fuente para resolverlos.

## Instrucciones de Ejecución (Bucle de Auto-Corrección)
1. **Auditoría Visual Móvil:** Abre la aplicación usando tu Browser Subagent (Subagente de navegador) con emulación estricta de dispositivo móvil (ej. resolución 375x812 para iOS/Android).
2. **Detección de Superposiciones:** Analiza el DOM y las capturas de pantalla para identificar elementos que colisionen o estén uno encima del otro de forma incorrecta (busca problemas de z-index, desbordamiento de texto, position absolute mal calculada, o falta de flex-wrap).
3. **Identificación de Código:** Si detectas un error visual, localiza el archivo y componente exacto en el código fuente del frontend.
4. **Auto-Corrección:** Edita el código para aplicar la solución óptima de diseño responsivo. Por ejemplo:
   - Cambiar flex-direction a column (`flex-col`) en pantallas pequeñas.
   - Ajustar paddings, margins o el tamaño de las fuentes.
   - Corregir el `z-index` o asegurar que los contenedores tengan `overflow-hidden` o `flex-wrap`.
5. **Verificación Final:** Recarga el Browser Subagent. Comprueba visualmente que la superposición se haya resuelto y que la UI sea fácil y dinámica de usar.

## Restricciones Críticas (Constraints)
- **Cero daño a la lógica:** NO modifiques la lógica de negocio, las llamadas a la base de datos (Supabase) ni el backend. Modifica EXCLUSIVAMENTE los estilos visuales y la estructura HTML/Componentes.
- **Protección de Escritorio:** Las correcciones móviles no deben romper la vista de escritorio. Asegúrate de usar directivas responsivas adecuadas (Mobile-first).
- **Entregable:** Genera un Artefacto de tipo 'Walkthrough' con capturas de pantalla del "Antes" y el "Después" de cada elemento superpuesto que hayas corregido.
