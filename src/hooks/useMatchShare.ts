'use client';

import { useState, RefObject } from 'react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface UseMatchShareProps {
    cardRef: RefObject<HTMLElement | null>;
}

// Función auxiliar para configurar temporalmente un proxy sobre getComputedStyle
// Utiliza un Canvas Singleton y una Caché en memoria para optimizar el rendimiento a 0ms de retardo
function setupColorCompatibilityProxy() {
    if (typeof window === 'undefined') return () => {};
    
    const originalGetComputedStyle = window.getComputedStyle;
    
    // 1. Canvas Singleton para evitar crear miles de elementos DOM en bucle
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    
    // 2. Caché de mapeo de color para retornar de forma instantánea colores ya procesados
    const colorCache = new Map<string, string>();
    
    const convertModernColorsInString = (value: string): string => {
        if (!value || typeof value !== 'string') return value;
        
        // Si no contiene ninguna de las funciones cromáticas modernas de Tailwind v4, omitir
        if (!value.includes('oklch') && !value.includes('oklab') && !value.includes('lab') && !value.includes('lch')) {
            return value;
        }
        
        // Expresión regular para capturar oklch(...), oklab(...), lab(...), lch(...)
        const colorRegex = /(oklch|oklab|lab|lch)\s*\([^)]+\)/gi;
        
        return value.replace(colorRegex, (match) => {
            // Si el color ya está en la caché, lo devolvemos al instante
            if (colorCache.has(match)) {
                return colorCache.get(match)!;
            }
            
            try {
                if (ctx) {
                    ctx.clearRect(0, 0, 1, 1);
                    ctx.fillStyle = match;
                    ctx.fillRect(0, 0, 1, 1);
                    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
                    const converted = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
                    colorCache.set(match, converted);
                    return converted;
                }
            } catch (e) {
                console.warn('[useMatchShare] Falló la conversión de la subcadena de color:', match, e);
            }
            return match;
        });
    };

    window.getComputedStyle = function (elt, pseudoElt) {
        const style = originalGetComputedStyle(elt, pseudoElt);
        
        return new Proxy(style, {
            get(target, prop, receiver) {
                // Interceptar llamadas a getPropertyValue
                if (prop === 'getPropertyValue') {
                    return function (propertyName: string) {
                        const value = target.getPropertyValue(propertyName);
                        return convertModernColorsInString(value);
                    };
                }
                
                // Obtener el valor directamente del target nativo para evitar "Illegal invocation" por el receptor (Proxy)
                const value = target[prop as any];

                // Si el valor es una función nativa del prototipo de CSSStyleDeclaration, debemos enlazarla al target original
                if (typeof value === 'function') {
                    return (value as any).bind(target);
                }
                
                // Interceptar accesos a propiedades directas (style.color, style.background, etc.)
                if (typeof value === 'string') {
                    return convertModernColorsInString(value);
                }
                return value;
            }
        });
    };

    // Retorna una función para restaurar la implementación original
    return () => {
        window.getComputedStyle = originalGetComputedStyle;
    };
}

// Función robusta para copiar texto al portapapeles con fallback a Textarea y execCommand
// para evitar denegación de permisos o expiración de gestos de usuario
async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (err) {
        console.warn('[useMatchShare] Falló navigator.clipboard, usando fallback:', err);
    }
    
    // Fallback Legacy (execCommand) - Funciona incluso si expira el gesto del usuario en promesas largas
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textarea);
        return successful;
    } catch (fallbackErr) {
        console.error('[useMatchShare] Error crítico al copiar texto:', fallbackErr);
        return false;
    }
}

