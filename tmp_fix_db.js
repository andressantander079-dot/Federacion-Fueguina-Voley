require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function main() {
  console.log("Iniciando parche de base de datos...");

  // 1. Fetch all active players
  const { data: players, error } = await supabase
    .from('players')
    .select('*')
    .eq('status', 'active');

  if (error) {
    console.error("Error fetching players:", error);
    return;
  }

  let cemadFixCount = 0;
  let revertCount = 0;

  for (const p of players) {
    // Check if missing critical document
    let missingCritical = false;
    let missingReason = [];

    if (!p.photo_url) missingReason.push("Foto de Perfil");
    if (!p.id_document_url) missingReason.push("DNI Frente");
    if (p.birth_date) {
      const bDay = new Date(p.birth_date);
      const tDay = new Date();
      let ag = tDay.getFullYear() - bDay.getFullYear();
      if (tDay.getMonth() < bDay.getMonth() || (tDay.getMonth() === bDay.getMonth() && tDay.getDate() < bDay.getDate())) {
        ag--;
      }
      if (ag < 18 && !p.family_authorization_url) missingReason.push("Autorización de Menor");
    }

    if (missingReason.length > 0) {
      console.log(`[REVOCADO] Jugador ${p.name} regresado a pendiente. Le falta: ${missingReason.join(', ')}`);
      await supabase.from('players').update({
        status: 'pending',
        rejection_reason: `Falta documentación obligatoria (${missingReason.join(', ')}) para mantener el Alta. Completar.`
      }).eq('id', p.id);
      revertCount++;
      continue; // because they are no longer active
    }

    // Fix CEMAD
    if (!p.medical_url && !p.cemad_pendiente) {
      console.log(`[CEMAD] Jugador ${p.name} se le marca cemad_pendiente = true`);
      await supabase.from('players').update({
        cemad_pendiente: true,
        cemad_status: 'missing'
      }).eq('id', p.id);
      cemadFixCount++;
    }
  }

  console.log(`\nResumen:`);
  console.log(`- Jugadores devueltos a pendientes por falta de documentos: ${revertCount}`);
  console.log(`- Jugadores marcados en naranja (Deuda CEMAD): ${cemadFixCount}`);
  process.exit(0);
}

main();
