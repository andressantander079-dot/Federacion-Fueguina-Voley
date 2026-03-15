import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { dni, password } = body;

        if (!dni || !password) {
            return NextResponse.json({ error: 'Faltan datos requeridos (dni o password)' }, { status: 400 });
        }

        const supabaseAdmin = createAdminClient();
        const email = `${dni}@federacion.com`;

        // 1. Intentar crear el usuario en Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: {
                role: 'temp_pase',
                dni: dni
            }
        });

        if (authError) {
             if (authError.status === 422 || authError.message.includes('already registered') || authError.message.includes('already exists')) {
                  console.log(`Usuario temporal para DNI ${dni} ya existe, actualizando clave...`);
                  
                  // Necesitamos encontrar el ID del usuario existente buscando por email usando el servicio de Admin
                  // La búsqueda paginada es un workaround si no tenemos el ID a mano
                  // Supabase no tiene getUserByEmail expuesto directamente en algunos clientes así que iteraremos
                  const { data: usersData, error: listErr } = await supabaseAdmin.auth.admin.listUsers();
                  if (listErr) throw listErr;
                  
                  const existingUser = usersData.users.find(u => u.email === email);
                  if (existingUser) {
                      const { error: updateAuthErr } = await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
                          password: password,
                          user_metadata: { role: 'temp_pase', dni: dni }
                      });
                      if (updateAuthErr) throw updateAuthErr;

                      // Actualizar su perfil (por si había cambiado de rol mágicamente)
                      await supabaseAdmin.from('profiles').update({ role: 'temp_pase' }).eq('id', existingUser.id);

                      return NextResponse.json({ success: true, email: email, message: 'Usuario reseteado exitosamente' });
                  } else {
                      return NextResponse.json({ error: 'Usuario detectado como existente pero no encontrado en lista' }, { status: 500 });
                  }
             }
             
             console.error("Auth Admin Error:", authError);
             return NextResponse.json({ error: authError.message }, { status: 500 });
        }

        // Si se creó con éxito:
        if (authData?.user) {
            // Darle tiempo al Trigger de DB para crear la fila en profiles (suele ser instántaneo, pero por seguridad)
            await new Promise(resolve => setTimeout(resolve, 300));

            // Actualizar la tabla profiles explícitamente al rol temp_pase
            const { error: profileError } = await supabaseAdmin
                 .from('profiles')
                 .update({ role: 'temp_pase', full_name: `Familia DNI ${dni}` })
                 .eq('id', authData.user.id);
                 
            if (profileError) {
                 console.warn("API User Temp: Error al actualizar perfil generado por trigger:", profileError.message);
                 // Si falla, intentamos hacer insert fallback si es que el trigger falló
                 await supabaseAdmin.from('profiles').insert({
                     id: authData.user.id,
                     role: 'temp_pase',
                     full_name: `Familia DNI ${dni}`
                 });
            }
        }

        return NextResponse.json({ success: true, email: email });

    } catch (error: any) {
        console.error("API /temp-user Internal Error:", error);
        return NextResponse.json({ error: 'Error interno del servidor al crear usuario' }, { status: 500 });
    }
}
