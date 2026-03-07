// seed.js
// Este script crea clubes, planteles, jugadores y pagos de tesorería para Pruebas (5 USH, 5 RGA).
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const CIUDADES = ['Ushuaia', 'Río Grande'];
const NOMBRES_BASE = ['Voley Club', 'Estrella del Sur', 'Los Pumas', 'Defensores', 'Atlético'];

async function seed() {
    try {
        console.log('--- INICIANDO SEEDING DE DATOS SIMULADOS ---');

        // 1. Obtener Categorías Existentes
        const { data: categorias, error: catError } = await supabase.from('categories').select('*');
        if (catError) throw catError;

        console.log(`Categorías encontradas: ${categorias.length}`);

        // 2. Obtener Cuenta de Tesorería Ingreso
        const { data: accounts } = await supabase.from('treasury_accounts').select('id').eq('type', 'INGRESO').limit(1);
        let accountId = accounts && accounts.length > 0 ? accounts[0].id : null;

        if (!accountId) {
            console.log('No se encontraron cuentas de INGRESO. Creando una de prueba...');
            const { data: newAcc } = await supabase.from('treasury_accounts').insert({
                name: 'Ingresos Operativos Test',
                code: '1000-TEST',
                type: 'INGRESO',
                status: 'activa'
            }).select().single();
            accountId = newAcc.id;
        }

        // 3. Crear 10 Clubes
        for (const ciudad of CIUDADES) {
            for (let i = 0; i < 5; i++) {
                const clubName = `${NOMBRES_BASE[i]} ${ciudad}`;

                // Chequear si existe
                const { data: exists } = await supabase.from('teams').select('id').eq('name', clubName).single();
                if (exists) {
                    console.log(`Club ${clubName} ya existe. Saltando.`);
                    continue;
                }

                console.log(`Creando Club: ${clubName}...`);

                // Insert Team
                const { data: team, error: teamError } = await supabase.from('teams').insert({
                    name: clubName,
                    city: ciudad,
                    has_paid_inscription: true
                }).select().single();

                if (teamError) throw teamError;

                // Pago Inscripcion Tesoreria
                await supabase.from('treasury_movements').insert({
                    type: 'INGRESO',
                    amount: 50000,
                    description: `Inscripción Anual - ${clubName}`,
                    date: new Date().toISOString().split('T')[0],
                    entity_name: clubName,
                    account_id: accountId
                });

                // Crear Planteles por Categoría
                for (const cat of categorias) {
                    const generos = ['Masculino', 'Femenino'];
                    for (const genero of generos) {
                        const squadName = `${cat.name} ${genero}`;

                        const { data: squad, error: squError } = await supabase.from('squads').insert({
                            team_id: team.id,
                            category_id: cat.id,
                            name: squadName,
                            gender: genero,
                            coach_name: 'Entrenador Test'
                        }).select().single();

                        if (squError) throw squError;

                        // Crear 8 Jugadores
                        let numDocs = Array.from({ length: 8 }, (_, k) => `${Math.floor(10000000 + Math.random() * 90000000)}`);
                        for (let j = 0; j < 8; j++) {
                            const { data: player, error: plaError } = await supabase.from('players').insert({
                                team_id: team.id,
                                squad_id: squad.id,
                                name: `Jugador ${j + 1} - ${clubName.slice(0, 5)}`,
                                dni: numDocs[j],
                                gender: genero,
                                birth_date: '2000-01-01',
                                number: j + 1,
                                status: 'active'
                            }).select().single();

                            if (plaError) throw plaError;

                            // Pago Jugador Tesorería
                            await supabase.from('treasury_movements').insert({
                                type: 'INGRESO',
                                amount: 15000,
                                description: `Inscripción y Fichaje Jugador - ${player.name}`,
                                date: new Date().toISOString().split('T')[0],
                                entity_name: clubName,
                                account_id: accountId
                            });
                        }
                        console.log(`    Plantel ${squadName} creado con 8 jugadores.`);
                    }
                }
            }
        }

        console.log('--- SEEDING COMPLETADO CON ÉXITO ---');
    } catch (error) {
        console.error('Error en el script de seeding:', error);
    }
}

seed();
