//app/actions/prescriptions.ts
'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { decryptText, encryptText } from '@/utils/encryption';

interface GuardarRecetaParams {
  encounterId: string;
  doctorId: string;
  patientId: string;
  medicamentos: Array<{
    medicamento: string;
    dosis: string;
    frecuencia: string;
    duracion: string;
    indicaciones: string;
  }>;   
  instruccionesReceta: string;
}

export async function guardarRecetaSeguraAction({
  encounterId,
  doctorId,
  patientId,
  medicamentos,
  instruccionesReceta,
}: GuardarRecetaParams) {
  console.log('🔒 [guardarRecetaSegura] Iniciando guardado para encounterId:', encounterId);
  console.log('💊 [guardarRecetaSegura] Medicamentos crudos recibidos:', JSON.stringify(medicamentos, null, 2));
  console.log('📝 [guardarRecetaSegura] Instrucciones crudas recibidas:', instruccionesReceta);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  // 1. Cifrar los medicamentos en el servidor antes de guardarlos
  const medicamentosCifrados = medicamentos.map((med) => ({
    medicamento: encryptText(med.medicamento || ''),
    dosis: encryptText(med.dosis || ''),
    frecuencia: encryptText(med.frecuencia || ''),
    duracion: encryptText(med.duracion || ''),
    indicaciones: encryptText(med.indicaciones || ''),
  }));

  const instruccionesCifradas = encryptText(instruccionesReceta || '');
  console.log('🔐 [guardarRecetaSegura] Datos cifrados listos para la BD.');

  // 2. Verificar si ya existe una receta para este encuentro
  const { data: existingRx } = await supabase
    .from('prescriptions')
    .select('id')
    .eq('encounter_id', encounterId)
    .maybeSingle();

  if (existingRx) {
    console.log('🔄 [guardarRecetaSegura] Actualizando receta existente ID:', existingRx.id);
    const { error: updateError } = await supabase
      .from('prescriptions')
      .update({
        medications: medicamentosCifrados,
        instructions: instruccionesCifradas,
      })
      .eq('id', existingRx.id);

    if (updateError) {
      console.error('❌ [guardarRecetaSegura] Error al actualizar:', updateError);
      throw new Error(updateError.message);
    }
  } else {
    const codigoFolio = `RX-${Math.floor(100000 + Math.random() * 900000)}`;
    console.log('✨ [guardarRecetaSegura] Insertando nueva receta con folio:', codigoFolio);
    
    const { error: insertError } = await supabase.from('prescriptions').insert([
      {
        encounter_id: encounterId,
        doctor_id: doctorId,
        patient_id: patientId,
        medications: medicamentosCifrados,
        instructions: instruccionesCifradas,
        prescription_code: codigoFolio,
      },
    ]);

    if (insertError) {
      console.error('❌ [guardarRecetaSegura] Error al insertar:', insertError);
      throw new Error(insertError.message);
    }
  }

  console.log('✅ [guardarRecetaSegura] Proceso completado exitosamente.');
  return { success: true };
}


export async function getDecryptedPrescriptionAction(encounterId: string) {
  console.log('🔓 [getDecryptedPrescription] Buscando receta para encounterId:', encounterId);

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: rx, error } = await supabase
    .from('prescriptions')
    .select('*')
    .eq('encounter_id', encounterId)
    .maybeSingle();

  if (error || !rx) {
    console.warn('⚠️ [getDecryptedPrescription] No se encontró receta o hubo un error:', error);
    return null;
  }

  console.log('📦 [getDecryptedPrescription] Receta cruda encontrada en BD:', rx);

  // Descifrar elemento por elemento
  const decryptedMedications = (rx.medications || []).map((med: any, index: number) => {
    const medDescifrado = decryptText(med.medicamento || '');
    const dosisDescifrada = decryptText(med.dosis || '');
    const frecuenciaDescifrada = decryptText(med.frecuencia || '');
    const duracionDescifrada = decryptText(med.duracion || '');
    const indicacionesDescifradas = decryptText(med.indicaciones || '');

    console.log(`🧪 [getDecryptedPrescription] Med [${index}] -> Original:`, med.medicamento, '| Descifrado:', medDescifrado);

    return {
      medicamento: medDescifrado,
      dosis: dosisDescifrada,
      frecuencia: frecuenciaDescifrada,
      duracion: duracionDescifrada,
      indicaciones: indicacionesDescifradas,
    };
  });

  const decryptedInstructions = decryptText(rx.instructions || '');
  console.log('📝 [getDecryptedPrescription] Instrucciones descifradas:', decryptedInstructions);

  return {
    ...rx,
    medications: decryptedMedications,
    instructions: decryptedInstructions,
  };
}