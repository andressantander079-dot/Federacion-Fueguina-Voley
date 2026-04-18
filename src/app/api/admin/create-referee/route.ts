import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    console.log("API: create-referee started");

    try {
        // 1. Check Admin Permission
        const supabaseUser = await createClient();
        const { data: { session }, error: authError } = await supabaseUser.auth.getSession();

        if (authError || !session?.user) {
            console.error("API: Unauthorized", authError);
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let body;
        try {
            body = await request.json();
            console.log("API: Body received", body);
        } catch (e) {
            console.error("API: Invalid JSON body");
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const { email, password, fullName, phone, category } = body;

        if (!email || !password || !fullName || !category) {
            console.error("API: Missing fields");
            return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        console.log("API: Creating Auth User...");
        // 2. Create Auth User
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName }
        });

        if (createError) {
            console.error("API: Auth Create Error", createError);
            throw createError;
        }

        const newUserId = userData.user.id;
        console.log("API: Auth User Created", newUserId);

        // 3. Update Profile (Role & Phone)
        console.log("API: Updating Profile...");
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUserId,
                role: 'referee',
                full_name: fullName,
                email: email,
                phone: phone || null
            });

        if (profileError) {
            console.error("API: Profile Update Error", profileError);
            throw profileError;
        }

        // Split fullName into first and last name
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '-';

        // 4. Create Referee Record (Category)
        console.log("API: Creating Referee Record...", { firstName, lastName, category });
        const { error: refereeError } = await supabaseAdmin
            .from('referees')
            .insert({
                id: newUserId,
                first_name: firstName,
                last_name: lastName,
                category: category
            });

        if (refereeError) {
            console.error("API: Referee Insert Error", refereeError);
            throw refereeError;
        }

        console.log("API: Success");
        return NextResponse.json({ success: true, user: userData.user });

    } catch (error: any) {
        console.error("Create Referee Error FATAL:", error);
        return NextResponse.json({ error: error.message || 'Error Interno' }, { status: 500 });
    }
}
