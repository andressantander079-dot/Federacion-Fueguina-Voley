'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Action invocada por el Árbitro en OfficialMatchSheet al enviar o suspender la planilla
 */
export async function finishLiveMatchAction(
  matchId: string,
  finalSheetData: any,
  homeScore: number,
  awayScore: number,
  status: 'finalizado' | 'suspendido' = 'finalizado'
): Promise<{ success: boolean; error?: string }> {
  if (!matchId) return { success: false, error: 'ID de partido no válido.' };

  const supabase = await createClient();

  const { error } = await supabase
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      sheet_data: finalSheetData,
      sheet_status: status === 'suspendido' ? 'suspended' : 'submitted',
      status: status
    })
    .eq('id', matchId);

  if (error) {
    console.error("Error en finishLiveMatchAction:", error);
    return { success: false, error: error.message };
  }

  // Purga atómica de la caché server-side de Next.js
  revalidatePath('/');
  revalidatePath('/admin/competencias/[id]', 'page');
  revalidatePath('/partidos');
  revalidatePath(`/vivo/${matchId}`);
  revalidatePath(`/partido/${matchId}`);

  return { success: true };
}

/**
 * Action invocada por el Administrador para forzar el cierre de partidos colgados
 */
export async function forceCloseLiveMatchAction(matchId: string): Promise<{ success: boolean; error?: string }> {
  if (!matchId) return { success: false, error: 'ID de partido no provisto.' };

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { success: false, error: 'No autorizado. Debe iniciar sesión como Administrador.' };
  }

  const { error } = await supabase
    .from('matches')
    .update({
      status: 'finalizado',
      sheet_status: 'submitted'
    })
    .eq('id', matchId);

  if (error) return { success: false, error: error.message };

  revalidatePath('/');
  revalidatePath('/admin/competencias/[id]', 'page');
  revalidatePath('/partidos');

  return { success: true };
}
