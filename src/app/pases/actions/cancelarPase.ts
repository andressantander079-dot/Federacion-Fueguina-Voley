'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface CancelarPaseResponse {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Server Action para cancelar un trámite de pase incompleto.
 * Utiliza una estrategia híbrida:
 * 1. Intenta llamar a la RPC `cancelar_pase_tramite` en la base de datos (atomicidad SQL nativa).
 * 2. Si la RPC no existe o falla por esquema, cae en un fallback de transacción lógica en Node con rollback de compensación manual.
 */
export async function cancelarPaseAction(paseId: string): Promise<CancelarPaseResponse> {
    if (!paseId) {
        return { success: false, error: 'El ID del trámite es obligatorio.' };
    }

    const supabase = createAdminClient();

    try {
        // --- Estrategia 1: Intentar ejecutar la RPC atómica nativa de Postgres ---
        const { data: rpcData, error: rpcError } = await supabase.rpc('cancelar_pase_tramite', {
            p_tramite_id: paseId
        });

        if (!rpcError) {
            // Si la llamada fue exitosa, parseamos el resultado retornado por la RPC
            const result = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
            if (result && result.success === false) {
                return { success: false, error: result.error || 'No se pudo cancelar el trámite.' };
            }
            
            // Revalidar path en Next.js para forzar actualización del Server Component
            revalidatePath('/admin/tramites/pases');
            return { success: true, message: result?.message || 'Trámite cancelado exitosamente.' };
        }

        // Si el error no es que no se encuentra la función, entonces arrojamos para que vaya a la transacción lógica
        // El código de error de Postgres 42883 significa "Undefined Function" (función no existe)
        const isUndefinedFunction = rpcError.code === '42883';
        if (!isUndefinedFunction) {
            console.error("Error al ejecutar RPC cancelar_pase_tramite:", rpcError);
            return { success: false, error: rpcError.message };
        }

        console.warn("RPC 'cancelar_pase_tramite' no detectada en Base de Datos (Código 42883). Ejecutando fallback de transacción lógica...");

        // --- Estrategia 2: Fallback con Transacción Lógica y Rollback Manual (Compensación) ---
        
        // 1. Obtener estado actual del trámite
        const { data: tramite, error: fetchError } = await supabase
            .from('tramites_pases')
            .select('*')
            .eq('id', paseId)
            .single();

        if (fetchError || !tramite) {
            return { success: false, error: 'Trámite no encontrado.' };
        }

        // 2. Validaciones de estado
        if (tramite.estado === 'completado') {
            return { success: false, error: 'No se puede cancelar un trámite completado.' };
        }

        if (tramite.estado === 'cancelado') {
            return { success: false, error: 'El trámite ya se encuentra cancelado.' };
        }

        const estadoOriginal = tramite.estado;

        // 3. Modificar estado del trámite a 'cancelado'
        const { error: updatePaseError } = await supabase
            .from('tramites_pases')
            .update({ 
                estado: 'cancelado',
                updated_at: new Date().toISOString()
            })
            .eq('id', paseId);

        if (updatePaseError) {
            return { success: false, error: 'Error al actualizar el trámite: ' + updatePaseError.message };
        }

        // 4. Devolver jugador a su club de origen y resetear plantel (squad_id)
        const { error: updatePlayerError } = await supabase
            .from('players')
            .update({ 
                team_id: tramite.origen_club_id,
                squad_id: null
            })
            .eq('id', tramite.player_id);

        if (updatePlayerError) {
            console.error("Falla en actualización del jugador. Ejecutando Rollback del Trámite...");
            
            // ROLLBACK MANUAL COMPENSATORIO: Devolver el trámite a su estado original
            await supabase
                .from('tramites_pases')
                .update({ 
                    estado: estadoOriginal,
                    updated_at: new Date().toISOString()
                })
                .eq('id', paseId);

            return { success: false, error: 'Error al revertir al jugador al club origen. Trámite restablecido.' };
        }

        // Éxito en la transacción lógica
        revalidatePath('/admin/tramites/pases');
        return { success: true, message: 'Trámite cancelado exitosamente.' };

    } catch (err: any) {
        console.error("Excepción en cancelarPaseAction:", err);
        return { success: false, error: err.message || 'Ocurrió un error inesperado.' };
    }
}
