import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { generarNotaSOAPDesdeAudio } from '@/lib/groqService';

export async function POST(request) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
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

    // 1. Validar autenticación
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Sesión no válida o expirada' }, { status: 401 });
    }

    // 2. Extraer parámetros del FormData
    const formData = await request.formData();
    const audioFile = formData.get('audio');
    const encounterId = formData.get('encounter_id');

    // Validación estricta de entrada
    if (!audioFile) {
      return NextResponse.json({ error: 'No se recibió el archivo de audio' }, { status: 400 });
    }
    if (!encounterId) {
      return NextResponse.json({ error: 'Falta el ID de la consulta (encounter_id)' }, { status: 400 });
    }

    // 3. Procesar audio con Groq
    const resultado = await generarNotaSOAPDesdeAudio(audioFile);

    // 4. Inserción directa en soap_notes (Trazabilidad NOM-024)
    const { data: soapNote, error: dbError } = await supabase
      .from('soap_notes')
      .insert([
        {
          encounter_id: encounterId,
          subjective: resultado.notaSOAP.subjetivo,
          objective: resultado.notaSOAP.objetivo,
          assessment: resultado.notaSOAP.analisis,
          plan: resultado.notaSOAP.plan,
          summary: resultado.transcripcionOriginal || '',
          ai_model_version: 'groq/llama-3.3-70b',
          is_finalized: false,
        }
      ])
      .select()
      .single();

    if (dbError) {
      console.error('Error insertando en soap_notes:', dbError);
      return NextResponse.json(
        { error: 'Error al vincular la nota con la consulta médica', details: dbError.message }, 
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      soapNote,
      soap: resultado.notaSOAP
    });

  } catch (error) {
    console.error('Error no controlado en /transcribir:', error);
    return NextResponse.json({ error: error.message || 'Error interno del servidor' }, { status: 500 });
  }
}