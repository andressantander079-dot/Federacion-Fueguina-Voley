const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('treasury_movements').select('id, amount, description, type, date');
  if (error) { console.error(error); return; }
  
  console.log('Total movements:', data.length);
  
  let globalIn = 0;
  let globalOut = 0;
  
  const map = {};
  const duplicates = [];
  
  data.forEach(m => {
    if (m.type === 'INGRESO') globalIn += Number(m.amount);
    if (m.type === 'EGRESO') globalOut += Number(m.amount);
    
    // Attempt to extract DNI
    // The description might be like 'Inscripción Jugador (Inscripción Mayores (>12)): NAME - DNI 12345678'
    const dniMatch = m.description ? m.description.match(/DNI\s*:?\s*(\d+)/i) : null;
    if (dniMatch) {
       const dni = dniMatch[1];
       if (!map[dni]) map[dni] = [];
       map[dni].push(m);
    } else {
        // sometimes there's no DNI label, we just look for 7 or 8 digits
        const maybeDni = m.description ? m.description.match(/\b(\d{7,8})\b/) : null;
        if (maybeDni && m.description.toLowerCase().includes('inscripción') && m.description.toLowerCase().includes('jugador')) {
           const dni = maybeDni[1];
           if (!map[dni]) map[dni] = [];
           map[dni].push(m);
        }
    }
  });
  
  console.log('Current Global In:', globalIn);
  console.log('Current Global Out:', globalOut);
  console.log('Current Balance:', globalIn - globalOut);
  
  console.log('\n--- Checking duplicates ---');
  let duplicateCount = 0;
  let duplicateAmount = 0;
  for (const dni in map) {
      if (map[dni].length > 1) {
          console.log(`\nDNI ${dni} has ${map[dni].length} payments:`);
          // sort by date
          map[dni].sort((a,b) => new Date(a.date) - new Date(b.date));
          map[dni].forEach(x => console.log(`  - ID: ${x.id} | Amount: ${x.amount} | Desc: ${x.description}`));
          
          // Consider extra ones as duplicates
          duplicateCount += (map[dni].length - 1);
          for (let i = 1; i < map[dni].length; i++) {
              duplicateAmount += Number(map[dni][i].amount);
              duplicates.push(map[dni][i].id);
          }
      }
  }
  
  console.log('\nFound ' + duplicateCount + ' duplicate payments.');
  console.log('Amount to refund/remove: ' + duplicateAmount);
  console.log('Real Balance should be: ' + ((globalIn - globalOut) - duplicateAmount));
  
  console.log('\nSample descriptions:');
  data.slice(0, 10).forEach(x => console.log(' - ' + x.description));

  if (process.argv.includes('--delete')) {
      console.log('\nDELETING DUPLICATES...');
      for (const id of duplicates) {
          await supabase.from('treasury_movements').delete().eq('id', id);
          console.log('Deleted ' + id);
      }
      console.log('DONE!');
  }
}
check();
