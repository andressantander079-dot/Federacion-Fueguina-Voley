'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export interface ActionResponse {
    success: boolean;
    message?: string;
    error?: string;
}

/**
 * Server Action: Cancelación federativa de pases por falta de firmas
 */
export async function cancelarPaseFaltaFirmasAction(tramiteId: string): Promise<ActionResponse> {
    if (!tramiteId) {
        return { success: false, error: 'El ID del trámite es obligatorio.' };
    }

    try {
        // 1. Validar autenticación en el cliente servidor
        const clientSupabase = await createClient();
        const { data: { user }, error: authError } = await clientSupabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'No autorizado. Inicie sesión.' };
        }

        // 2. Validar rol de administrador en la tabla profiles
        const { data: profile, error: profileError } = await clientSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            return { success: false, error: 'No autorizado. Permisos insuficientes (se requiere Administrador).' };
        }

        const adminSupabase = createAdminClient();

        // 3. Estrategia 1: Intentar ejecutar la RPC atómica en Postgres
        const { data: rpcData, error: rpcError } = await adminSupabase.rpc('cancelar_pase_falta_firmas', {
            p_tramite_id: tramiteId,
            p_usuario_id: user.id
        });

        if (!rpcError) {
            const result = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
            if (result && result.success === false) {
                return { success: false, error: result.error || 'No se pudo cancelar el trámite.' };
            }
            revalidatePath('/admin/tramites/pases');
            return { success: true, message: result?.message || 'Trámite cancelado exitosamente.' };
        }

        // Si el error no es "función inexistente" (42883), retornamos la falla
        if (rpcError.code !== '42883') {
            console.error("Error al ejecutar RPC cancelar_pase_falta_firmas:", rpcError);
            return { success: false, error: rpcError.message };
        }

        console.warn("RPC 'cancelar_pase_falta_firmas' no detectada. Ejecutando fallback de transacción lógica...");

        // 4. Estrategia 2: Fallback de transacción lógica con compensación
        
        // Obtener trámite
        const { data: tramite, error: fetchError } = await adminSupabase
            .from('tramites_pases')
            .select('*')
            .eq('id', tramiteId)
            .single();

        if (fetchError || !tramite) {
            return { success: false, error: 'Trámite no encontrado.' };
        }

        // Validaciones de estado
        if (tramite.estado === 'completado') {
            return { success: false, error: 'No se puede cancelar un trámite completado.' };
        }
        if (tramite.estado === 'cancelado' || tramite.estado === 'cancelado_por_vencimiento') {
            return { success: false, error: 'El trámite ya se encuentra cancelado.' };
        }
        if (!tramite.origen_club_id) {
            return { success: false, error: 'El club de origen es inválido o nulo.' };
        }

        const estadoOriginal = tramite.estado;

        // Actualizar estado del trámite
        const { error: updatePaseError } = await adminSupabase
            .from('tramites_pases')
            .update({
                estado: 'cancelado',
                motivo_cancelacion: 'FALTA_FIRMAS',
                cancelado_por: user.id,
                fecha_cancelacion: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', tramiteId);

        if (updatePaseError) {
            return { success: false, error: 'Error al actualizar trámite: ' + updatePaseError.message };
        }

        // Revertir jugador al club de origen
        const { error: updatePlayerError } = await adminSupabase
            .from('players')
            .update({
                team_id: tramite.origen_club_id,
                squad_id: null,
                status: 'active'
            })
            .eq('id', tramite.player_id);

        if (updatePlayerError) {
            console.error("Falla en actualización del jugador. Revirtiendo trámite a estado original...");
            await adminSupabase
                .from('tramites_pases')
                .update({
                    estado: estadoOriginal,
                    motivo_cancelacion: null,
                    cancelado_por: null,
                    fecha_cancelacion: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tramiteId);
            return { success: false, error: 'Error al devolver al jugador al club origen. Trámite restablecido.' };
        }

        // Insertar en tabla de auditoría de forma segura (capturando si no existe la tabla)
        try {
            await adminSupabase.from('auditoria_pases').insert({
                tramite_id: tramiteId,
                accion: 'CANCELACION_FEDERATIVA_FALTA_FIRMAS',
                ejecutado_por: user.id,
                fecha: new Date().toISOString(),
                detalle: { player_id: tramite.player_id, origen_club_id: tramite.origen_club_id }
            });
        } catch (audError) {
            console.warn("Tabla 'auditoria_pases' no existente o inaccesible (Bypass de logs):", audError);
        }

        revalidatePath('/admin/tramites/pases');
        return { success: true, message: 'Trámite cancelado por falta de firmas exitosamente.' };

    } catch (err: any) {
        console.error("Excepción en cancelarPaseFaltaFirmasAction:", err);
        return { success: false, error: err.message || 'Ocurrió un error inesperado.' };
    }
}

/**
 * Server Action: Aprobación de pases con bypass de tesorería
 */
export async function aprobarPaseBypassTesoreriaAction(tramiteId: string, motivo: string): Promise<ActionResponse> {
    if (!tramiteId) {
        return { success: false, error: 'El ID del trámite es obligatorio.' };
    }
    if (!motivo || motivo.trim().length < 10) {
        return { success: false, error: 'El motivo del bypass debe contener al menos 10 caracteres.' };
    }

    try {
        // 1. Validar autenticación
        const clientSupabase = await createClient();
        const { data: { user }, error: authError } = await clientSupabase.auth.getUser();

        if (authError || !user) {
            return { success: false, error: 'No autorizado. Inicie sesión.' };
        }

        // 2. Validar rol de administrador en la tabla profiles
        const { data: profile, error: profileError } = await clientSupabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError || !profile || profile.role !== 'admin') {
            return { success: false, error: 'No autorizado. Permisos insuficientes.' };
        }

        const adminSupabase = createAdminClient();

        // 3. Estrategia 1: Intentar ejecutar la RPC atómica en Postgres
        const { data: rpcData, error: rpcError } = await adminSupabase.rpc('aprobar_pase_bypass_tesoreria', {
            p_tramite_id: tramiteId,
            p_motivo: motivo,
            p_usuario_id: user.id
        });

        if (!rpcError) {
            const result = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;
            if (result && result.success === false) {
                return { success: false, error: result.error || 'No se pudo aprobar el trámite.' };
            }
            revalidatePath('/admin/tramites/pases');
            return { success: true, message: result?.message || 'Trámite aprobado con bypass de tesorería.' };
        }

        // Si el error no es "función inexistente" (42883), retornamos la falla
        if (rpcError.code !== '42883') {
            console.error("Error al ejecutar RPC aprobar_pase_bypass_tesoreria:", rpcError);
            return { success: false, error: rpcError.message };
        }

        console.warn("RPC 'aprobar_pase_bypass_tesoreria' no detectada. Ejecutando fallback de transacción lógica...");

        // 4. Estrategia 2: Fallback de transacción lógica con compensación y verificación estricta de impacto financiero
        
        // Obtener trámite
        const { data: tramite, error: fetchError } = await adminSupabase
            .from('tramites_pases')
            .select('*')
            .eq('id', tramiteId)
            .single();

        if (fetchError || !tramite) {
            return { success: false, error: 'Trámite no encontrado.' };
        }

        // Validaciones de estado previo
        if (tramite.estado !== 'revision_inicial_fvf' && tramite.estado !== 'esperando_federacion') {
            return { success: false, error: 'El trámite no se encuentra pendiente de pago.' };
        }

        // Verificar que no existan movimientos de tesorería previos para el pase
        const { data: movementsPrev, error: movementsPrevError } = await adminSupabase
            .from('treasury_movements')
            .select('id')
            .eq('reference_id', tramiteId)
            .eq('reference_type', 'pase');

        if (movementsPrevError) {
            return { success: false, error: 'Error al consultar transacciones de tesorería: ' + movementsPrevError.message };
        }

        if (movementsPrev && movementsPrev.length > 0) {
            return { success: false, error: 'Inconsistencia: Ya existe un movimiento de pago registrado en tesorería para este trámite.' };
        }

        const estadoOriginal = tramite.estado;

        // Actualizar el trámite de pase
        const { error: updatePaseError } = await adminSupabase
            .from('tramites_pases')
            .update({
                estado: 'esperando_origen',
                comprobante_bypass: true,
                bypass_motivo: motivo,
                bypass_por: user.id,
                bypass_fecha: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', tramiteId);

        if (updatePaseError) {
            return { success: false, error: 'Error al actualizar el trámite de pase: ' + updatePaseError.message };
        }

        // VERIFICACIÓN POST-CONDICIÓN ESTRICTA:
        // Volver a consultar la tabla de movimientos financieros para asegurar impacto cero
        const { data: movementsPost, error: movementsPostError } = await adminSupabase
            .from('treasury_movements')
            .select('id')
            .eq('reference_id', tramiteId)
            .eq('reference_type', 'pase');

        if (movementsPostError || (movementsPost && movementsPost.length > 0)) {
            console.error("CRÍTICO: Falla de seguridad financiera. Se detectaron movimientos creados durante el bypass. Revirtiendo transacción...");
            
            // ROLLBACK MANUAL
            await adminSupabase
                .from('tramites_pases')
                .update({
                    estado: estadoOriginal,
                    comprobante_bypass: false,
                    bypass_motivo: null,
                    bypass_por: null,
                    bypass_fecha: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', tramiteId);

            return { success: false, error: 'Falla de seguridad financiera: Se abortó la operación debido a un impacto inesperado en Tesorería.' };
        }

        // Registrar auditoría de forma segura
        try {
            await adminSupabase.from('auditoria_pases').insert({
                tramite_id: tramiteId,
                accion: 'APROBACION_BYPASS_TESORERIA',
                ejecutado_por: user.id,
                fecha: new Date().toISOString(),
                detalle: { bypass_motivo: motivo }
            });
        } catch (audError) {
            console.warn("Tabla 'auditoria_pases' no existente o inaccesible (Bypass de logs):", audError);
        }

        revalidatePath('/admin/tramites/pases');
        return { success: true, message: 'Trámite aprobado exitosamente con bypass de tesorería.' };

    } catch (err: any) {
        console.error("Excepción en aprobarPaseBypassTesoreriaAction:", err);
        return { success: false, error: err.message || 'Ocurrió un error inesperado.' };
    }
}
