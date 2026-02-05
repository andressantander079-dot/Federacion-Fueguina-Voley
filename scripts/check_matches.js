
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://fshesmnecejvzqrmufgj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzaGVzbW5lY2Vqdnpxcm11ZmdqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkwMjkzMDUsImV4cCI6MjA4NDYwNTMwNX0.mLbVqWkcPqbRLuVY1zmqXFxSuwvtCapeEv7U7A7EkEw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function formatArgentinaTime(dateInput) {
    const isoString = dateInput instanceof Date ? dateInput.toISOString() : dateInput;
    if (!isoString) return '';
    const parts = isoString.split('T');
    if (parts.length < 2) return '';
    return parts[1].substring(0, 5);
}

function formatArgentinaDate(dateInput, options = {}) {
    const isoString = dateInput instanceof Date ? dateInput.toISOString() : dateInput;
    if (!isoString) return '';

    try {
        const [datePart, timePartFull] = isoString.split('T');
        if (!datePart || !timePartFull) return isoString;

        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute] = timePartFull.split(':').map(Number);

        const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute));

        return utcDate.toLocaleString('es-AR', {
            timeZone: 'UTC',
            ...options
        });
    } catch (e) {
        return String(dateInput);
    }
}

async function run() {
    const out = [];
    function log(msg) { out.push(msg); console.log(msg); }

    log("Fetching recent matches...");
    const { data, error } = await supabase
        .from('matches')
        .select(`
            id, scheduled_time, 
            home_team:teams!home_team_id(name),
            away_team:teams!away_team_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        log("Error: " + JSON.stringify(error));
        fs.writeFileSync('scripts/output.txt', out.join('\n'));
        return;
    }

    log("\n--- RAW DATA & PARSING TEST ---");
    data.forEach(m => {
        const raw = m.scheduled_time;
        const timeStr = formatArgentinaTime(raw);
        const formattedDate = formatArgentinaDate(raw, {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit'
        });

        log(`\nMatch: ${m.home_team?.name} vs ${m.away_team?.name}`);
        log(`Raw DB String:  ${raw}`);
        log(`Parsed Time:    ${timeStr}`);
        log(`Formatted Date: ${formattedDate}`);
    });

    fs.writeFileSync('scripts/output.txt', out.join('\n'));
    console.log("Written to scripts/output.txt");
}

run();
