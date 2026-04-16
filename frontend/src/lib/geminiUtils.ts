import { apiFetch } from '../api/client';

export async function callGemini(prompt: string): Promise<string> {
  const response = await apiFetch<{ text: string }>('/api/ai/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt, temperature: 0.3, maxOutputTokens: 2048 }),
  });

  return response.text;
}

/** Genera un reporte predictivo de demanda de activos.
 * @param requestedAssets - Nombres de activos en préstamos recientes
 * @param audience - 'administrador' | 'auditor'
 * @param userId - ID del usuario logueado para contexto personalizado
 */
export async function generatePredictiveReport(
  requestedAssets: string[],
  audience: 'administrador' | 'auditor' = 'administrador',
  userId?: string
): Promise<string> {
  if (!Array.isArray(requestedAssets)) {
    throw new Error('requestedAssets debe ser un arreglo de cadenas.');
  }

  if (requestedAssets.length === 0) {
    return 'No hay suficiente historial de préstamos para generar un análisis predictivo.';
  }

  const response = await apiFetch<{ text: string }>('/api/ai/predictive-report', {
    method: 'POST',
    body: JSON.stringify({ requestedAssets, audience, userId }),
  });

  return response.text;
}