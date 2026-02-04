import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        // 1. Check Admin Permission
        const supabaseUser = await createClient();
        const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify role is admin
        const supabaseAdmin = createAdminClient();
        const { data: adminProfile } = await supabaseAdmin
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (adminProfile?.role !== 'admin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Parse Body
        const { user_id } = await request.json();

        if (!user_id) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
        }

        console.log(`API: Deleting user ${user_id}`);

        // 3. Delete Auth User (Cascades to profiles/referees due to DB constraints usually, 
        // but explicit delete of auth user is the key)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

        if (deleteError) {
            console.error("API: Delete User Error", deleteError);
            throw deleteError;
        }

        // Double check/cleanup profiles if cascade didn't work (Safety net)
        // With Supabase Auth, deleting the user from auth.users usually cascades to public tables 
        // IF the foreign key was set with ON DELETE CASCADE. 
        // Our 'profiles.id' references 'auth.users.id' with CASCADE usually.
        // But just in case, we can try to delete profile too.
        await supabaseAdmin.from('profiles').delete().eq('id', user_id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Delete Referee Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
