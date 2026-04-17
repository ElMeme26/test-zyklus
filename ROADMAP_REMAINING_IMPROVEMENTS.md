# 📝 Roadmap: Remaining Improvements (MEJORA 1 & 5)

Esta guía proporciona pasos detallados para completar las 2 mejoras restantes del módulo de IA.

---

## MEJORA 1: Chat History Persistence ⏳

**Objetivo**: Guardar todas las conversaciones para análisis de usuarios y continuidad.

### Fase 1: Database Migration (5 mins)

Crear `backend/migrations/004_ai_chat_history.sql`:
```sql
-- Tabla para almacenar historial de chat
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  has_graph BOOLEAN DEFAULT FALSE,
  language VARCHAR(2) DEFAULT 'es',
  tokens_used INTEGER,
  response_time_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_id ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_created_at ON ai_chat_history(created_at DESC);

-- Tabla para alertas generadas automáticamente
CREATE TABLE IF NOT EXISTS ai_alerts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,  -- 'MAINTENANCE', 'OVERDUE', 'RECOMMENDATION', 'ANOMALY'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity VARCHAR(10) NOT NULL,  -- 'LOW', 'MEDIUM', 'HIGH'
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_alerts_user_id ON ai_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_alerts_severity ON ai_alerts(severity);
```

### Fase 2: Backend Service Functions (10 mins)

Agregar a `backend/src/services/dataService.ts`:
```typescript
/**
 * MEJORA 1: Guardar mensaje de chat en historial
 */
export async function saveChatMessage(
  userId: string,
  message: string,
  response: string,
  hasGraph: boolean,
  language: 'es' | 'en' | 'pt' = 'es',
  tokensUsed?: number,
  responseTimeMs?: number
): Promise<{ id: number; created_at: string }> {
  const result = await pool.query(`
    INSERT INTO ai_chat_history (user_id, message, response, has_graph, language, tokens_used, response_time_ms)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, created_at
  `, [userId, message, response, hasGraph, language, tokensUsed || 0, responseTimeMs || 0]);
  
  return result.rows[0];
}

/**
 * MEJORA 1: Obtener historial de chat del usuario
 */
export async function getChatHistory(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<Array<{
  id: number;
  message: string;
  response: string;
  has_graph: boolean;
  language: string;
  created_at: string;
}>> {
  const result = await pool.query(`
    SELECT id, message, response, has_graph, language, created_at
    FROM ai_chat_history
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `, [userId, limit, offset]);
  
  return result.rows;
}

/**
 * MEJORA 3 (Extended): Guardar alerta generada
 */
export async function createAlert(
  userId: string,
  type: 'MAINTENANCE' | 'OVERDUE' | 'RECOMMENDATION' | 'ANOMALY',
  title: string,
  description: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH',
  assetId?: string
): Promise<{ id: number; created_at: string }> {
  const result = await pool.query(`
    INSERT INTO ai_alerts (user_id, type, title, description, severity, asset_id)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, created_at
  `, [userId, type, title, description, severity, assetId || null]);
  
  return result.rows[0];
}

/**
 * MEJORA 3 (Extended): Obtener alertas del usuario
 */
export async function getAlerts(
  userId: string,
  unreadOnly: boolean = false
): Promise<Array<{
  id: number;
  type: string;
  title: string;
  description: string;
  severity: string;
  asset_id?: string;
  is_read: boolean;
  created_at: string;
}>> {
  const query = `
    SELECT id, type, title, description, severity, asset_id, is_read, created_at
    FROM ai_alerts
    WHERE user_id = $1
    ${unreadOnly ? 'AND is_read = FALSE' : ''}
    ORDER BY created_at DESC
    LIMIT 50
  `;
  
  const result = await pool.query(query, [userId]);
  return result.rows;
}

/**
 * MEJORA 3 (Extended): Marcar alerta como leída
 */
export async function markAlertRead(alertId: number): Promise<boolean> {
  const result = await pool.query(`
    UPDATE ai_alerts
    SET is_read = TRUE
    WHERE id = $1
    RETURNING id
  `, [alertId]);
  
  return result.rows.length > 0;
}
```

### Fase 3: Backend API Endpoints (15 mins)

Agregar a `backend/src/routes/ai.ts`:
```typescript
/**
 * MEJORA 1: Obtener historial de chat del usuario
 * GET /api/ai/history?limit=50&offset=0
 */
router.get('/history', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: 'Usuario no autenticado.' });
    return;
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;

  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id, message, response, has_graph, language, created_at
      FROM ai_chat_history
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    res.json({ messages: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/ai/history/save (interno - llamado desde /chat)
 * NOTA: Esto se llama automáticamente desde el endpoint /chat después de guardar el response
 */

/**
 * MEJORA 1 (Extended): Obtener alertas del usuario
 * GET /api/ai/alerts
 */
router.get('/alerts', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.sub;
  if (!userId) {
    res.status(401).json({ error: 'Usuario no autenticado.' });
    return;
  }

  const unreadOnly = req.query.unread === 'true';

  const client = await pool.connect();
  try {
    const query = `
      SELECT id, type, title, description, severity, asset_id, is_read, created_at
      FROM ai_alerts
      WHERE user_id = $1
      ${unreadOnly ? 'AND is_read = FALSE' : ''}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const result = await client.query(query, [userId]);
    res.json({ alerts: result.rows });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Error al obtener alertas' });
  } finally {
    client.release();
  }
});

