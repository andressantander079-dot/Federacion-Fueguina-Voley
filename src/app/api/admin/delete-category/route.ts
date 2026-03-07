import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // 1. Check Admin Permission
        const supabaseUser = await createClient();
        const { data: { user: adminUser }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !adminUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { categoryId } = body;

        if (!categoryId) {
            return NextResponse.json({ error: 'Missing categoryId' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // Check if there are squads attached to this category
        const { data: squads, error: squadsError } = await supabaseAdmin
            .from('squads')
            .select('id')
            .eq('category_id', categoryId)
            .limit(1);

        if (squads && squads.length > 0) {
            return NextResponse.json({
                error: 'No se puede eliminar la categoría porque existen planteles (equipos) vinculados a ella. Por favor, elimine o reasigne esos planteles primero.'
            }, { status: 400 });
        }

        // Try deleting team_categories links first just in case
        await supabaseAdmin.from('team_categories').delete().eq('category_id', categoryId);

        // Delete Category
        const { error: deleteError } = await supabaseAdmin
            .from('categories')
            .delete()
            .eq('id', categoryId);

        if (deleteError) {
            throw new Error(deleteError.message);
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Delete Category Error:", error);
        return NextResponse.json({ error: error.message || "Error Interno de Servidor al eliminar la categoría" }, { status: 500 });
    }
}
