# 📝 Roadmap: Mejoras Pendientes (MEJORA 1 y 5)

Esta guía proporciona pasos detallados para completar las 2 mejoras restantes del módulo de IA.

---

## MEJORA 1: Persistencia del Historial de Chat ⏳

**Objetivo**: Guardar todas las conversaciones para análisis de usuarios y continuidad.

### Fase 1: Migración de Base de Datos (5 mins)

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
```

### Fase 2: Funciones del Servicio Backend (10 mins)

Agregar a `backend/src/services/dataService.ts` funciones para `saveChatMessage` y `getChatHistory`.

### Fase 3: Endpoints de la API Backend (15 mins)

Agregar rutas en `backend/src/routes/ai.ts`:
- `GET /api/ai/history`: Obtener el historial del usuario.
- `POST /api/ai/history/save`: Guardar un nuevo mensaje (llamado internamente).

---

## MEJORA 5: Panel de Validación de Rendimiento 📊

**Objetivo**: Monitorear velocidad de respuesta, uso de tokens y calidad de respuestas.

### Fase 1: Registro en Backend (10 mins)

Actualizar los endpoints en `backend/src/routes/ai.ts` para registrar el tiempo de respuesta y el uso de tokens en una nueva tabla `ai_performance_logs`.

### Fase 2: Tabla de Base de Datos (5 mins)

```sql
CREATE TABLE IF NOT EXISTS ai_performance_logs (
  id SERIAL PRIMARY KEY,
  endpoint VARCHAR(50) NOT NULL,
  user_id UUID,
  response_time_ms INTEGER NOT NULL,
  tokens_used INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## ⏱️ Cronograma Estimado

| Mejora | Total |
|--------|-----------|
| Historial de Chat | **55 min** |
| Panel de Rendimiento | **40 min** |

**Tiempo Total**: ~90 minutos (1.5 horas).
