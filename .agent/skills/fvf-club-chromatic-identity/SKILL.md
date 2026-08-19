---
name: fvf-club-chromatic-identity
description: Sistema de resolución cromática de 4 niveles, legibilidad WCAG 2.1 AA (YIQ) y confeti reactivo en la plataforma FVF Voley. La Planilla Oficial manda en un 100% sobre cualquier otra configuración.
---

# FVF Club Chromatic Identity & Adaptive UI Standard

## 📌 Regla de Oro N° 1: Autoridad Absoluta de la Planilla Arbitral

En cualquier pantalla de transmisión pública (`/vivo/[id]` o `/partido/[id]`), **LOS COLORES CONFIGURADOS EN LA PLANILLA OFICIAL DE JUEGO (`sheet_data.teamColors`) TIENEN PRIORIDAD ABSOLUTA DEL 100%** por sobre cualquier configuración guardada en la base de datos o diccionario estático.

---

## 🎨 Algoritmo de Cascada en 4 Niveles (`resolveTeamColors`)

```typescript
export function resolveTeamColors(
  teamName: string,
  teamDbColors?: { primary_color?: string | null; secondary_color?: string | null } | null,
  sheetColors?: any,
  isHome: boolean = true,
  opponentPrimaryColor?: string
): TeamColors {
  // 1° PRIORIDAD ABSOLUTA: Planilla Oficial de Juego (La mesa de control manda)
  if (sheetColors) {
    let primary: string | undefined;
    let secondary: string | undefined;

    if (Array.isArray(sheetColors) && sheetColors.length > 0) {
      primary = sheetColors[0];
      secondary = sheetColors[1] || '#ffffff';
    } else if (typeof sheetColors === 'object') {
      primary = sheetColors.primary || sheetColors.main || sheetColors.color;
      secondary = sheetColors.secondary || '#ffffff';
    } else if (typeof sheetColors === 'string') {
      primary = sheetColors;
      secondary = '#ffffff';
    }

    if (primary && typeof primary === 'string' && primary.trim().length > 0) {
      return {
        primary: primary.trim(),
        secondary: (secondary || '#ffffff').trim()
      };
    }
  }

  // 2° Prioridad: Colores configurados en BD por el Admin (teams.primary_color)
  if (teamDbColors?.primary_color) {
    let primary = teamDbColors.primary_color;
    if (!isHome && opponentPrimaryColor && opponentPrimaryColor.toLowerCase() === primary.toLowerCase()) {
      primary = teamDbColors.secondary_color || '#ffffff';
    }
    return {
      primary,
      secondary: teamDbColors.secondary_color || '#ffffff'
    };
  }

  // 3° Prioridad: Diccionario por defecto de la Federación (DEFAULT_OFFICIAL_COLORS)
  const normalized = (teamName || '').toLowerCase().trim();
  for (const [key, colors] of Object.entries(DEFAULT_OFFICIAL_COLORS)) {
    if (normalized.includes(key)) {
      return colors;
    }
  }

  // 4° Fallback neutro tradicional
  return isHome
    ? { primary: '#1e40af', secondary: '#ffffff' }
    : { primary: '#dc2626', secondary: '#ffffff' };
}
```

---

## 👁️ Contraste Adaptativo WCAG 2.1 AA (`getContrastColor`)

Nunca aplicar colores de club directamente como fondo de contenedores gigantes en Dark Mode. Confinar el color al **Score Box** y calcular el color del texto mediante la fórmula YIQ:

```typescript
export function getContrastColor(hexColor: string): '#FFFFFF' | '#000000' {
  if (!hexColor || !hexColor.startsWith('#')) return '#FFFFFF';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
}
```

---

## 🎉 Confeti Reactivo SSR-Safe (`canvas-confetti`)

Al detectar incrementos en el puntaje (`currentHomePts > prevScoreHomeRef.current`), la animación debe dispararse utilizando el color primario del club resuelto desde la planilla:

```typescript
const triggerConfetti = async (xRatio: number, primaryColor: string, isMatchPoint: boolean) => {
  try {
    const confetti = (await import('canvas-confetti')).default;
    const colors = isMatchPoint 
      ? ['#FFD700', '#FFA500', '#FFFFFF', primaryColor]
      : [primaryColor, '#ffffff'];

    confetti({
      particleCount: isMatchPoint ? 50 : 20,
      spread: isMatchPoint ? 90 : 55,
      origin: { x: xRatio, y: 0.35 },
      colors
    });
  } catch (err) {
    console.error("Error al disparar confeti:", err);
  }
};
```

---

## 🛠️ Archivos Clave
- `src/lib/colorUtils.ts` (Algoritmo de resolución cromática y YIQ)
- `src/app/admin/equipos/[clubId]/page.tsx` (Componente `ClubColorPicker`)
- `src/components/match/PublicMatchView.tsx` (Scoreboard Dark Mode Ambient Glow y Confeti)