export function useMatchShare({ cardRef }: UseMatchShareProps) {
    const [isSharing, setIsSharing] = useState(false);

    const generateShareText = (matchData: any): string => {
        if (!matchData) return '';
        const homeName = matchData.home_team?.name || 'Local';
        const awayName = matchData.away_team?.name || 'Visitante';
        const homeScore = matchData.home_score ?? 0;
        const awayScore = matchData.away_score ?? 0;
        const categoryName = matchData.category?.name || 'Voley';
        
        // Formatear fecha si está disponible
        let formattedDate = 'No registrada';
        if (matchData.scheduled_time) {
            try {
                const dateObj = new Date(matchData.scheduled_time);
                formattedDate = dateObj.toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                    timeZone: 'America/Argentina/Buenos_Aires'
                });
            } catch (e) {
                console.error('Error formatting date for share text:', e);
            }
        }

        const setsText = matchData.set_scores && matchData.set_scores.length > 0
            ? matchData.set_scores.join(', ')
            : 'No registrado';

        // Autoridades con renderizado condicional limpio
        const authorities: string[] = [];
        if (matchData.firstRefereeName && matchData.firstRefereeName !== 'Sin designar') {
            authorities.push(`1er Arb: ${matchData.firstRefereeName}`);
        }
        if (matchData.secondRefereeName) {
            authorities.push(`2do Arb: ${matchData.secondRefereeName}`);
        }
        if (matchData.scorerName) {
            authorities.push(`Planillero: ${matchData.scorerName}`);
        }

        const authoritiesText = authorities.length > 0
            ? `\nAutoridades: \n${authorities.join('\n')}`
            : '';

        return `🏆 Resultado Oficial FVF 🏆\n${homeName} ${homeScore} - ${awayScore} ${awayName}\nCategoría: ${categoryName}\nFecha: ${formattedDate}\nResultado sets: ${setsText}${authoritiesText}`;
    };

    const shareMatch = async (matchData: any) => {
        if (!matchData) {
            toast.error('No hay datos del partido disponibles');
            return;
        }

        if (!cardRef.current) {
            toast.error('No se pudo encontrar la plantilla visual para compartir');
            return;
        }

        setIsSharing(true);
        const shareText = generateShareText(matchData);
        const title = 'Resultado Oficial FVF';
        
        // Activar el proxy de compatibilidad de colores para html2canvas
        const restoreGetComputedStyle = setupColorCompatibilityProxy();
        
        let generatedBlob: Blob | null = null;

        try {
            // Capturar el elemento off-screen con html2canvas
            const canvas = await html2canvas(cardRef.current, {
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#09090b', // Zinc-950 fondo oficial
                scale: 2, // Mayor calidad para pantallas de alta densidad
                logging: false,
                windowWidth: 600, // Fijar ancho del renderizado
                windowHeight: 800 // Fijar alto del renderizado
            });

            // Convertir canvas a Blob en formato JPEG con calidad del 85% para compresión óptima
            generatedBlob = await new Promise<Blob | null>((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.85);
            });

            if (!generatedBlob) {
                throw new Error('Error al generar la imagen comprimida');
            }

            // Crear el archivo para compartir
            const homeName = (matchData.home_team?.name || 'local').replace(/\s+/g, '-').toLowerCase();
            const awayName = (matchData.away_team?.name || 'away').replace(/\s+/g, '-').toLowerCase();
            const filename = `resultado-${homeName}-vs-${awayName}.jpg`;
            const file = new File([generatedBlob], filename, { type: 'image/jpeg' });

            // Verificar si el navegador soporta compartir archivos a través de navigator.share
            const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });

            if (canShareFiles) {
                await navigator.share({
                    title,
                    text: shareText,
                    files: [file]
                });
                toast.success('¡Partido compartido con éxito!');
            } else {
                throw new Error('Web Share API para archivos no soportada en este navegador');
            }
        } catch (error: any) {
            console.warn('Fallo al compartir via Web Share API, iniciando Plan B (Descarga + Portapapeles):', error);

            // Plan B: Reutilizar el blob generado para descargar y copiar el texto al portapapeles
            try {
                if (generatedBlob) {
                    const url = URL.createObjectURL(generatedBlob);
                    const a = document.createElement('a');
                    const homeName = (matchData.home_team?.name || 'local').replace(/\s+/g, '-').toLowerCase();
                    const awayName = (matchData.away_team?.name || 'away').replace(/\s+/g, '-').toLowerCase();
                    a.href = url;
                    a.download = `resultado-${homeName}-vs-${awayName}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }

                // Intentar copiar el texto con la función robusta (directa + textarea fallback)
                const copySuccess = await copyToClipboard(shareText);
                if (copySuccess) {
                    toast.success('Imagen descargada y texto copiado al portapapeles.');
                } else {
                    toast.success('Imagen descargada (no se pudo copiar el texto).');
                }
            } catch (fallbackError) {
                console.error('Error en el fallback de compartir:', fallbackError);
                toast.error('No se pudo descargar la imagen. Intentando copiar el texto...');
                await copyToClipboard(shareText);
            }
        } finally {
            // Restaurar la función getComputedStyle original
            restoreGetComputedStyle();
            setIsSharing(false);
        }
    };

    return {
        shareMatch,
        isSharing
    };
}
