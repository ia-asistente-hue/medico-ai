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
  // Si no hay medicamentos ni instrucciones, no generamos receta vacía
  if ((!medications || medications.length === 0) && !instructions) {
    return null;
  }

  // Generación de un código de folio único y legible para cumplimiento normativo
  const folioCode = `REC-${Math.floor(100000 + Math.random() * 900000)}`;

  const { data, error } = await supabase
    .from('prescriptions')
    .upsert(
      [
        {
          encounter_id: encounterId,
          doctor_id: doctorId,
          medications: medications || [],
          instructions: instructions || null,
          prescription_code: folioCode,
        },
      ],
      { onConflict: 'encounter_id' } // Resuelve el error 42P10 de conflicto de índice único
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Error al guardar la prescripción: ${error.message}`);
  }

  return data;
}