/**
 * MEJORA 1 (Extended): Marcar alerta como leída
 * POST /api/ai/alerts/:id/read
 */
router.post('/alerts/:id/read', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.sub;
  const alertId = parseInt(req.params.id);

  if (!userId || !alertId) {
    res.status(400).json({ error: 'Parámetros inválidos.' });
    return;
  }

  const client = await pool.connect();
  try {
    const result = await client.query(`
      UPDATE ai_alerts
      SET is_read = TRUE
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [alertId, userId]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Alerta no encontrada.' });
      return;
    }

    res.json({ success: true, alertId });
  } catch (error) {
    console.error('Mark alert read error:', error);
    res.status(500).json({ error: 'Error al marcar alerta' });
  } finally {
    client.release();
  }
});
```

**Importante**: Actualizar el endpoint `/api/ai/chat` para guardar el historial:
```typescript
// Después de generar la respuesta de AI, agregar:
try {
  const { clean, graph } = extractChart(aiResponse);
  await client.query(`
    INSERT INTO ai_chat_history (user_id, message, response, has_graph, language)
    VALUES ($1, $2, $3, $4, $5)
  `, [userId, message, clean || aiResponse, !!graph, language || 'es']);
} catch (err) {
  console.warn('[ChatHistory] Save error:', err);
  // No falles la respuesta si falla el historial
}
```

### Fase 4: Frontend API Functions (5 mins)

Actualizar `frontend/src/api/ai.ts`:
```typescript
/**
 * MEJORA 1: Obtener historial de chat
 */
export async function getChatHistory(
  limit: number = 50,
  offset: number = 0
): Promise<any[]> {
  try {
    const response = await apiFetch<any>(`/ai/history?limit=${limit}&offset=${offset}`, {
      method: 'GET',
    });
    return response?.messages || [];
  } catch (error) {
    console.warn('Chat history error:', error);
    return [];
  }
}

/**
 * MEJORA 1 (Extended): Obtener alertas
 */
export async function getAlerts(unreadOnly: boolean = false): Promise<any[]> {
  try {
    const response = await apiFetch<any>(`/ai/alerts?unread=${unreadOnly}`, {
      method: 'GET',
    });
    return response?.alerts || [];
  } catch (error) {
    console.warn('Get alerts error:', error);
    return [];
  }
}

/**
 * MEJORA 1 (Extended): Marcar alerta como leída
 */
export async function markAlertAsRead(alertId: number): Promise<boolean> {
  try {
    await apiFetch(`/ai/alerts/${alertId}/read`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    return true;
  } catch (error) {
    console.warn('Mark alert error:', error);
    return false;
  }
}
```

### Fase 5: Frontend UI Component (20 mins)

Agregar sección de "Historial de Chat" en ChatAssistant.tsx (debajo del header):
```typescript
// Estado nuevo
const [showHistory, setShowHistory] = useState(false);
const [chatHistory, setChatHistory] = useState<any[]>([]);
const [alerts, setAlerts] = useState<any[]>([]);

// Función para cargar historial
const loadHistory = async () => {
  const history = await getChatHistory(10);
  setChatHistory(history);
};

// Cargar alertas
const loadAlerts = async () => {
  const userAlerts = await getAlerts(false);
  setAlerts(userAlerts);
};

// En el UI, agregar tab/botón para ver historial:
{showHistory ? (
  <div className="p-4 space-y-2">
    <h3 className="text-xs font-bold text-purple-400 mb-2">📜 Historial</h3>
    {chatHistory.map(h => (
      <div key={h.id} className="text-[10px] p-2 bg-slate-800 rounded border border-slate-700">
        <p className="text-slate-400">{h.message.substring(0, 50)}...</p>
        <p className="text-slate-600 text-[9px]">{new Date(h.created_at).toLocaleDateString()}</p>
      </div>
    ))}
  </div>
) : (
  // ...rest of chat UI
)}
```

---

## MEJORA 5: Performance Validation Dashboard 📊

**Objetivo**: Monitorear velocidad de respuesta, uso de tokens y calidad de respuestas.

### Fase 1: Backend Logging (10 mins)

Actualizar `backend/src/routes/ai.ts` para registrar métricas:
```typescript
import { performance } from 'perf_hooks';

// En cada endpoint POST, agregar:
const startTime = performance.now();

try {
  // ... lógica del endpoint
  const endTime = performance.now();
  const responseTimeMs = Math.round(endTime - startTime);
  
  console.log(`[AI_METRICS] Endpoint: /ai/chat | Time: ${responseTimeMs}ms | User: ${userId} | Tokens: ${tokensUsed || 'N/A'}`);
  
  // Guardar en BD (opcional)
  await client.query(`
    INSERT INTO ai_performance_logs (endpoint, user_id, response_time_ms, tokens_used, timestamp)
    VALUES ($1, $2, $3, $4, NOW())
  `, ['/ai/chat', userId, responseTimeMs, tokensUsed || 0]);
} finally {
  // ...
}
```

### Fase 2: Database Table (5 mins)

Agregar a migration:
```sql
CREATE TABLE IF NOT EXISTS ai_performance_logs (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(50) NOT NULL,
  user_id UUID,
  response_time_ms INTEGER NOT NULL,
  tokens_used INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ai_perf_timestamp ON ai_performance_logs(timestamp DESC);
```

### Fase 3: Backend Metrics API (10 mins)

Agregar endpoint en `ai.ts`:
```typescript
/**
 * GET /api/ai/metrics
 * Solo visible para admins
 */
router.get('/metrics', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userRole = req.user?.role;
  
  if (!['ADMIN_PATRIMONIAL', 'AUDITOR'].includes(userRole as string)) {
    res.status(403).json({ error: 'Acceso denegado.' });
    return;
  }

  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT 
        endpoint,
        COUNT(*)::int as requests,
        AVG(response_time_ms)::int as avg_response_ms,
        MAX(response_time_ms)::int as max_response_ms,
        MIN(response_time_ms)::int as min_response_ms,
        COALESCE(SUM(tokens_used), 0)::int as total_tokens
      FROM ai_performance_logs
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY endpoint
      ORDER BY endpoint
    `);

    res.json({ metrics: result.rows, period: '24h' });
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: 'Error al obtener métricas' });
  } finally {
    client.release();
  }
});
```

### Fase 4: Frontend Metrics Display (15 mins)

Crear componente `AIMetricsDashboard.tsx`:
```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export function AIMetricsDashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/ai/metrics');
      setMetrics(response);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-bold text-purple-400">📊 AI Performance (24h)</h3>
      <button onClick={loadMetrics} className="px-3 py-1 bg-purple-600 text-white text-xs rounded">
        {loading ? 'Cargando...' : 'Refrescar Métricas'}
      </button>
      
      {metrics && (
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          {metrics.metrics.map((m: any) => (
            <div key={m.endpoint} className="bg-slate-800 p-2 rounded">
              <p className="font-bold text-purple-400">{m.endpoint}</p>
              <p className="text-slate-400">Promedio: {m.avg_response_ms}ms</p>
              <p className="text-slate-500">Máximo: {m.max_response_ms}ms</p>
              <p className="text-slate-500">Tokens: {m.total_tokens}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## ⏱️ Estimated Timeline

| Mejora | Fase 1 | Fase 2 | Fase 3 | Fase 4 | Fase 5 | **Total** |
|--------|--------|--------|--------|--------|--------|-----------|
| Chat History | 5 min | 10 min | 15 min | 5 min | 20 min | **55 min** |
| Performance | 10 min | 5 min | 10 min | 15 min | - | **40 min** |

**Total Time**: ~90 minutes (1.5 hours) para completar ambas mejoras.

---

## 🔍 Testing Checklist

### Chat History
- [ ] Messages appear in DB after each conversation
- [ ] History loads correctly with GET /history
- [ ] Pagination works (limit/offset)
- [ ] User can't see other users' histories (user_id check)

### Performance Dashboard
- [ ] Metrics logged to DB
- [ ] GET /metrics returns valid data
- [ ] Response times decrease with optimization
- [ ] Token usage tracked accurately

---

## 🎯 Success Criteria

**MEJORA 1**: Chat History is working when:
- ✓ User's past conversations visible in history panel
- ✓ Users can reload a previous conversation
- ✓ Admins can export chat logs for audit

**MEJORA 5**: Performance Dashboard is working when:
- ✓ Metrics show <2s avg response time for /ai/chat
- ✓ Token usage visible and tracked
- ✓ Dashboard updates on demand

---

## 📄 Additional Resources

- [PostgreSQL REFERENCES](https://www.postgresql.org/docs/)
- [Express.js Router Docs](https://expressjs.com/en/api/router.html)
- [Recharts Documentation](https://recharts.org/)
- [JWT Authentication Pattern](https://tools.ietf.org/html/rfc7519)

---

**Last Updated**: 2024
**Status**: Ready for Implementation ✅
