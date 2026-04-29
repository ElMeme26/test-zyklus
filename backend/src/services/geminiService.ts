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

export interface AIContext {
  availableAssets?: Array<{ id: string; name: string; tag: string; category?: string; status: string }>;
  userRequests?: Array<{ id: number; asset_id: string; status: string; assets?: { name?: string } }>;
  globalStats?: { assetCounts: Record<string, number>; requestCounts: { overdue: number; active: number } };
  categoryDistribution?: Record<string, number>;
  maintenanceAlerts?: number;
  language?: 'es' | 'en' | 'pt';
}

export interface ChatMessage {
  id?: number;
  user_id: string;
  message: string;
  response: string;
  has_graph: boolean;
  created_at?: string;
}

export interface AIAlert {
  id?: number;
  user_id?: string;
  type: 'MAINTENANCE' | 'OVERDUE' | 'RECOMMENDATION' | 'ANOMALY';
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  asset_id?: string;
  is_read?: boolean;
  created_at?: string;
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

/** 
 * Agente Contextual de IA con systemInstruction dinámico basado en rol.
 * Analiza el contexto de BD y genera respuestas precisas sin relleno.
 */
export async function generateAIResponse(
  userMessage: string,
  userRole: 'USUARIO' | 'ADMIN_PATRIMONIAL' | 'AUDITOR' | 'LIDER_EQUIPO',
  context: AIContext
): Promise<string> {
  let systemInstruction = '';

  if (userRole === 'USUARIO') {
    systemInstruction = `Eres el Asistente Inteligente de ZF Halo. Tu objetivo es ayudar al usuario a encontrar las herramientas correctas y activos disponibles.

CONTEXTO DISPONIBLE:
- Activos disponibles para préstamo: ${context.availableAssets?.length || 0} equipos
- Solicitudes activas del usuario: ${context.userRequests?.filter(r => ['ACTIVE', 'ACTIVE_INTERNAL', 'APPROVED'].includes(r.status)).length || 0}

REGLAS ESTRICTAS:
1. Si el usuario describe un problema, recomiéndale ÚNICAMENTE activos con status "Disponible" que resuelvan su necesidad.
2. Si el usuario pide un activo específico que no está disponible, infórmale la situación, pero NO le recomiendes activos que no tengan relación con su necesidad original (ej. no ofrezcas un taladro si pidió una cámara).
3. Sé ultra conciso: nombre del activo, su TAG y POR QUÉ le sirve (máximo 2 líneas).
4. NUNCA recomiendes activos en mantenimiento, dados de baja o prestados.
5. Si no hay activos disponibles que le sirvan, dilo claramente.

Responde SIEMPRE en español. Sin explicaciones largas.`;
  } else {
    // ADMIN_PATRIMONIAL, AUDITOR, LIDER_EQUIPO
    systemInstruction = `Eres un Analista de Datos Senior especializado en gestión patrimonial. Tu objetivo es generar análisis predictivos, reportes de trazabilidad y recomendaciones de optimización de inventario.

CONTEXTO DE BD:
- Total de activos: ${context.globalStats?.assetCounts['total'] || 0}
- Disponibles: ${context.globalStats?.assetCounts['Disponible'] || 0}
- Prestados: ${context.globalStats?.assetCounts['Prestada'] || 0}
- En mantenimiento: ${context.globalStats?.assetCounts['En mantenimiento'] || 0}
- Solicitudes vencidas: ${context.globalStats?.requestCounts['overdue'] || 0}
- Solicitudes activas: ${context.globalStats?.requestCounts['active'] || 0}

REGLAS DE RESPUESTA:
1. Cero texto de relleno: usa viñetas, métricas crudas y números
2. **IMPORTANTE - Si pide GRÁFICA o CHART**: RESPONDE SOLO CON EL JSON en este formato exacto:
\`\`\`json
{
  "type": "chart",
  "chartType": "bar",
  "title": "Título descriptivo",
  "data": [
    {"name": "Categoría A", "value": 25},
    {"name": "Categoría B", "value": 15}
  ]
}
\`\`\`
Luego agrega máximo 2 líneas de conclusión.

3. Si NO pide gráfica: responde con análisis en viñetas:
  - Patrones observados
  - Predicción para próximos 30 días
  - Recomendación de acción

4. Responde SIEMPRE en español. Sin relleno.`;
  }

  const userContextStr = JSON.stringify(context, null, 2);
  const fullPrompt = `${systemInstruction}

=== MENSAJE DEL USUARIO ===
${userMessage}

=== CONTEXTO JSON (para referencia) ===
${userContextStr}`;

  return callGemini(fullPrompt, {
    temperature: userRole === 'USUARIO' ? 0.2 : 0.4,
    maxOutputTokens: 2048,
  });
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

/**
 * MEJORA 2: Búsqueda Semántica - Recomienda activos según descripción de uso.
 * Usa Gemini para analizar el problema del usuario y matchear con activos disponibles.
 */
export async function semanticAssetSearch(
  userProblem: string,
  availableAssets: Array<{ id: string; name: string; tag: string; category?: string; description?: string }>
): Promise<Array<{ assetId: string; name: string; tag: string; reason: string; confidence: number }>> {
  const assetsJson = JSON.stringify(availableAssets, null, 2);
  
  const prompt = `Eres un Experto en Recomendación de Equipos Técnicos. Tu ÚNICA tarea es analizar la necesidad del usuario y retornar JSON con exactamente 3 recomendaciones.

Necesidad del usuario: "${userProblem}"

Equipos DISPONIBLES para recomendar:
${assetsJson}

INSTRUCCIÓN CRÍTICA: Retorna JSON válido con exactamente 3 recomendaciones de los equipos listados.

Formato de respuesta OBLIGATORIO (SOLO JSON, sin explicaciones adicionales):
{
  "recommendations": [
    {"assetId": "uuid", "name": "Nombre Exacto", "tag": "TAG", "reason": "Por qué específicamente ayuda", "confidence": 0.95},
    {"assetId": "uuid", "name": "Nombre Exacto", "tag": "TAG", "reason": "Razón específica", "confidence": 0.85},
    {"assetId": "uuid", "name": "Nombre Exacto", "tag": "TAG", "reason": "Razón específica", "confidence": 0.75}
  ]
}

Requisitos:
- confidence entre 0.5 y 1.0
- Ordena por relevancia (mayor a menor)
- Selecciona EXACTAMENTE 3, los mejores matches
- Responde SOLO el JSON, nada más`;

  try {
    const response = await callGemini(prompt, { temperature: 0.2, maxOutputTokens: 512 });
    // Limpiar respuesta si contiene markdown
    const cleanResponse = response.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanResponse);
    return (parsed.recommendations || []).slice(0, 3);
  } catch (e) {
    console.warn('[SemanticSearch] Error:', e);
    return [];
  }
}

/**
 * MEJORA 3: Alertas Automáticas - Detecta problemas en el sistema.
 * Analiza stats y genera alertas de mantenimiento, equipos vencidos, anomalías.
 */
export async function generateAutomaticAlerts(
  stats: {
    totalAssets: number;
    maintenanceNeeded: number;
    overdueRequests: number;
    assetsByStatus: Record<string, number>;
    avgBorrowTime: number;
    topAssets: Array<{ name: string; uses: number }>;
  },
  language: 'es' | 'en' | 'pt' = 'es'
): Promise<AIAlert[]> {
  // Construir resumen compacto para no saturar el prompt
  const topAssetsStr = (stats.topAssets || [])
    .slice(0, 3)
    .map(a => `${a.name}(${a.uses})`)
    .join(', ') || 'N/A';

  const promptEs = `Eres un Monitor de Inventario. Responde SOLO con JSON válido, sin markdown.

DATOS DEL SISTEMA:
- Total activos: ${stats.totalAssets}
- Requieren mantenimiento: ${stats.maintenanceNeeded}
- Préstamos vencidos: ${stats.overdueRequests}
- Activos más usados: ${topAssetsStr}

Genera alertas (máximo 3) según las reglas:
- type "MAINTENANCE" si maintenanceNeeded > 0
- type "OVERDUE" si overdueRequests > 0
- type "RECOMMENDATION" si hay patrones de uso relevantes
- Si todo está bien: type "ANOMALY", severity "LOW", title "Sistema OK"

Responde ÚNICAMENTE con este JSON (sin texto extra, sin backticks):
{"alerts":[{"type":"MAINTENANCE","title":"Título","description":"Descripción corta","severity":"HIGH"}]}`;

  const promptEn = `You are an Inventory Monitor. Respond ONLY with valid JSON, no markdown.

SYSTEM DATA:
- Total assets: ${stats.totalAssets}
- Need maintenance: ${stats.maintenanceNeeded}
- Overdue loans: ${stats.overdueRequests}
- Top used assets: ${topAssetsStr}

Generate alerts (max 3):
- type "MAINTENANCE" if maintenanceNeeded > 0
- type "OVERDUE" if overdueRequests > 0
- type "RECOMMENDATION" if relevant usage patterns
- If all OK: type "ANOMALY", severity "LOW", title "System OK"

Respond ONLY with this JSON (no extra text, no backticks):
{"alerts":[{"type":"MAINTENANCE","title":"Title","description":"Short description","severity":"HIGH"}]}`;

  const promptPt = `Você é um Monitor de Inventário. Responda SOMENTE com JSON válido, sem markdown.

DADOS DO SISTEMA:
- Total de ativos: ${stats.totalAssets}
- Precisam de manutenção: ${stats.maintenanceNeeded}
- Empréstimos atrasados: ${stats.overdueRequests}
- Ativos mais usados: ${topAssetsStr}

Gere alertas (máximo 3):
- type "MAINTENANCE" se maintenanceNeeded > 0
- type "OVERDUE" se overdueRequests > 0
- type "RECOMMENDATION" se há padrões de uso relevantes
- Se tudo OK: type "ANOMALY", severity "LOW", title "Sistema OK"

Responda SOMENTE com este JSON (sem texto extra, sem backticks):
{"alerts":[{"type":"MAINTENANCE","title":"Título","description":"Descrição curta","severity":"HIGH"}]}`;

  const prompt = language === 'en' ? promptEn : language === 'pt' ? promptPt : promptEs;

  try {
    const response = await callGemini(prompt, { temperature: 0.1, maxOutputTokens: 2048 });
    
    // Limpiar respuesta: eliminar markdown y extraer JSON
    let cleanResponse = response
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // Si hay texto antes del JSON, extraer solo el objeto JSON
    const jsonStart = cleanResponse.indexOf('{');
    const jsonEnd = cleanResponse.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleanResponse = cleanResponse.slice(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(cleanResponse);
    const alerts = (parsed.alerts || []).map((a: any) => ({
      type: a.type || 'ANOMALY',
      title: a.title || 'Sin título',
      description: a.description || '',
      severity: (['HIGH', 'MEDIUM', 'LOW'].includes(a.severity) ? a.severity : 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
    })) as AIAlert[];

    return alerts.length > 0 ? alerts : [{
      type: 'ANOMALY',
      title: 'Sistema OK',
      description: 'No se detectaron alertas críticas. El sistema opera con normalidad.',
      severity: 'LOW',
    }];
  } catch (e: any) {
    console.error('[AutoAlerts] Error al parsear respuesta de Gemini:', e.message || e);
    const fallbackSeverity: 'MEDIUM' | 'LOW' = (stats.overdueRequests > 0 || stats.maintenanceNeeded > 0) ? 'MEDIUM' : 'LOW';
    return [
      {
        type: 'ANOMALY' as const,
        title: 'Sin Alertas Disponibles',
        description: `Sistema con ${stats.totalAssets} activos, ${stats.maintenanceNeeded} en mantenimiento, ${stats.overdueRequests} préstamos vencidos.`,
        severity: fallbackSeverity,
      }
    ];
  }
}

/**
 * MEJORA 4 + 5: Multi-idioma - Traduce systemInstruction según preferencia de usuario.
 */
export function getLocalizedSystemInstruction(
  userRole: 'USUARIO' | 'ADMIN_PATRIMONIAL' | 'AUDITOR' | 'LIDER_EQUIPO',
  language: 'es' | 'en' | 'pt',
  contextStats: { availableCount?: number; activeRequests?: number; totalAssets?: number }
): string {
  const instructions = {
    es: {
      USUARIO: `Eres el Asistente Inteligente de ZF Halo. Tu objetivo es ayudar al usuario a encontrar las herramientas correctas.
- Activos disponibles: ${contextStats.availableCount || 0}
- Tus solicitudes activas: ${contextStats.activeRequests || 0}
REGLA: Recomienda SOLO activos disponibles que resuelvan su problema. Si pide algo indisponible, no ofrezcas equipos sin relación. Ultra conciso: nombre, TAG y por qué.`,
      ADMIN: `Eres un Analista de Datos Senior. Genera análisis precisos y gráficos bajo demanda.
- Total activos: ${contextStats.totalAssets || 0}
REGLA: Cero relleno. Viñetas y métricas crudas. Gráficos en JSON.`,
    },
    en: {
      USUARIO: `You are ZF Halo's Intelligent Assistant. Help users find the right tools.
- Available assets: ${contextStats.availableCount || 0}
- Your active requests: ${contextStats.activeRequests || 0}
RULE: Recommend ONLY available assets that solve their problem. If they ask for unavailable items, do not offer unrelated assets. Ultra-concise: name, TAG, and why.`,
      ADMIN: `You are a Senior Data Analyst. Generate precise analysis and charts on demand.
- Total assets: ${contextStats.totalAssets || 0}
RULE: Zero filler. Bullets and raw metrics. Charts in JSON format.`,
    },
    pt: {
      USUARIO: `Você é o Assistente Inteligente do ZF Halo. Ajude o usuário a encontrar as ferramentas certas.
- Ativos disponíveis: ${contextStats.availableCount || 0}
- Suas solicitações ativas: ${contextStats.activeRequests || 0}
REGRA: Recomende APENAS ativos disponíveis que resolvam o problema. Se pedir algo indisponível, não ofereça itens sem relação. Ultra-conciso: nome, TAG e por quê.`,
      ADMIN: `Você é um Analista de Dados Sênior. Gere análises precisas e gráficos sob demanda.
- Total de ativos: ${contextStats.totalAssets || 0}
REGRA: Sem preenchimento. Marcadores e métricas brutas. Gráficos em JSON.`,
    }
  };

  const roleKey = ['ADMIN_PATRIMONIAL', 'AUDITOR', 'LIDER_EQUIPO'].includes(userRole) ? 'ADMIN' : 'USUARIO';
  return (instructions[language] || instructions['es'])[roleKey] || instructions['es']['USUARIO'];
}

