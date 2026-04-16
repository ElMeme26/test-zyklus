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

export async function callGemini(
  prompt: string,
  options: { temperature?: number; maxOutputTokens?: number } = {}
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada en el backend.');
  }

  const res = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: options.temperature ?? 0.3,
        maxOutputTokens: options.maxOutputTokens ?? 2048,
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

export async function generatePredictiveReport(
  requestedAssets: string[],
  audience: 'administrador' | 'auditor' = 'administrador',
  userId?: string
): Promise<string> {
  const freq: Record<string, number> = {};
  for (const name of requestedAssets) {
    freq[name] = (freq[name] || 0) + 1;
  }

  const topItems = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => `${name} (${count} préstamos)`)
    .join(', ');

  const prompt = requestedAssets.length === 0
    ? 'No hay historial de préstamos disponibles para generar un análisis predictivo.'
    : `Eres Zykla AI, experto en gestión patrimonial de activos tecnológicos.

Usuario actual: ${userId ? `ID ${userId}` : 'Sin especificar'}

Historial de activos prestados (frecuencia): ${topItems}

Si el usuario pregunta por préstamos actuales, cuenta ÚNICAMENTE los registros en la tabla requests con estado 'ACTIVE', 'ACTIVE_INTERNAL', 'APPROVED' o 'OVERDUE' asociados a su user_id.

Genera un reporte predictivo BREVE dirigido al ${audience}. Máximo 3 párrafos cortos (2-4 oraciones cada uno). Sé conciso; evita rodeos.

Estructura OBLIGATORIA en 3 apartados:
1. Resumen de Trazabilidad: Analiza patrones de uso y frecuencia de préstamos.
2. Predicción de Demanda: Identifica tendencias y proyecciones futuras.
3. Sugerencias de Adquisición: Recomendaciones concretas para optimizar inventario.

Tono analítico y ejecutivo. Solo español. Cierra el último párrafo con punto final.`;

  if (requestedAssets.length === 0) {
    return 'No hay suficiente historial de préstamos para generar un análisis predictivo.';
  }

  return callGemini(prompt, { temperature: 0.4, maxOutputTokens: 2048 });
}
