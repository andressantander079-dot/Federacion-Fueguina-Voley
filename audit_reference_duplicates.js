const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runAudit() {
  console.log("==========================================");
  console.log("   AUDITORIA FINAL DE DUPLICADOS EXACTOS  ");
  console.log("==========================================\n");

  const { data: movements, error } = await supabase
    .from('treasury_movements')
    .select('id, reference_id, reference_type, description, amount, date')
    .not('reference_id', 'is', null);

  if (error) {
    console.error("Error fetching movements:", error);
    return;
  }

  // Count occurrences of reference_id + reference_type
  const counts = {};
  for (const mov of movements) {
    const key = `${mov.reference_id}_${mov.reference_type}`;
    if (!counts[key]) counts[key] = { count: 0, items: [] };
    counts[key].count++;
    counts[key].items.push(mov);
  }

  let duplicatesFound = false;

  for (const key in counts) {
    if (counts[key].count > 1) {
      duplicatesFound = true;
      const refType = counts[key].items[0].reference_type;
      console.log(`\n❌ ALERTA: Duplicado encontrado para Tipo [${refType}]`);
      console.log(`Reference ID: ${counts[key].items[0].reference_id}`);
      counts[key].items.forEach((item, index) => {
        console.log(`  -> Cobro #${index+1}: $${item.amount} | Fecha: ${item.date}`);
        console.log(`     Desc: ${item.description}`);
      });
    }
  }

  if (!duplicatesFound) {
    console.log("✅ AUDITORIA SUPERADA: Cero (0) cobros duplicados en la base de datos.");
    console.log(`Total de movimientos unívocos registrados: ${movements.length}`);
  }
}

runAudit();
