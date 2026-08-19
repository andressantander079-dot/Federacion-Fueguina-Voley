'use server';

import { createClient } from '@/lib/supabase/server';

export async function verifyAdminPasswordAction(password: string): Promise<{ success: boolean; error?: string }> {
  if (!password || password.trim() === '') {
    return { success: false, error: 'La contraseña no puede estar vacía.' };
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user || !user.email) {
    return { success: false, error: 'Sesión no válida o expirada. Por favor inicie sesión nuevamente.' };
  }

  // Verificación aislada en el servidor sin sobrescribir la sesión del cliente
  const { error: authError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: password.trim(),
  });

  if (authError) {
    return { success: false, error: 'Contraseña incorrecta. Intente nuevamente.' };
  }

  return { success: true };
}
