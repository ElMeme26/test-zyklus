import { apiFetch } from './client';

export interface SemanticRecommendation {
  assetId: string;
  name: string;
  tag: string;
  reason: string;
  confidence: number;
}

export interface AutomaticAlert {
  type: 'MAINTENANCE' | 'OVERDUE' | 'RECOMMENDATION' | 'ANOMALY';
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface SystemStats {
  totalAssets: number;
  maintenanceNeeded: number;
  overdueRequests: number;
  assetsByStatus: Record<string, number>;
  avgBorrowTime: number;
  topAssets: Array<{ name: string; uses: number }>;
}

/**
 * MEJORA 2: Búsqueda Semántica
 * Obtiene recomendaciones de activos basadas en la descripción del problema del usuario
 */
export async function semanticSearch(
  problem: string,
  language: 'es' | 'en' | 'pt' = 'es'
): Promise<SemanticRecommendation[]> {
  const response = await apiFetch<any>('/api/ai/semantic-search', {
    method: 'POST',
    body: JSON.stringify({ problem, language }),
  });

  return response?.recommendations || [];
}

/**
 * MEJORA 3: Alertas Automáticas
 * Genera alertas automáticas basadas en estadísticas del sistema
 */
export async function generateAutoAlerts(
  language: 'es' | 'en' | 'pt' = 'es',
  role?: string,
  context?: any
): Promise<{
  alerts: AutomaticAlert[];
  stats: SystemStats;
  language: string;
  timestamp: string;
}> {
  // Asegurar que el contexto no tenga referencias circulares
  const safeContext = context ? JSON.parse(JSON.stringify(context)) : undefined;

  const response = await apiFetch<any>('/api/ai/alerts', {
    method: 'POST',
    body: JSON.stringify({ language, role, context: safeContext }),
    timeout: 60000, // Aumentar timeout a 60s
  });

  return response || { alerts: [], stats: {} as SystemStats, language, timestamp: new Date().toISOString() };
}

/**
 * MEJORA 4: Preferencia de Idioma para Chat
 * Envía un mensaje de chat con preferencia de idioma
 */
export async function chatWithLanguage(
  message: string,
  language: 'es' | 'en' | 'pt' = 'es'
): Promise<string> {
  const response = await apiFetch<any>('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, language }),
  });

  return response?.text || '';
}

/**
 * MEJORA 1: Historial de Chat (futuro)
 * Placeholder para función de historial
 */
export async function getChatHistory(limit: number = 50): Promise<any[]> {
  try {
    const response = await apiFetch<any>(`/ai/history?limit=${limit}`, {
      method: 'GET',
    });
    return response?.messages || [];
  } catch (error) {
    console.warn('Chat history not available yet:', error);
    return [];
  }
}
