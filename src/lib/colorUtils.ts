export interface TeamColors {
  primary: string;
  secondary: string;
}

export const DEFAULT_OFFICIAL_COLORS: Record<string, TeamColors> = {
  'tolkeyen': { primary: '#E11D48', secondary: '#ffffff' },
  'aep': { primary: '#1e3a8a', secondary: '#3b82f6' },
  'academia tdf': { primary: '#eab308', secondary: '#000000' },
  'academia de voley': { primary: '#eab308', secondary: '#16a34a' },
  'albi': { primary: '#2563eb', secondary: '#ffffff' },
  'casa del deporte': { primary: '#dc2626', secondary: '#ffffff' },
  'adefu': { primary: '#15803d', secondary: '#ffffff' },
  'universitario': { primary: '#7c3aed', secondary: '#ffffff' },
  'estrella': { primary: '#f97316', secondary: '#000000' },
  'galicia': { primary: '#2563eb', secondary: '#ffffff' },
  'imago': { primary: '#ec4899', secondary: '#831843' },
  'lasserre': { primary: '#0284c7', secondary: '#ffffff' }
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (!hex || !hex.startsWith('#')) return null;
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  if (isNaN(bigint)) return null;
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

export function getContrastColor(hexColor: string): '#FFFFFF' | '#000000' {
  if (!hexColor || !hexColor.startsWith('#')) return '#FFFFFF';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
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

  // 2° Prioridad: Colores configurados por el Administrador en la tabla teams (BD)
  if (teamDbColors?.primary_color) {
    let primary = teamDbColors.primary_color;
    // Resolución de choque cromático para el visitante si no hubo kit en planilla
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
