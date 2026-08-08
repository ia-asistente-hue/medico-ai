// lib/services/soap.service.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/database.types';
import { NotaSOAP } from '@/types/medical.types';

interface SaveSoapNoteParams {
  supabase: SupabaseClient<Database>;
  encounterId: string;
  soap: NotaSOAP;
  summary?: string;
  aiModelVersion?: string;
}

export async function saveSoapNote({
  supabase,
  encounterId,
  soap,
  summary,
  aiModelVersion = 'llama-3.3-70b-versatile',
}: SaveSoapNoteParams) {
  const { data, error } = await supabase
    .from('soap_notes')
    .upsert(
      [
        {
          encounter_id: encounterId,
          subjective: soap.subjetivo,
          objective: soap.objetivo,
          assessment: soap.analisis,
          plan: soap.plan,
          summary: summary || null,
          ai_model_version: aiModelVersion,
          is_finalized: true,
        },
      ],
      { onConflict: 'encounter_id' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Error al guardar la nota SOAP: ${error.message}`);
  }

  return data;
}