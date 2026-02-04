import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    console.log("API: create-club started");

    try {
        // 1. Check Admin Permission
        const supabaseUser = await createClient();
        const { data: { user: adminUser }, error: authError } = await supabaseUser.auth.getUser();

        if (authError || !adminUser) {
            console.error("API: Unauthorized", authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body;
        try {
            body = await request.json();
        } catch (e) {
            console.error("API: Invalid JSON body");
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const { email, password, clubName, city, staff } = body;

        console.log("API: Create Club Request", { email, clubName, city });

        if (!email || !password || !clubName) {
            console.error("API: Missing fields");
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        console.log("API: Creating Auth User...");
        // 2. Create Auth User
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: clubName }
        });

        if (createError) {
            console.error("API: Auth Create Failed", createError);
            throw createError;
        }

        const newUserId = userData.user.id;
        console.log("API: Auth User Created", newUserId);

        // 3. Create Team
        console.log("API: Creating Team...");
        const { data: teamData, error: teamError } = await supabaseAdmin
            .from('teams')
            .insert({
                name: clubName,
                city: city || 'Ushuaia',
                admin_id: newUserId,
                authorized_staff: staff || []
            })
            .select()
            .single();

        if (teamError) {
            console.error("API: Team creation failed", teamError);
            throw teamError;
        }
        console.log("API: Team Created", teamData.id);

        // 4. Link Profile
        console.log("API: Linking Profile...");
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUserId,
                role: 'club',
                club_id: teamData.id,
                full_name: clubName,
                email: email
            });

        if (profileError) {
            console.error("API: Profile link failed", profileError);
            throw profileError;
        }

        console.log("API: Success Club Created");
        return NextResponse.json({ success: true, team: teamData, user: userData.user });

    } catch (error: any) {
        console.error("Create Club Error FATAL:", error);
        return NextResponse.json({ error: error.message || "Error Interno" }, { status: 500 });
    }
}
