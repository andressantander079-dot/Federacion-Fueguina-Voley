
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const supabaseUrl = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const supabaseKey = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching pending players modified in the last 6 hours...');
  
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  
  const { data, error } = await supabase
    .from('players')
    .select('id, created_at, updated_at')
    .eq('status', 'pending');
    
  if (error) {
    console.error('Fetch error:', error);
    return;
  }
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const toUpdate = data.filter(p => {
     const c = new Date(p.created_at);
     const u = new Date(p.updated_at);
     return c < today && u >= new Date(sixHoursAgo);
  });
  
  console.log('Found ' + toUpdate.length + ' players to restore.');
  
  if (toUpdate.length === 0) {
      console.log('No players to restore.');
      return;
  }
  
  const ids = toUpdate.map(p => p.id);
  const { error: updateErr } = await supabase
    .from('players')
    .update({ status: 'active' })
    .in('id', ids);
    
  if (updateErr) {
     console.error('Update error:', updateErr);
  } else {
     console.log('Successfully restored ' + ids.length + ' players to active.');
  }
}
run();
