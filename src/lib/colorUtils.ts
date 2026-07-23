/**
 * Convierte un string color hexadecimal (con o sin #) en componentes RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
    // Limpieza de hexadecimal estrictamente con replace(/^#/, '') según regla de negocio
    let cleaned = hex.replace(/^#/, '');
    
    if (cleaned.length === 3) {
        cleaned = cleaned.split('').map(char => char + char).join('');
    }
    
    if (cleaned.length !== 6) {
        return { r: 0, g: 0, b: 0 };
    }
    
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    
    return { r, g, b };
}

/**
 * Retorna el color de contraste accesible (negro o blanco) para un fondo hexadecimal dado usando la fórmula YIQ
 */
export function getContrastColor(hexColor: string): string {
    const { r, g, b } = hexToRgb(hexColor);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#FFFFFF';
}
