//app/api/transcribir/route.ts
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { resolveDoctorId } from '@/lib/services/doctor.service';
import { saveSoapNote } from '@/lib/services/soap.service';
import { generarNotaSOAPDesdeAudio } from '@/lib/groqService';
import { decryptText, encryptText } from '@/utils/encryption';

export async function POST(request: Request) {
  console.log('🔊 [API-TRANSCRIBIR] 🚀 Solicitud POST recibida');

  try {
    const formData = await request.formData();
    
    // 1. Validar inputs
    const audioFile = formData.get('audio') as File | null;
    const encounterId = formData.get('encounter_id') as string | null;

    console.log('🔊 [API-TRANSCRIBIR] 📥 Datos recibidos del cliente:', {
      encounterId,
      audioFileName: audioFile?.name,
      audioFileSize: audioFile?.size,
    });

    if (!audioFile || !(audioFile instanceof File) || !encounterId) {
      console.error('🔊 [API-TRANSCRIBIR] ❌ Error: Faltan datos obligatorios');
      return NextResponse.json(
        { error: 'Faltan datos obligatorios o el archivo de audio es inválido' },
        { status: 400 }
      );
    }

    // 2. Inicializar Supabase
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

    // 3. Autenticación
    const authHeader = request.headers.get('Authorization');
    let user = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }

    if (!user) {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }

    if (!user) {
      console.error('🔊 [API-TRANSCRIBIR] 🔒 Error: No autorizado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const doctorId = await resolveDoctorId(supabase, user.id, encounterId);

    // 4. Procesamiento con IA (Whisper + Llama)
    console.log('🔊 [API-TRANSCRIBIR] 🧠 Procesando audio con Groq...');
    console.log(`🔊 [API-TRANSCRIBIR] 🎙️ Tamaño del audio: ${(audioFile.size / (1024 * 1024)).toFixed(2)} MB`);
    
    const startTime = Date.now();
    
    const resultadoIA = await generarNotaSOAPDesdeAudio(audioFile);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`🔊 [API-TRANSCRIBIR] ✅ IA respondió en ${duration} segundos`);
    console.log(`🔊 [API-TRANSCRIBIR] 📝 Transcripción (primeros 200 chars): "${resultadoIA.transcripcionOriginal?.substring(0, 200)}..."`);
    console.log(`🔊 [API-TRANSCRIBIR] 📊 Caracteres totales transcribidos: ${resultadoIA.transcripcionOriginal?.length || 0}`);

    
    // 5. Guardar Nota SOAP en Supabase
    console.log('🔊 [API-TRANSCRIBIR] 💾 Guardando Nota SOAP...');
    const savedSoap: any = await saveSoapNote({
      supabase,
      encounterId,
      soap: {
        subjetivo: resultadoIA.notaSOAP.subjetivo,
        objetivo: resultadoIA.notaSOAP.objetivo,
        analisis: resultadoIA.notaSOAP.analisis,
        plan: resultadoIA.notaSOAP.plan,
      },
      summary: resultadoIA.transcripcionOriginal,
      aiModelVersion: 'llama-3.3-70b-versatile',
    });

    console.log('🔊 [API-TRANSCRIBIR] 🤖 [DEBUG PURO DE GROQ]:', JSON.stringify(resultadoIA.prescripcion, null, 2));
    
    // 6. Guardar Receta en Supabase
    const medicamentosCrudos = resultadoIA.prescripcion?.medicamentos || [];
    const instruccionesCrudas = resultadoIA.prescripcion?.instrucciones || '';

    console.log(`🔊 [API-TRANSCRIBIR] 💊 Medicamentos detectados por la IA: ${medicamentosCrudos.length}`);

    let savedPrescription = null;

    if (medicamentosCrudos.length > 0) {
      console.log('🔊 [API-TRANSCRIBIR] 💾 Buscando patient_id del encounter...');

      const { data: encounterData, error: encounterError } = await supabase
        .from('encounters')
        .select('patient_id')
        .eq('id', encounterId)
        .single();

      if (encounterError || !encounterData?.patient_id) {
        console.error('🔊 [API-TRANSCRIBIR] 💥 Error obteniendo patient_id:', encounterError);
      } else {
        const patientId = encounterData.patient_id;
        const codigoFolio = `REC-${Math.floor(100000 + Math.random() * 900000)}`;

        // CIFRAMOS explícitamente los medicamentos e instrucciones antes del INSERT
        const medicamentosCifrados = medicamentosCrudos.map((med: any) => ({
          medicamento: encryptText(med.medicamento || med.nombre || med.name || ''),
          dosis: encryptText(med.dosis || med.dosage || ''),
          frecuencia: encryptText(med.frecuencia || med.frequency || ''),
          duracion: encryptText(med.duracion || med.duration || ''),
          indicaciones: encryptText(med.indicaciones || med.instructions || ''),
        }));

        const instruccionesCifradas = encryptText(instruccionesCrudas);
        
        console.log('🔊 [API-TRANSCRIBIR] 🔐 Guardando receta médica cifrada en Supabase...', {
          patientId,
          doctorId,
          encounterId,
          codigoFolio,
        });

        const { data: rxData, error: rxError } = await supabase
          .from('prescriptions')
          .insert({
            encounter_id: encounterId,
            patient_id: patientId,
            doctor_id: doctorId,
            medications: medicamentosCifrados,
            instructions: instruccionesCifradas,
            prescription_code: codigoFolio,
          })
          .select()
          .single();

        if (rxError) {
          console.error('🔊 [API-TRANSCRIBIR] 💥 Error guardando receta en Supabase:', rxError);
        } else {
          savedPrescription = rxData;
          console.log('🔊 [API-TRANSCRIBIR] ✅ Receta cifrada guardada exitosamente en Supabase con ID:', rxData.id);
        }
      }
    }

    if (medicamentosCrudos.length > 0) {
      console.log('🔊 [API-TRANSCRIBIR] 🔍 Procesando bloque de verificación local de medicamentos...');
      const med = medicamentosCrudos.map((m: any) => {
        const mapeado = {
          medicamento: decryptText(m.medicamento || m.nombre || m.name || ''),
          dosis: decryptText(m.dosis || m.dosage || ''),
          frecuencia: decryptText(m.frecuencia || m.frequency || ''),
          duracion: decryptText(m.duracion || m.duration || ''),
          indicaciones: decryptText(m.indicaciones || m.instructions || ''),
        };
        
        console.log('🔊 [API-TRANSCRIBIR] 💊 [DEBUG] Medicamento mapeado/verificado:', mapeado);
        return mapeado;
      });
    }

    console.log('🔊 [API-TRANSCRIBIR] 🚀 Finalizando petición POST con éxito. Devolviendo respuesta al cliente.');

    // Devuelve los datos originales limpios a la interfaz de usuario
    return NextResponse.json({
      success: true,
      transcript: resultadoIA.transcripcionOriginal,
      soap: {
        subjetivo: resultadoIA.notaSOAP.subjetivo,
        objetivo: resultadoIA.notaSOAP.objetivo,
        analisis: resultadoIA.notaSOAP.analisis,
        plan: resultadoIA.notaSOAP.plan,
      },
      prescription: {
        instructions: instruccionesCrudas,
        medications: medicamentosCrudos,
      }
    });

  } catch (error: any) {
    console.error('🔊 [API-TRANSCRIBIR] 🔥 Error crítico en endpoint:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al procesar la transcripción' },
      { status: 500 }
    );
  }
}