// lib/services/prescription.service.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { Medicamento } from '@/types/medical.types';

interface SavePrescriptionParams {
  supabase: SupabaseClient<Database>;
  encounterId: string;
  doctorId: string;
  medications: Medicamento[];
  instructions: string | null;
}

export async function savePrescription({
  supabase,
  encounterId,
  doctorId,
  medications,
  instructions,
}: SavePrescriptionParams) {
  console.log('🔍 [savePrescription] Iniciando proceso para encounterId:', encounterId);
  console.log('💊 [savePrescription] Medicamentos recibidos:', JSON.stringify(medications, null, 2));
  console.log('📝 [savePrescription] Instrucciones recibidas:', instructions);

  // Si no hay medicamentos ni instrucciones, no generamos receta vacía
  if ((!medications || medications.length === 0) && !instructions) {
    console.log('⚠️ [savePrescription] No hay medicamentos ni instrucciones. Omitiendo guardado de receta.');
    return null;
  }

  // Generación de un código de folio único y legible para cumplimiento normativo
  const folioCode = `REC-${Math.floor(100000 + Math.random() * 900000)}`;
  console.log('🏷️ [savePrescription] Folio generado:', folioCode);

  const payload = {
    encounter_id: encounterId,
    doctor_id: doctorId,
    medications: medications || [],
    instructions: instructions || null,
    prescription_code: folioCode,
  };

  console.log('📦 [savePrescription] Payload listo para hacer upsert en Supabase:', JSON.stringify(payload, null, 2));

  const { data, error } = await (supabase.from('prescriptions') as any)
    .upsert(
      [payload],
      { onConflict: 'encounter_id' }
    )
    .select()
    .single();
    
  if (error) {
    console.error('❌ [savePrescription] Error de Supabase al guardar:', error);
    throw new Error(`Error al guardar la prescripción: ${error.message}`);
  }

  console.log('✅ [savePrescription] Receta guardada exitosamente en la BD:', data);

  return data;
}