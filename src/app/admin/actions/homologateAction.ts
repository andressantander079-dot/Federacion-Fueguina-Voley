'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export interface HomologateMatchParams {
  matchId: string;
  passwordInput: string;
  finalSheetData: any;
  homeScore: number;
  awayScore: number;
  adminSignature?: string | null;
  adminNotes?: string;
}

/**
 * Server Action Atómica para Homologación y Cierre Administrativo Override (v3.0)
 */
export async function homologateMatchSheetAction(
  params: HomologateMatchParams
): Promise<{ success: boolean; error?: string }> {
  const { matchId, passwordInput, finalSheetData, homeScore, awayScore, adminSignature, adminNotes } = params;

  if (!matchId) return { success: false, error: 'ID de partido no provisto.' };
  if (!passwordInput || !passwordInput.trim()) {
    return { success: false, error: 'Debe ingresar la contraseña de confirmación.' };
  }

  const supabase = await createClient();

  // 1. Verificar sesión activa de usuario
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user || !user.email) {
    return { success: false, error: 'Sesión no encontrada o no autorizada.' };
  }

  // 2. Verificar rol en la tabla profiles (Debe ser admin)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return { success: false, error: 'Acceso denegado: Se requieren permisos de Administrador.' };
  }

  // 3. REAUTENTICACIÓN ESTRICTA DE CREDENCIALES CONTRA SUPABASE AUTH
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: passwordInput
  });

  if (reauthError) {
    return { success: false, error: 'Contraseña de Administrador incorrecta.' };
  }

  // 4. Construcción del bloque forense de cierre administrativo (closed_by)
  const closedByBlock = {
    role: 'admin',
    user_id: user.id,
    email: user.email,
    timestamp: new Date().toISOString(),
    method: 'admin_override',
    seal: 'HOMOLOGACIÓN OFICIAL FVF - RESOLUCIÓN ADMINISTRATIVA',
    admin_signature: adminSignature || null,
    notes: adminNotes || 'Cierre y homologación administrativa de acta de juego'
  };

  const updatedSheetData = {
    ...finalSheetData,
    closed_by: closedByBlock
  };

  // 5. Mutación optimista anti-condición de carrera
  const { data: updatedRows, error: updateError } = await supabase
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      sheet_data: updatedSheetData,
      sheet_status: 'submitted',
      status: 'finalizado'
    })
    .eq('id', matchId)
    .neq('sheet_status', 'submitted') // Prevención de Race Condition
    .select('id');

  if (updateError) {
    console.error("Error en homologateMatchSheetAction:", updateError);
    return { success: false, error: updateError.message };
  }

  if (!updatedRows || updatedRows.length === 0) {
    return { success: false, error: 'El partido ya fue enviado o cerrado previamente por la mesa de control.' };
  }

  // 6. Purga atómica canónica de la caché server-side de Next.js App Router
  revalidatePath('/', 'page');
  revalidatePath('/posiciones', 'page');
  revalidatePath('/partidos', 'page');
  revalidatePath('/admin/competencias', 'layout');
  revalidatePath(`/vivo/${matchId}`, 'page');
  revalidatePath(`/partido/${matchId}`, 'page');

  return { success: true };
}
