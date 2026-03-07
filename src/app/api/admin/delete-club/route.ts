import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    console.log("API: delete-club started");
    try {
        // 1. Verificación de permisos de Administrador
        const supabaseUser = await createClient();
        const { data: { user: adminUser }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { teamId } = body;

        if (!teamId) {
            return NextResponse.json({ error: 'Missing teamId' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // Limpieza en Cascada (Manual para evitar errores de FK si no hay ON DELETE CASCADE)
        // Obtener el ID del Usuario Auth vinculado a este perfil/equipo
        const { data: teamData } = await supabaseAdmin.from('teams').select('admin_id').eq('id', teamId).single();

        console.log("API: Deleting squad players...");
        await supabaseAdmin.from('players').delete().eq('team_id', teamId);

        console.log("API: Deleting squads...");
        await supabaseAdmin.from('squads').delete().eq('team_id', teamId);

        console.log("API: Deleting team categories...");
        await supabaseAdmin.from('team_categories').delete().eq('team_id', teamId);

        console.log("API: Deleting profiles...");
        await supabaseAdmin.from('profiles').delete().eq('club_id', teamId);

        console.log("API: Deleting team...");
        const { error: teamDeleteError } = await supabaseAdmin.from('teams').delete().eq('id', teamId);
        if (teamDeleteError) {
            throw new Error(`Team delete failed: ${teamDeleteError.message}`);
        }

        // Borrar usuario Auth si detectamos un admin_id válido vinculado al equipo
        if (teamData && teamData.admin_id) {
            console.log("API: Deleting Auth User", teamData.admin_id);
            await supabaseAdmin.auth.admin.deleteUser(teamData.admin_id);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Delete Club Error FATAL:", error);
        return NextResponse.json({ error: error.message || "Error al eliminar (Es posible que tenga partidos o torneos jugados)" }, { status: 500 });
    }
}
