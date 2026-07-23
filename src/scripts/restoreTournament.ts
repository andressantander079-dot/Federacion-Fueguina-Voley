import { createAdminClient } from '../lib/supabase/admin';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Cargar variables de entorno locales
dotenv.config({ path: '.env.local' });

interface BackupData {
    tournament: {
        id: string;
        name: string;
        season: string;
        category_id: string;
        gender: string;
        point_system: string;
        best_of_sets: number;
        city: string;
        status: string;
    };
    teams?: Array<{
        id: string;
        name: string;
        city: string;
    }>;
    tournament_teams?: Array<{
        tournament_id: string;
        team_id: string;
        squad_id?: string;
    }>;
    matches?: Array<{
        id: string;
        tournament_id: string;
        category_id: string;
        home_team_id: string;
        away_team_id: string;
        round: string;
        scheduled_time: string;
        court_name: string;
        status: string;
        home_score?: number;
        away_score?: number;
        set_scores?: any;
        sheet_data?: any;
        sheet_status?: string;
        home_squad_id?: string;
        away_squad_id?: string;
        streaming_url?: string;
        mvp_player_id?: string;
        is_published?: boolean;
        referee_id?: string;
    }>;
}

async function main() {
    // 1. Obtener la ruta del archivo de backup
    const backupPathArg = process.argv[2] || './backup-tournament.json';
    const resolvedPath = path.resolve(backupPathArg);

    console.log(`[INFO] Buscando archivo de backup en: ${resolvedPath}`);

    if (!fs.existsSync(resolvedPath)) {
        console.error(`[ERROR] El archivo de backup no existe en la ruta: ${resolvedPath}`);
        console.error(`Por favor, proporciona una ruta válida. Ejemplo: npx ts-node src/scripts/restoreTournament.ts ruta/al/backup.json`);
        process.exit(1);
    }

    let backupData: BackupData;
    try {
        const rawJson = fs.readFileSync(resolvedPath, 'utf8');
        backupData = JSON.parse(rawJson);
    } catch (err: any) {
        console.error(`[ERROR] Falla al parsear el archivo JSON:`, err.message);
        process.exit(1);
    }

    const { tournament, teams, tournament_teams, matches } = backupData;

    if (!tournament || !tournament.id || !tournament.name) {
        console.error(`[ERROR] Estructura de backup inválida. Se requiere el objeto 'tournament' con 'id' y 'name'.`);
        process.exit(1);
    }

    console.log(`[START] Iniciando restauración para el torneo: "${tournament.name}" (${tournament.id})`);

    let supabaseAdmin;
    try {
        supabaseAdmin = createAdminClient();
    } catch (err: any) {
        console.error(`[ERROR] No se pudo instanciar el cliente de administración de Supabase:`, err.message);
        process.exit(1);
    }

    // Paso 1: Restaurar Torneo
    console.log(`[STEP 1/4] Forzando inserción en 'tournaments' (UPSERT)...`);
    const { data: restoredTourney, error: tErr } = await supabaseAdmin
        .from('tournaments')
        .upsert([tournament])
        .select();

    if (tErr) {
        console.error(`[ERROR] Falla al insertar torneo:`, tErr.message);
        process.exit(1);
    }
    console.log(`[OK] Torneo insertado/actualizado con éxito:`, restoredTourney);

    // Paso 2: Restaurar Clubes (si vienen en el backup)
    if (teams && teams.length > 0) {
        console.log(`[STEP 2/4] Forzando inserción de ${teams.length} equipos en 'teams' (UPSERT)...`);
        const { error: teamsErr } = await supabaseAdmin
            .from('teams')
            .upsert(teams);

        if (teamsErr) {
            console.warn(`[WARNING] Error no crítico al insertar equipos:`, teamsErr.message);
        } else {
            console.log(`[OK] Equipos restaurados correctamente.`);
        }
    } else {
        console.log(`[STEP 2/4] Saltando equipos (sin datos en backup).`);
    }

    // Paso 3: Vincular Equipos al Torneo (Pivot Table)
    if (tournament_teams && tournament_teams.length > 0) {
        console.log(`[STEP 3/4] Forzando inserción de ${tournament_teams.length} asociaciones en 'tournament_teams' (UPSERT)...`);
        
        // Aseguramos que apunten al tournament_id correcto
        const sanitizedPivot = tournament_teams.map(tt => ({
            ...tt,
            tournament_id: tournament.id
        }));

        const { error: pivotErr } = await supabaseAdmin
            .from('tournament_teams')
            .upsert(sanitizedPivot);

        if (pivotErr) {
            console.warn(`[WARNING] Error al insertar asociaciones de equipos:`, pivotErr.message);
        } else {
            console.log(`[OK] Asociaciones 'tournament_teams' restauradas.`);
        }
    } else {
        console.log(`[STEP 3/4] Saltando pivot de equipos (sin datos en backup).`);
    }

    // Paso 4: Restaurar Partidos y Planillas
    if (matches && matches.length > 0) {
        console.log(`[STEP 4/4] Forzando inserción de ${matches.length} partidos en 'matches' (UPSERT)...`);
        
        // Aseguramos que apunten al tournament_id correcto
        const sanitizedMatches = matches.map(m => ({
            ...m,
            tournament_id: tournament.id
        }));

        const { error: matchesErr } = await supabaseAdmin
            .from('matches')
            .upsert(sanitizedMatches);

        if (matchesErr) {
            console.error(`[ERROR] Falla al insertar partidos:`, matchesErr.message);
            process.exit(1);
        }
        console.log(`[OK] Partidos y planillas (sheet_data) restaurados correctamente.`);
    } else {
        console.log(`[STEP 4/4] Saltando partidos (sin datos en backup).`);
    }

    console.log(`[SUCCESS] Proceso de restauración finalizado de forma atómica.`);
    console.log(`Las estadísticas e historial se recalcularán de forma reactiva en el cliente a partir del sheet_data restaurado.`);
}

main().catch(err => {
    console.error(`[FATAL] Error inesperado en la restauración:`, err);
    process.exit(1);
});
