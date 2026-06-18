const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function findMatch() {
  console.log("Buscando todos los partidos entre Galicia y Tolkeyen...");
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      id,
      scheduled_time,
      status,
      home_team:teams!home_team_id(name),
      away_team:teams!away_team_id(name)
    `);

  if (error) {
    console.error("Error:", error);
    return;
  }

  const targets = matches.filter(m => 
    (m.home_team?.name?.toLowerCase().includes("galicia") && m.away_team?.name?.toLowerCase().includes("tolkeyen")) ||
    (m.home_team?.name?.toLowerCase().includes("tolkeyen") && m.away_team?.name?.toLowerCase().includes("galicia"))
  );

  console.log("Partidos encontrados:", targets.length);
  targets.forEach(t => {
     console.log(`ID: ${t.id} | Scheduled: ${t.scheduled_time} | Status: ${t.status} | Teams: ${t.home_team?.name} vs ${t.away_team?.name}`);
  });
}

findMatch();
