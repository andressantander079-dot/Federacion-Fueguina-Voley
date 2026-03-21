import { describe, expect, it, vi } from 'vitest';

/**
 * Calculadora de edades que simula la lógica extraída de la app.
 */
function isUnder12YearsForInscription(birthDateString: string): boolean {
  if (!birthDateString) return false;
  
  // Extraer el año de nacimiento
  const birthYear = new Date(birthDateString).getFullYear();
  // Obtener año actual mockeado (para aislamiento de testing)
  const currentYear = new Date().getFullYear();
  const projectedAge = currentYear - birthYear;
  
  return projectedAge < 12;
}

/**
 * Lógica clásica para pases y consentimientos.
 */
function isUnder18YearsExactDate(birthDateString: string): boolean {
  if (!birthDateString) return false;
  
  const today = new Date();
  const birthDate = new Date(birthDateString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
  }
  return age < 18;
}


describe('Age Calculations: Lógica dual de 12 y 18 años', () => {

  // Configuramos el mock de la fecha actual a "2026-03-20"
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-20T12:00:00Z'));

  describe('isUnder12YearsForInscription (Cálculo Inflexión de Calendario Módulo Planteles)', () => {
    
    it('Debe indicar que alguien nacido en 2015 paga como niño (11 proyectados en 2026)', () => {
      // 2026 - 2015 = 11 < 12 => true
      expect(isUnder12YearsForInscription('2015-05-10')).toBe(true);
    });

    it('Debe indicar que alguien nacido el 31 de DICIEMBRE de 2014 es Mayor de 12 (paga arancel adulto)', () => {
      // 2026 - 2014 = 12 < 12 => false (Incluso si legalmente hoy no tiene 12, para la federación este año los cumple)
      expect(isUnder12YearsForInscription('2014-12-31')).toBe(false); 
    });

    it('Debe indicar que alguien nacido en 2000 es Mayor de 12', () => {
      // 2026 - 2000 = 26 < 12 => false
      expect(isUnder12YearsForInscription('2000-01-01')).toBe(false);
    });

  });

  describe('isUnder18YearsExactDate (Cálculo de Consentimientos/Pases Módulo Administrativo)', () => {
    
    it('Alguien de 17 años y 364 días sigue siendo menor (Nativo un día despues)', () => {
      // Cumple 18 en dos días para evitar flakiness del Timezone local vs UTC al instanciar Date sin hora.
      expect(isUnder18YearsExactDate('2008-03-22')).toBe(true);
    });

    it('Alguien de exactamente 18 años, ya NO es menor', () => {
      // Cumplió 18 ayer o hoy.
      expect(isUnder18YearsExactDate('2008-03-20')).toBe(false);
    });

  });
});
