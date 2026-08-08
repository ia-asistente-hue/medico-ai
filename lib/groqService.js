import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * Procesa un archivo de audio mediante Whisper y genera la nota SOAP + Receta con Llama
 * @param {Buffer | fs.ReadStream} audioFileStream 
 */
export async function generarNotaSOAPDesdeAudio(audioFileStream) {
  try {
    // 1. Transcripción con Whisper
    const transcripcion = await openai.audio.transcriptions.create({
      file: audioFileStream,
      model: 'whisper-large-v3',
      language: 'es',
      response_format: 'text',
    });

    // 2. Estructuración a SOAP y Receta Médica con Llama
    const systemPrompt = `
      Eres un asistente médico experto en normatividad clínica para México. 
      Analiza la transcripción de la consulta y genera estrictamente un JSON válido con la siguiente estructura exacta:

      {
        "notaSOAP": {
          "subjetivo": "Padecimiento actual, síntomas y motivo de consulta...",
          "objetivo": "Exploración física, signos vitales...",
          "analisis": "Diagnóstico y evaluación...",
          "plan": "Plan de tratamiento e indicaciones generales..."
        },
        "prescripcion": {
          "instrucciones": "Indicaciones generales de la receta...",
          "medicamentos": [
            {
              "medicamento": "Nombre del fármaco / sustancia activa",
              "dosis": "Ej: 500 mg",
              "frecuencia": "Ej: Cada 8 horas",
              "duracion": "Ej: 7 días",
              "indicaciones": "Ej: Tomar con alimentos"
            }
          ]
        }
      }

      REGLAS OBLIGATORIAS:
      1. Si el médico menciona medicamentos en la consulta, extráelos y organízalos individualmente en el arreglo "medicamentos".
      2. Si no hay medicamentos dictados en el audio, asigna un arreglo vacío: "medicamentos": [].
    `;

    const respuestaSOAP = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcripcion }
      ],
      response_format: { type: "json_object" }
    });

    const parsedContent = JSON.parse(respuestaSOAP.choices[0].message.content);

    return {
      transcripcionOriginal: transcripcion,
      notaSOAP: parsedContent.notaSOAP || {
        subjetivo: parsedContent.subjetivo || '',
        objetivo: parsedContent.objetivo || '',
        analisis: parsedContent.analisis || '',
        plan: parsedContent.plan || ''
      },
      prescripcion: parsedContent.prescripcion || {
        instrucciones: '',
        medicamentos: []
      }
    };

  } catch (error) {
    console.error("Error en groqService:", error);
    throw new Error("Fallo en el procesamiento de IA");
  }
}