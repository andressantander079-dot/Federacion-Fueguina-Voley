const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runBackfill() {
  console.log("Starting Treasury Reference Backfill...");

  // Get all movements without a reference
  const { data: movements, error } = await supabase
    .from('treasury_movements')
    .select('*')
    .is('reference_id', null);

  if (error) {
    console.error("Error fetching movements:", error);
    return;
  }

  console.log(`Found ${movements.length} movements without reference.`);

  let updatedCount = 0;
  let failedCount = 0;

  for (const mov of movements) {
    const desc = mov.description || "";
    let refId = null;
    let refType = null;

    try {
      if (desc.includes("Inscripción Jugador")) {
        // Extract DNI. Example: "Inscripción Jugador (...): Name - DNI 12345678"
        const dniMatch = desc.match(/DNI\s+(\d+)/i);
        if (dniMatch) {
          const dni = dniMatch[1];
          const { data: player } = await supabase.from('players').select('id').eq('dni', dni).limit(1).single();
          if (player) {
            refId = player.id;
            refType = 'inscripcion_jugador';
          }
        }
      } else if (desc.includes("Alta Técnico") || desc.includes("Inscripción de Técnicos")) {
        // We might not have a clean DNI. Let's try to extract Name.
        // E.g., "Alta Técnico: Juan Perez"
        const nameMatch = desc.match(/Alta Técnico:\s+(.+)/i);
        if (nameMatch) {
          const name = nameMatch[1].trim();
          // Extremely fuzzy search for coach. Just try to find a coach where first+last name roughly matches.
          // This might be tricky, we'll skip if we can't find an exact match for safety.
        }
      } else if (desc.includes("Arancel de Pase")) {
        const dniMatch = desc.match(/DNI\s+(\d+)/i);
        if (dniMatch) {
          const dni = dniMatch[1];
          const { data: player } = await supabase.from('players').select('id').eq('dni', dni).limit(1).single();
          if (player) {
            // Find the completed pase for this player
            const { data: pase } = await supabase.from('tramites_pases').select('id').eq('player_id', player.id).limit(1).single();
            if (pase) {
              refId = pase.id;
              refType = 'pase';
            }
          }
        }
      }

      if (refId && refType) {
        const { error: updateError } = await supabase
          .from('treasury_movements')
          .update({ reference_id: refId, reference_type: refType })
          .eq('id', mov.id);

        if (!updateError) {
          updatedCount++;
        } else {
          failedCount++;
        }
      } else {
        // We intentionally ignore manual movements or un-parseable ones, they just remain without references.
      }
    } catch (e) {
      // Ignored
    }
  }

  console.log(`Backfill Complete! Updated: ${updatedCount} | Failed/Skipped: ${movements.length - updatedCount}`);
}

runBackfill();
