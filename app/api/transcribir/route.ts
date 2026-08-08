import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { resolveDoctorId } from '@/lib/services/doctor.service';
import { saveSoapNote } from '@/lib/services/soap.service';
import { generarNotaSOAPDesdeAudio } from '@/lib/groqService';

export async function POST(request: Request) {
  console.log('🚀 [/api/transcribir] Solicitud POST recibida');

  try {
    const formData = await request.formData();
    
    // 1. Validar inputs
    const audioFile = formData.get('audio') as File | null;
    const encounterId = formData.get('encounter_id') as string | null;

    console.log('📥 [/api/transcribir] Datos recibidos:', {
      encounterId,
      audioFileName: audioFile?.name,
      audioFileSize: audioFile?.size,
    });

    if (!audioFile || !(audioFile instanceof File) || !encounterId) {
      console.error('❌ [/api/transcribir] Error: Faltan datos obligatorios');
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
      console.error('🔒 [/api/transcribir] Error: No autorizado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const doctorId = await resolveDoctorId(supabase, user.id, encounterId);

    // 4. Procesamiento con IA (Whisper + Llama)
    console.log('🧠 [/api/transcribir] Procesando audio con Groq...');
    console.log(`🎙️ [/api/transcribir] Tamaño del audio: ${(audioFile.size / (1024 * 1024)).toFixed(2)} MB`);
    
    const startTime = Date.now();
    
    const resultadoIA = await generarNotaSOAPDesdeAudio(audioFile);

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`✅ [/api/transcribir] IA respondió en ${duration} segundos`);
    console.log(`📝 [/api/transcribir] Transcripción (primeros 200 chars): "${resultadoIA.transcripcionOriginal?.substring(0, 200)}..."`);
    console.log(`📊 [/api/transcribir] Caracteres totales transcribidos: ${resultadoIA.transcripcionOriginal?.length || 0}`);

    
    // 5. Guardar Nota SOAP en Supabase
    console.log('💾 [/api/transcribir] Guardando Nota SOAP...');
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

    
    // 6. Guardar Receta en Supabase
    const medicamentos = resultadoIA.prescripcion?.medicamentos || [];
    const instrucciones = resultadoIA.prescripcion?.instrucciones || '';

    let savedPrescription = null;

    if (medicamentos.length > 0) {
      console.log('💾 [/api/transcribir] Buscando patient_id del encounter...');

      // Obtenemos el patient_id a partir del encounter_id
      const { data: encounterData, error: encounterError } = await supabase
        .from('encounters')
        .select('patient_id')
        .eq('id', encounterId)
        .single();

      if (encounterError || !encounterData?.patient_id) {
        console.error('💥 [/api/transcribir] Error obteniendo patient_id:', encounterError);
      } else {
        const patientId = encounterData.patient_id;
        const codigoFolio = `REC-${Math.floor(100000 + Math.random() * 900000)}`;

        console.log('💾 [/api/transcribir] Guardando receta médica en Supabase...', {
          patientId,
          doctorId,
          encounterId,
        });

        const { data: rxData, error: rxError } = await supabase
          .from('prescriptions')
          .insert({
            encounter_id: encounterId,
            patient_id: patientId, // 👈 ¡Campo obligatorio añadido!
            doctor_id: doctorId,
            medications: medicamentos,
            instructions: instrucciones,
            prescription_code: codigoFolio,
          })
          .select()
          .single();

        if (rxError) {
          console.error('💥 [/api/transcribir] Error guardando receta:', rxError);
        } else {
          savedPrescription = rxData;
          console.log('✅ [/api/transcribir] Receta guardada exitosamente en Supabase con ID:', rxData.id);
        }
      }
    }

    return NextResponse.json({
      success: true,
      transcript: resultadoIA.transcripcionOriginal,
      soap: {
        subjetivo: savedSoap?.subjective || resultadoIA.notaSOAP.subjetivo,
        objetivo: savedSoap?.objective || resultadoIA.notaSOAP.objetivo,
        analisis: savedSoap?.assessment || resultadoIA.notaSOAP.analisis,
        plan: savedSoap?.plan || resultadoIA.notaSOAP.plan,
      },
      prescription: savedPrescription || {
        instructions: instrucciones,
        medications: medicamentos,
      }
    });

  } catch (error: any) {
    console.error('🔥 [/api/transcribir] Error crítico:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al procesar la transcripción' },
      { status: 500 }
    );
  }
}