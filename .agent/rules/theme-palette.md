---
description: Paletas obligatorias para Modo Diurno y Nocturno
---

# Regla Estricta: Sistema de Temas (Modo Diurno / Modo Nocturno)

Esta regla define los colores exactos y mandatorios para la implementación del tema oscuro y claro en la plataforma.

## Modo Diurno (Light Mode)
- **Fondo principal (App Background):** Beige cálido muy claro (`#F5F5DC`).
- **Fondo de Tarjetas, Formularios, Menús (Superficies):** Blanco puro (`#FFFFFF`) para generar profundidad.
- **Textos:** Tonos oscuros legibles (ej. gris oscuro `#171717` o negro suave).
- **Acentos:** Colores de acento definidos por la marca (Naranja/Azul TDF).

## Modo Nocturno (Dark Mode)
- **PROHIBIDO:** Usar negro puro (`#000000`).
- **Fondo principal (App Background):** Azul marino muy oscuro (ej. `#0A192F` o similar).
- **Fondo de Tarjetas, Formularios, Menús (Superficies):** Azul marino ligeramente más claro para generar profundidad (ej. `#112240` o `#1E293B`).
- **Textos:** Blanco (`#FFFFFF`) o gris claro (`#CBD5E1`).
- **Acentos/Botones activos:** Azul vibrante / celeste (ej. `#3B82F6`, `#38BDF8`, `#00D8FF`).

## Transiciones
- **Global:** Se debe aplicar obligatoriamente un fade suave y global a todo el proyecto usando la clase o directiva `@apply transition-colors duration-300 ease-in-out;`. PROHIBIDO usar cortes bruscos de color.
