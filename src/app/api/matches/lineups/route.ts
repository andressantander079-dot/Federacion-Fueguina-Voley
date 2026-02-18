import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { matchId, clubId, lineups } = body;

        console.log("API: Saving lineups for match:", matchId, "Team:", clubId);

        if (!matchId || !clubId || !Array.isArray(lineups)) {
            return NextResponse.json({ error: "Missing required fields or invalid lineups array" }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();

        // 1. Delete Existing for this match + team
        const { error: delError } = await supabaseAdmin
            .from('match_lineups')
            .delete()
            .eq('match_id', matchId)
            .eq('team_id', clubId);

        if (delError) {
            console.error("API Delete Error:", delError);
            return NextResponse.json({ error: delError.message }, { status: 500 });
        }

        // 2. Insert New
        if (lineups.length > 0) {
            const { error: insError } = await supabaseAdmin
                .from('match_lineups')
                .insert(lineups);

            if (insError) {
                console.error("API Insert Error:", insError);
                return NextResponse.json({ error: insError.message }, { status: 500 });
            }
        }

        return NextResponse.json({ success: true, count: lineups.length });

    } catch (error: any) {
        console.error("API Routine Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
