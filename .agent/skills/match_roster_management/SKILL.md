---
name: Match Roster UI & Search
description: Standard UI and logic rules for Match Rosters, Player Search Modals (Lupa), and Subsitute Rendering ("#9 Nombre") in Official Match Sheets
---

# Reglas Oficiales para Planillas de Partido & Planteles (UI/UX)

Esta habilidad documenta las reglas de oro acordadas para la UI y la lógica de búsqueda de jugadoras dentro de la Planilla Oficial de Partido (Arbitraje).

## 1. Lógica del Buscador ("Lupa" / Modal Add Player)
Al buscar o agregar jugadoras a la planilla de un partido en vivo:
- **NO debe ser una búsqueda vacía que dependa de tipear texto.** 
- Al hacer clic en "Agregar", el sistema DEBE **cargar inmediatamente a todas las jugadoras activas (`status='active'`) del Club**, cruzando la información de todos los planteles (squads) de dicho club.
- Debe poseer un `input` tipo caja de texto para **filtrado dinámico local** que reduzca la lista instantáneamente de acuerdo a lo que tipea el usuario.
- **Validación de Edad y Partidos**: Las listas deben comprobar si la jugadora supera el límite de edad para la categoría actual (`max_year`), pero permitir a categorías más jóvenes participar libremente. Se deben bloquear aquellas jugadoras que ya hayan disputado más del máximo permitido por día (ej. 2 matches).

## 2. Formato de Visualización en el Banco de Suplentes
En el panel del Árbitro, en las listas de jugadoras "Convocadas" (las que están disponibles debajo de "Agregar" y no en cancha):
- La lista debe reflejar fielmente la estética modal de "Planteles Oficiales".
- El formato exacto esperado es: **`#Número de camiseta` alineado a la izquierda, seguido por el `Nombre de la Jugadora`**. 
- Etiquetas para roles especiales (Ej. `Líbero`, `Capitán`) deben ir a la derecha usando badges estilizados.
- **Acciones Directas**: Cada jugador del banco debe tener iconos u opciones directas para editar rápidamente su `Número`, estado de `Líbero` o `Capitán` *sin tener que meterlas primero en la cancha*. En el diseño se representa con el icono de Editar (`Edit2`) al lado del ícono de Eliminar.

## 3. Consultas a la Base de Datos (Seguridad & Robustez)
- Siempre verificar `status = 'active'` para listar deportistas habilitados.
- NO usar `.single()` al buscar planteles o categorías a menos que estés 100% seguro y envuelto en un `try-catch`. Prefiere `.maybeSingle()` para no lanzar errores `PGRST116` silenciosos que anulen la carga entera de un partido si a un Club le desaparece un 'squad' temporalmente.
- Los placeholders de la matriz de la cancha (por defecto, un array de `6` entradas con valor `null`) NO deben ser evaluados usando `.length === 0` para verificar "cancha vacía". Fíltralos siempre: `posHome.filter(p => p !== null).length === 0`.
