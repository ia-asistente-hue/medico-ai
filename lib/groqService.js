import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * Procesa un archivo de audio mediante Whisper y genera la nota SOAP con Llama
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

    // 2. Estructuración a SOAP con Llama
    const systemPrompt = `
      Eres un asistente médico experto en normatividad clínica para México. 
      Analiza la transcripción de la consulta y genera estrictamente un JSON válido con las llaves: 
      "subjetivo", "objetivo", "analisis", "plan".
    `;

    const respuestaSOAP = await openai.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcripcion }
      ],
      response_format: { type: "json_object" }
    });

    return {
      transcripcionOriginal: transcripcion,
      notaSOAP: JSON.parse(respuestaSOAP.choices[0].message.content)
    };

  } catch (error) {
    console.error("Error en groqService:", error);
    throw new Error("Fallo en el procesamiento de IA");
  }
}