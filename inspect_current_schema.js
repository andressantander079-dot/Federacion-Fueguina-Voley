const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log("--- Treasury Accounts ---");
    let { data: tA } = await supabase.from('treasury_accounts').select().limit(1);
    if (tA && tA.length > 0) console.log(Object.keys(tA[0]));

    console.log("--- Treasury Movements ---");
    let { data: tM } = await supabase.from('treasury_movements').select().limit(1);
    if (!tM) {
        let { data: fallback } = await supabase.from('movements').select().limit(1);
        if (fallback && fallback.length > 0) console.log("Table 'movements':", Object.keys(fallback[0]));
    } else {
        if (tM.length > 0) console.log(Object.keys(tM[0]));
    }

    console.log("--- Procedures ---");
    let { data: p } = await supabase.from('procedures').select().limit(1);
    if (p && p.length > 0) console.log(Object.keys(p[0]));

    console.log("--- Storage Objects (DNI/Comprobantes) ---");
    // Just select from storage.objects isn't directly allowed from JS client without being the user or admin if RLS is on, 
    // but with Service Role Key it bypasses RLS.
    let { data: s } = await supabase.storage.from('documents').list();
    if (s && s.length > 0) {
        console.log("Documents Bucket files metadata sample:", s[0]);
    } else {
         let { data: s2 } = await supabase.storage.from('DNI').list();
         if (s2 && s2.length > 0) console.log("DNI Bucket files metadata sample:", s2[0]);
    }
}

inspect().catch(console.error);
