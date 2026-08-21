export function parseRoundOrder(roundStr: string | null | undefined): number {
  if (!roundStr) return 999;
  const lower = roundStr.toLowerCase();

  if (lower.includes('cuartos')) return 200;
  if (lower.includes('semi')) return 300;
  if (lower.includes('3er') || lower.includes('tercer')) return 350;
  if (lower.includes('final')) return 400;

  const num = parseInt(roundStr.replace(/\D/g, ''), 10);
  if (!isNaN(num)) return num;

  return 999;
}
