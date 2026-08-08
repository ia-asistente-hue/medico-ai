// lib/services/doctor.service.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';

export async function resolveDoctorId(
  supabase: SupabaseClient<Database>,
  userId: string,
  encounterId?: string
): Promise<string> {
  // 1. Si tenemos un encounter_id, intentamos buscar el doctor asignado directamente
  if (encounterId) {
    const { data, error } = await supabase
      .from('encounters')
      .select('doctor_id')
      .eq('id', encounterId)
      .maybeSingle();

    const encounterData = data as any;

    if (!error && encounterData?.doctor_id) {
      return encounterData.doctor_id;
    }
  }

  // 2. Búsqueda directa por profile_id (que sabemos que contiene el UUID del usuario)
  const { data: doctor, error: doctorError } = await supabase
    .from('doctors')
    .select('id')
    .eq('profile_id', userId)
    .maybeSingle();

  console.log("DEBUG - Buscando doctor con profile_id:", userId);
  console.log("DEBUG - Resultado:", doctor);
  console.log("DEBUG - Error:", doctorError);

  if (doctorError || !doctor) {  
    throw new Error(
      `No se pudo resolver el doctor_id para el usuario autenticado (${userId}). Asegúrate de que el médico esté registrado en la tabla 'doctors'.`
    );
  }

  // Retorna el 'id' correcto de la tabla doctors (ej. 902054c7-...)
  return doctor.id;
}