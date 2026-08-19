export type GenderRama = 'FEM' | 'MASC';
export type CategoryCode = 'Sub12' | 'Sub13' | 'Sub14' | 'Sub16' | 'Sub18' | 'MAY';
export type TournamentPrefix = 'OFI' | 'APE' | 'GP';

export interface TournamentReference {
  tournamentId: string;
  code: string; // Ej: 'OFI-FEM-Sub14-2026', 'APE-MASC-Sub16-2026', 'OFI-FEM-MAY-2026'
  gender: 'femenino' | 'masculino';
  categoryCode: CategoryCode;
  year: number;
}

export function getCategoryCode(categoryName: string): CategoryCode {
  if (!categoryName) return 'MAY';
  const norm = categoryName.toLowerCase();
  if (norm.includes('12')) return 'Sub12';
  if (norm.includes('13')) return 'Sub13';
  if (norm.includes('14')) return 'Sub14';
  if (norm.includes('16')) return 'Sub16';
  if (norm.includes('18')) return 'Sub18';
  return 'MAY';
}

export function getTournamentPrefix(tournamentName: string): TournamentPrefix {
  if (!tournamentName) return 'OFI';
  const norm = tournamentName.toLowerCase();
  if (norm.includes('grand prix') || norm.includes('g. p.') || norm.includes('gp')) return 'GP';
  if (norm.includes('apertura')) return 'APE';
  return 'OFI';
}

export function buildTournamentCode(
  tournamentName: string,
  gender: 'femenino' | 'masculino' | string | undefined | null,
  categoryName: string,
  year = 2026
): string {
  const prefix = getTournamentPrefix(tournamentName || '');
  const rama: GenderRama = (gender && gender.toLowerCase() === 'masculino') ? 'MASC' : 'FEM';
  const cat = getCategoryCode(categoryName || '');
  return `${prefix}-${rama}-${cat}-${year}`;
}
