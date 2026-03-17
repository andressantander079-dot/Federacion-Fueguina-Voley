---
name: cross-platform-tester
description: Utiliza esta skill para realizar pruebas de UI/UX y verificar que la aplicacion sea completamente responsiva y funcione correctamente en multiples dispositivos (moviles, tablets, escritorio) y sistemas operativos.
---
# Cross-Platform & Responsive UI Tester

## Goal
Asegurar que la aplicación web se renderice, sea interactiva y funcione perfectamente en todos los tamaños de pantalla.

## Instructions
1. Utiliza tu Browser Subagent (Subagente de navegador) para acceder a la aplicación en ejecución.
2. Para cada vista que pruebes, debes redimensionar la ventana del navegador y emular las siguientes resoluciones:
   - Mobile (Ej: 375x812 - iOS/Android)
   - Tablet (Ej: 768x1024 - iPad/Android Tablets)
   - Desktop (Ej: 1920x1080 - Windows/Mac)
3. En cada resolución, navega por los menús, asegúrate de que los botones sean clickeables y que las tablas o componentes no se desborden de la pantalla (overflow).
4. Toma capturas de pantalla (Screenshots) en la vista Mobile y Desktop de cada sección clave.
5. Emite un reporte indicando si hay problemas de renderizado en algún sistema operativo o tamaño de pantalla.
