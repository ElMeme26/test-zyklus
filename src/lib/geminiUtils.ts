const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  error?: { message: string; code?: number };
}

/**
 * Llama a Gemini 2.5 Flash y retorna el texto generado.
 * Lanza Error con mensaje descriptivo si algo falla.
 */
export async function callGemini(
  prompt: string,
  options: { temperature?: number; maxOutputTokens?: number } = {}
): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error('VITE_GEMINI_API_KEY no está configurada en las variables de entorno.');

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxOutputTokens ?? 512,
      },
    }),
  });

  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { /* ignore */ }
    throw new Error(`Gemini API error ${res.status}: ${detail || res.statusText}`);
  }

  const data = (await res.json()) as GeminiResponse;

  if (data.error) throw new Error(`Gemini: ${data.error.message}`);

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini devolvió una respuesta vacía.');

  return text;
}

/**
 * Genera un reporte predictivo de demanda de activos.
 * @param requestedAssets - array de nombres de activos en préstamos recientes
 * @param audience - 'administrador' | 'auditor'
 */
export async function generatePredictiveReport(
  requestedAssets: string[],
  audience: 'administrador' | 'auditor' = 'administrador'
): Promise<string> {
  if (requestedAssets.length === 0) {
    return 'No hay suficiente historial de préstamos para generar un análisis predictivo.';
  }

  // Contar frecuencia para dar contexto real a la IA
  const freq: Record<string, number> = {};
  for (const name of requestedAssets) {
    freq[name] = (freq[name] || 0) + 1;
  }
  const topItems = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `${name} (${count} préstamos)`)
    .join(', ');

  const prompt = `Eres Zykla AI, experto en gestión y control patrimonial de activos tecnológicos.

Analiza el siguiente historial real de activos prestados con su frecuencia:
${topItems}

Genera un reporte predictivo profesional de máximo 3 párrafos cortos dirigido al ${audience}, que incluya:
1. Los activos con mayor demanda y por qué son críticos.
2. Qué tipo de activos se deben adquirir con mayor prioridad.
3. Una recomendación concreta de gestión de inventario.

Usa un tono analítico y ejecutivo. Responde solo en español.`;

  return callGemini(prompt, { temperature: 0.4, maxOutputTokens: 400 });
}
