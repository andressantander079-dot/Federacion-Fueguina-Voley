export interface TeamColors {
  primary: string;
  secondary: string;
}

export const DEFAULT_OFFICIAL_COLORS: Record<string, TeamColors> = {
  'academia': { primary: '#0284c7', secondary: '#ffffff' },
  'imago': { primary: '#1e293b', secondary: '#38bdf8' },
  'adefu': { primary: '#16a34a', secondary: '#ffffff' },
  'albi': { primary: '#dc2626', secondary: '#ffffff' },
  'aep': { primary: '#2563eb', secondary: '#ffffff' },
  'galicia': { primary: '#7c3aed', secondary: '#f59e0b' }
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  } else if (cleanHex.length === 6) {
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);
    return { r, g, b };
  }
  return null;
}

export function getContrastColor(hex: string): '#000000' | '#FFFFFF' {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
}

export function resolveTeamColors(
  teamName: string,
  teamDbColors?: { primary_color?: string | null; secondary_color?: string | null } | null,
  sheetColors?: any,
  isHome: boolean = true,
  opponentPrimaryColor?: string
): TeamColors {
  // 1° PRIORIDAD ABSOLUTA: Colores asignados en Planilla Oficial de Juego (La mesa de control manda)
  if (sheetColors) {
    let raw = sheetColors;
    if (typeof raw === 'object' && raw !== null) {
      if (isHome && raw.home) raw = raw.home;
      else if (!isHome && raw.away) raw = raw.away;
    }

    let primary: string | undefined;
    let secondary: string | undefined;

    if (Array.isArray(raw) && raw.length > 0) {
      primary = raw[0];
      secondary = raw[1] || '#ffffff';
    } else if (typeof raw === 'object' && raw !== null) {
      primary = raw.primary || raw.main || raw.color || raw[0];
      secondary = raw.secondary || raw[1] || '#ffffff';
    } else if (typeof raw === 'string') {
      primary = raw;
      secondary = '#ffffff';
    }

    if (primary && typeof primary === 'string' && primary.trim().length > 0) {
      return {
        primary: primary.trim(),
        secondary: (secondary || '#ffffff').trim()
      };
    }
  }

  // 2° Prioridad: Colores configurados por el Administrador en la tabla teams (BD)
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

  // 3° Prioridad: Diccionario oficial por defecto de la Federación
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
