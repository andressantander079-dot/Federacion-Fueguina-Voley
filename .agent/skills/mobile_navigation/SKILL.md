---
name: Mobile Navigation Expert
description: Guidelines and best practices for creating and maintaining perfect mobile navigation interfaces in this project.
---

# Mobile Navigation UI Rules

This project uses a highly-polished, curved bottom tab bar for mobile navigation across all logged-in and public views. As an expert in mobile navigation for this project, you must enforce the following rules:

## 1. Curved Bottom Tab Bar (The Standard)
- All mobile modules (`public`, `admin`, `club`, `referee`) utilize a unified `MobileNav.tsx` component which renders as a fixed bottom app bar.
- The bar must have a **floating action button (FAB)** in the dead-center.
- The FAB physically cuts into the navigation bar below it. This is practically achieved using a thick border (`border-[8px] border-gray-50 dark:border-zinc-950`) around the FAB which matches the page's background color, faking a transparent cutout.

## 2. Animated Sliding Indicator
- There is a moving top-indicator ("barra de movimiento") that smoothly translates side-to-side based on the active tab index.
- Since there are 4 standard tabs and 1 central FAB gap, the grid is effectively split into 5 equal spatial columns (`20vw` each).
- When a tab is clicked, the indicator translates to `(index) * 20vw` if on the left, or `(index+1) * 20vw` if on the right.

## 3. Iconography (Mosaicos)
- Use `lucide-react` icons that match the primary dashboard cards ("mosaicos"):
  - **Plantel/Users**: `Users`
  - **Agenda/Partidos**: `Activity` or `CalendarDays`
  - **Trámites**: `FileText`
  - **Configuraciones/Tesoreria**: `Settings` or `CircleDollarSign`
  - **Torneos/Posiciones**: `Trophy`
- Inactive icons are `text-zinc-500` with `strokeWidth={2}`.
- Active icons are `text-tdf-orange` (or project primary color) with `strokeWidth={2.5}` and scales slightly.

## 4. Central Action (Menu)
- The central FAB exclusively opens the `isMenuOpen` overlay, exposing secondary options like Logout, Downloads, Rules, and Theme Toggles. 
- It never acts as a link to another page to prevent confusing routing states.

## 5. Overlay Menus
- Full-screen overlays must have an `onClick` to dismiss themselves, and inner containers must call `e.stopPropagation()` to prevent early dismissal.
- The overlay mounts with a backdrop blur and smooth fade-in animations.

FOLLOW THESE RULES WHENEVER THE USER REQUESTS TWEAKS TO `MobileNav.tsx`.
