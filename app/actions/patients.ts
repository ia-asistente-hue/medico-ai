//app/actions/patients.ts
'use server'

import { createClient } from '@/lib/supabase';
import { decryptText } from '@/utils/encryption';

// 1. Obtener lista de pacientes descifrada
export async function getDecryptedPatientListAction(doctorId: string) {
  const supabase = createClient();
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('La clave ENCRYPTION_KEY no está configurada.');
  }

  const { data: patientList, error } = await supabase.rpc('get_decrypted_patient_list', {
    p_doctor_id: doctorId,
    p_key: encryptionKey
  });

  if (error) {
    console.error('Error en RPC get_decrypted_patient_list:', error);
    throw new Error(error.message);
  }

  return patientList || [];
}

// 2. Obtener un paciente específico descifrado
export async function getDecryptedPatientAction(patientId: string) {
  const supabase = createClient();
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('La clave ENCRYPTION_KEY no está configurada.');
  }

  const { data, error } = await supabase.rpc('get_decrypted_patient', {
    p_patient_id: patientId,
    p_key: encryptionKey
  });

  if (error) {
    console.error('Error en RPC get_decrypted_patient:', error);
    throw new Error(error.message);
  }

  return data?.[0] || null;
}

// 3. Obtener el historial de consultas (Encounters + SOAP + Recetas) de un paciente
export async function getPatientEncountersHistoryAction(patientId: string) {
  const supabase = createClient();
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('La clave ENCRYPTION_KEY no está configurada.');
  }

  const { data, error } = await supabase.rpc('get_patient_encounters_history', {
    p_patient_id: patientId,
    p_key: encryptionKey
  });

  if (error) {
    console.error('Error en RPC get_patient_encounters_history:', error);
    throw new Error(error.message);
  }

  // 🔓 Procesamos y desciframos los campos específicos de las recetas en el historial
  const processedData = (data || []).map((encounter: any) => {
    if (encounter.prescriptions) {
      let rawMeds = encounter.prescriptions.medications;
      
      // Asegurarnos de que los medicamentos sean un arreglo
      if (typeof rawMeds === 'string') {
        try {
          rawMeds = JSON.parse(rawMeds);
        } catch {
          rawMeds = [];
        }
      }

      const decryptedMedications = (Array.isArray(rawMeds) ? rawMeds : []).map((med: any) => {
        const medName = med.medicamento || med.nombre || med.name || '';
        const medDosis = med.dosis || med.dosage || '';
        const medFreq = med.frecuencia || med.frequency || '';
        const medDur = med.duracion || med.duration || '';
        const medInst = med.indicaciones || med.instructions || '';

        return {
          medicamento: medName.startsWith('U2FsdGVk') ? decryptText(medName) : medName,
          dosis: medDosis.startsWith('U2FsdGVk') ? decryptText(medDosis) : medDosis,
          frecuencia: medFreq.startsWith('U2FsdGVk') ? decryptText(medFreq) : medFreq,
          duracion: medDur.startsWith('U2FsdGVk') ? decryptText(medDur) : medDur,
          indicaciones: medInst.startsWith('U2FsdGVk') ? decryptText(medInst) : medInst,
        };
      });

      const rawInstructions = encounter.prescriptions.instructions || '';
      const decryptedInstructions = (rawInstructions.startsWith('U2FsdGVk') || rawInstructions.length > 60)
        ? decryptText(rawInstructions)
        : rawInstructions;

      encounter.prescriptions = {
        ...encounter.prescriptions,
        medications: decryptedMedications,
        instructions: decryptedInstructions,
      };
    }

    return encounter;
  });

  return processedData || [];
}

export async function getFullEncounterDetailsAction(encounterId: string) {
  const supabase = await createClient();
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('La clave ENCRYPTION_KEY no está configurada en las variables del servidor.');
  }

  const { data, error } = await supabase.rpc('get_full_encounter_details', {
    p_encounter_id: encounterId,
    p_key: encryptionKey
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] || null;
}

export async function fetchPrescriptionAction(prescriptionId: string) {
  const supabase = createClient();
  const encryptionKey = process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('La clave de encriptación no está configurada en el servidor.');
  }

  const { data, error } = await supabase.rpc('get_decrypted_prescription_details', {
    p_prescription_id: prescriptionId,
    p_key: encryptionKey,
  });

  if (error) {
    console.error('Error detallado de Supabase:', error);
    throw new Error('Error al consultar la receta en la base de datos.');
  }

  return data;
}