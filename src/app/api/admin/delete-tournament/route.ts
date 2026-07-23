import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
    try {
        // 1. Validar Permiso de Administrador
        const supabaseUser = await createClient();
        const { data: { user: adminUser }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !adminUser) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { tournamentId, securityCode } = body;

        if (!tournamentId) {
            return NextResponse.json({ error: 'Falta el ID del torneo' }, { status: 400 });
        }

        // 2. Validación estricta del código "1004" con trim() en el Servidor
        if (!securityCode || securityCode.toString().trim() !== '1004') {
            return NextResponse.json({ error: 'Código de seguridad incorrecto. Operación abortada.' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // 3. Eliminar Torneo
        const { error: deleteError } = await supabaseAdmin
            .from('tournaments')
            .delete()
            .eq('id', tournamentId);

        if (deleteError) {
            throw new Error(deleteError.message);
        }

        // 4. Audit Log Estructurado
        console.log(`[AUDIT LOG] [${new Date().toISOString()}] Torneo eliminado con ID: ${tournamentId} por Administrador: ${adminUser.email}`);

        // 5. Revalidación de Caché
        revalidatePath('/admin/competencias');

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Delete Tournament Error:", error);
        return NextResponse.json({ error: error.message || "Error Interno del Servidor" }, { status: 500 });
    }
}
