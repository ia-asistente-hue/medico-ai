import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * Procesa un archivo de audio mediante Whisper y genera la nota SOAP + Receta
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

    // Validar si la transcripción está casi vacía
    if (!transcripcion || transcripcion.trim().length < 3) {
      throw new Error("El audio grabado es demasiado corto o no se detectó voz.");
    }

    // 2. Estructuración a SOAP y Receta Médica
    const systemPrompt = `
      Eres un asistente médico especializado. Genera la respuesta ÚNICAMENTE como un objeto JSON estricto.
      No agregues texto de presentación, ni saludos, ni comentarios antes o después del JSON.

      Estructura de salida requerida:
      {
        "notaSOAP": {
          "subjetivo": "Padecimiento actual, síntomas...",
          "objetivo": "Exploración física...",
          "analisis": "Diagnóstico...",
          "plan": "Tratamiento..."
        },
        "prescripcion": {
          "instrucciones": "Indicaciones generales...",
          "medicamentos": [
            {
              "medicamento": "Nombre",
              "dosis": "Dosis",
              "frecuencia": "Frecuencia",
              "duracion": "Duración",
              "indicaciones": "Indicaciones"
            }
          ]
        }
      }

      REGLA IMPORTANTE:
      Si el audio contiene únicamente frases cortas o no médicas (ej. "hola", "gracias"), asigna texto descriptivo en los campos del JSON como "Sin información médica disponible" y devuelve "medicamentos": [].
    `;

    const respuestaSOAP = await openai.chat.completions.create({
      model: 'openai/gpt-oss-120b', // Modelo activo con soporte de json_mode y structured_outputs
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Transcripción del audio: "${transcripcion}"` }
      ],
      response_format: { type: "json_object" }
    });

    const parsedContent = JSON.parse(respuestaSOAP.choices[0].message.content);

    return {
      transcripcionOriginal: transcripcion,
      notaSOAP: parsedContent.notaSOAP || {
        subjetivo: '',
        objetivo: '',
        analisis: '',
        plan: ''
      },
      prescripcion: parsedContent.prescripcion || {
        instrucciones: '',
        medicamentos: []
      }
    };

  } catch (error) {
    console.error("Error en groqService:", error);
    throw new Error(error.message || "Fallo en el procesamiento de IA");
  }
}