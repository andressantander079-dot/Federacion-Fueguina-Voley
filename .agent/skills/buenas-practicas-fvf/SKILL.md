---
name: buenas-practicas-fvf
description: "Use this when creating or refactoring Next.js Client Components with React Hooks, configuring Supabase Row Level Security (RLS) policies, implementing html2canvas image capture with Tailwind v4, building responsive mobile modals with zero-scroll, or handling Web Share API and clipboard operations in the FVF volleyball platform. Activate for any file write, RLS setup, canvas capture, or mobile UI component task."
---

# Buenas Prácticas FVF — Anti-Crash Development Guide

## Use this skill when
- Writing Next.js components that use `useState`, `useEffect`, `useCallback`
- Creating Supabase tables or Storage buckets
- Implementing `html2canvas` capture for match share cards
- Building mobile-first modals that must fit in `100dvh` without external scroll
- Using `navigator.share` or `navigator.clipboard` APIs
- Refactoring existing components that may have lost `'use client'` directive
- Any file modification in the FVF platform codebase

## Do not use this skill when
- Working with Server Components (no hooks, no events) — default to Server Component
- Designing database schemas — use database-schema-validator
- Implementing volleyball match logic — use voley-scoring-rules
- Creating playoff brackets — use playoff-tiebreaker-engine
- The task is purely CSS/styling without React logic

## Pre-Flight Checklist (EJECUTAR ANTES DE CUALQUIER CAMBIO)

```bash
# 1. Validar 'use client' en archivos modificados
python3 ~/.agents/skills/buenas-practicas-fvf/scripts/validate-client-directive.py <file-path>

# 2. Si creas tabla nueva, verificar RLS
python3 ~/.agents/skills/buenas-practicas-fvf/scripts/check-rls-policies.py --table <table-name>

# 3. Si usas html2canvas, verificar compatibilidad de colores
node ~/.agents/skills/buenas-practicas-fvf/scripts/verify-canvas-colors.js <component-file>
```
