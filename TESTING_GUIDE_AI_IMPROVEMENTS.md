# 🧪 Testing Guide - AI Module Improvements

Guía completa para probar las 3 mejoras implementadas en el módulo de IA.

---

## Prerequisites

✅ Build successful (`npm run build`)
✅ Backend running (`npm run dev --prefix backend`)
✅ Frontend running (`npm run dev --prefix frontend`)
✅ Database connected (Supabase/PostgreSQL)
✅ Gemini API key configured in `.env`

---

## Test 1: Multi-Language Support (MEJORA 4)

### 1.1 UI Testing (Frontend)

**Step 1: Open Chat**
```
Click the floating 💬 button (bottom-right)
```

**Step 2: Check Language Selector**
```
✓ Should see 3 buttons in header: ES, EN, PT
✓ ES should be highlighted by default (purple background)
✓ Buttons should be clickable
```

**Step 3: Test Language Switching**
```
1. Click EN button
   Expected: EN button turns purple, others turn gray
   
2. Click PT button
   Expected: PT button turns purple
   
3. Click ES button
   Expected: EN reverts to gray
```

**Step 4: Test Chat with Different Languages**
```
Language: ES
Message: "¿Cuáles son mis préstamos activos?"
Expected: Response in Spanish

Language: EN
Message: "What are my active loans?"
Expected: Response in English (more formal tone)

Language: PT
Message: "Quais são meus empréstimos ativos?"
Expected: Response in Portuguese
```

### 1.2 Backend Testing (API)

**Test Endpoint**: `POST /api/ai/chat`

**Test 1: Spanish Request**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Necesito una computadora portátil para trabajar",
    "language": "es"
  }'
```

**Expected Response**:
- ✓ Response in Spanish
- ✓ `text` field contains Spanish text
- ✓ HTTP 200 status

**Test 2: English Request**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What equipment should I request?",
    "language": "en"
  }'
```

**Expected Response**:
- ✓ Response in English
- ✓ More formal/professional tone
- ✓ HTTP 200 status

**Test 3: Portuguese Request**
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Quais equipamentos estão disponíveis?",
    "language": "pt"
  }'
```

**Expected Response**:
- ✓ Response in Portuguese (Brasil variant)
- ✓ Uses Portuguese vocabulary and phrasing

### 1.3 Validation

**Check Backend Logs**:
```
Look for: "[ChatAssistant] Language: es/en/pt detected"
Or: Check that systemInstruction was generated for correct language
```

**Verify in Database** (Optional):
```sql
-- Check if chat messages are stored (requires MEJORA 1)
SELECT user_id, language, message, response FROM ai_chat_history LIMIT 5;
```

---

## Test 2: Semantic Search (MEJORA 2)

### 2.1 UI Testing

**Step 1: Open Chat**
```
Click 💬 button -> wait for initial message
```

**Step 2: Click "Buscar activo" Button**
```
✓ Button visible (cyan colored, left side)
✓ Has 🔍 icon
✓ Clicking opens a prompt dialog
```

**Step 3: Enter Problem Description**
```
Dialog prompt: "¿Qué problema quieres resolver?"
Input: "Necesito una computadora portátil para programar en Python"
Click OK
```

**Expected Behavior**:
- ✓ Button shows loading state
- ✓ Chat displays message from user with problem description
- ✓ Bot responds with 3 recommendations
- ✓ Each recommendation shows:
  - Name (e.g., "MacBook Pro")
  - TAG (e.g., "LAPTOP")
  - Confidence % (0-100%)
  - Reason (why it matches)

**Step 4: Different Problem Types**
```
Test with various descriptions:

1. "Necesito grabar videos en 4K"
   Expected: GPU-accelerated laptops recommended

2. "Necesito hacer análisis de datos grandes"
   Expected: High-memory systems recommended

3. "Necesito una impresora de oficina"
   Expected: Printer models recommended
```

### 2.2 Backend Testing

**Endpoint**: `POST /api/ai/semantic-search`

**Test 1: Basic Search**
```bash
curl -X POST http://localhost:3000/api/ai/semantic-search \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "problem": "I need a laptop for video editing",
    "language": "en"
  }'
```

**Expected Response**:
```json
{
  "recommendations": [
    {
      "assetId": "uuid-123",
      "name": "MacBook Pro",
      "tag": "LAPTOP",
      "reason": "Has powerful GPU for video processing",
      "confidence": 0.95
    },
    ...
  ]
}
```

**Test 2: Empty Inventory**
```bash
# If no assets available, should return:
{
  "recommendations": [],
  "message": "No hay activos disponibles."
}
```

**Test 3: Multiple Languages**
```bash
# Spanish
curl ... -d '{"problem": "Necesito...", "language": "es"}'

# Portuguese
curl ... -d '{"problem": "Preciso de...", "language": "pt"}'
```

### 2.3 Validation

**Check Logs**:
```
Backend should log: "[SemanticSearch] Analyzed problem, found 3 matches"
```

**Verify Gemini API Usage**:
```
Monitor API console for tokens consumed
Expected: ~100-200 tokens per search
```

---

## Test 3: Automatic Alerts (MEJORA 3)

### 3.1 UI Testing

**Step 1: Login as Admin**
```
Use account with role: ADMIN_PATRIMONIAL or AUDITOR
```

**Step 2: Open Chat**
```
Click 💬 button
```

**Step 3: Check for "Alertas" Button**
```
✓ Button visible (red/rose colored, right side)
✓ Has 🔔 icon
✓ Only visible if user is ADMIN/AUDITOR/LIDER_EQUIPO
✓ Hidden for regular USUARIO role
```

**Step 4: Click "Alertas" Button**
```
Expected:
- Loading spinner shows
- Chat displays bot message with alerts
- Each alert shows:
  - Type badge (MAINTENANCE, OVERDUE, etc.)
  - Title
  - Description
  - Severity color indicator
```

**Step 5: Check Severity Color Coding**
```
HIGH severity: Red/Rose color (🔴)
MEDIUM severity: Yellow/Amber color (🟡)
LOW severity: Blue/cyan color (🟢)
```

### 3.2 Backend Testing

**Endpoint**: `POST /api/ai/alerts` (Admin-only)

**Test 1: As Admin User**
```bash
curl -X POST http://localhost:3000/api/ai/alerts \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "language": "es"
  }'
```

**Expected Response**:
```json
{
  "alerts": [
    {
      "type": "MAINTENANCE",
      "title": "Critical maintenance backlog",
      "description": "28 assets exceed maintenance threshold",
      "severity": "HIGH"
    },
    {
      "type": "OVERDUE",
      "title": "3 unreturned loans",
      "description": "Assets not returned past due date",
      "severity": "MEDIUM"
    }
  ],
  "stats": {
    "totalAssets": 250,
    "maintenanceNeeded": 28,
    "overdueRequests": 3,
    ...
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Test 2: As Regular User (Should Fail)**
```bash
curl -X POST http://localhost:3000/api/ai/alerts \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "es"}'
```

**Expected Response**:
```
HTTP 403 Forbidden
{
  "error": "Solo administradores pueden generar alertas."
}
```

**Test 3: Different Languages**
```bash
# Spanish
curl ... -d '{"language": "es"}'
# Alert text in Spanish

# English
curl ... -d '{"language": "en"}'
# Alert text in English

# Portuguese
curl ... -d '{"language": "pt"}'
# Alert text in Portuguese
```

### 3.3 Alert Trigger Scenarios

**Test Different System States**:

**Scenario A: High Maintenance Load**
```
Manually update assets in DB:
UPDATE assets SET maintenance_alert = TRUE LIMIT 30;

Expected Alert: HIGH severity maintenance warning
```

**Scenario B: Many Overdue Requests**
```
UPDATE requests SET status = 'OVERDUE' WHERE status = 'ACTIVE' LIMIT 5;

Expected Alert: MEDIUM severity overdue warning
```

**Scenario C: Anomalies**
```
If user requests same asset multiple times:

Expected Alert: ANOMALY - "User requesting same equipment 3x in 1 day"
```

### 3.4 Validation

**Check Logs**:
```
Backend: "[AutoAlerts] Generated N alerts for stats: ..."
Database: Optional - alerts table populated (MEJORA 1 extended)
```

**Verify Alert Quality**:
- ✓ Severity levels are logical
- ✓ Descriptions are actionable
- ✓ Multiple alert types generated (not just one)

---

## Test 4: Integration Tests

### 4.1 Full Conversation Flow

**Scenario**: User finding equipment with semantic search

```
1. Open ChatAssistant
2 Select language: EN
3. Click "Buscar activo"
4. Enter: "I need a GPU-enabled computer for machine learning"
5. Review recommendations
6. Ask in chat: "Can I request number 2?"
7. System responds with loan process
```

**Validation**:
- ✓ Language respected throughout
- ✓ Semantic search results relevant
- ✓ Follow-up questions answered in correct language
- ✓ No console errors

### 4.2 Admin Workflow

**Scenario**: Admin monitoring system health

```
1. Login as ADMIN_PATRIMONIAL
2. Open ChatAssistant
3. Click "Alertas"
4. Review critical alerts
5. Click "Mas info" on maintenance alert (future feature)
6. Ask "Show me the top 5 most borrowed assets"
7. System returns chart in Spanish
```

**Validation**:
- ✓ Admin sees specific menus/buttons
- ✓ Alerts are actionable
- ✓ Can ask follow-up questions in chat
- ✓ Charts display correctly

### 4.3 Cross-Language Consistency

**Test**: Same question in 3 languages

```
1. Language: ES
   "¿Cuántos equipos tengo disponibles?"
   
2. Language: EN
   "How many assets are available?"
   
3. Language: PT
   "Quantos ativos estão disponíveis?"
```

**Validation**:
- ✓ All return same data/counts
- ✓ Responses phrased naturally in each language
- ✓ Formatting consistent (same chart style)

---

## Performance Benchmarks

**Target Metrics**:
| Metric | Target | Status |
|--------|--------|--------|
| Chat response time | <2s | ⏳ TBD |
| Semantic search time | <3s | ⏳ TBD |
| Alert generation time | <5s | ⏳ TBD |
| Token usage per query | 100-300 | ⏳ TBD |

**How to Measure**:
```javascript
// In browser console:
console.time('semantic-search');
await semanticSearch("problem");
console.timeEnd('semantic-search');

// Or check backend logs for timing
```

---

## Common Issues & Troubleshooting

### Issue: Language selector not visible
**Solution**: 
- Clear browser cache
- Verify ChatAssistant.tsx changes compiled
- Check browser console for errors

### Issue: Semantic search returns empty
**Solution**:
- Verify assets exist in database: `SELECT COUNT(*) FROM assets WHERE status='Disponible'`
- Check Gemini API key is valid
- Review backend logs for API errors

### Issue: Alerts button not showing
**Solution**:
- Verify logged-in user is ADMIN role
- Check JWT token includes correct role claim
- Verify user role in database: `SELECT role FROM users WHERE id='...'`

### Issue: Language not changing response
**Solution**:
- Check backend received language parameter
- Verify `getLocalizedSystemInstruction()` function
- Check Gemini API response (sometimes ignores language)

---

## Testing Checklist

**MEJORA 4: Multi-Language**
- [ ] Language selector visible and clickable
- [ ] ES selected by default
- [ ] Can switch to EN, PT
- [ ] Chat responses change language
- [ ] Selected language persists during conversation
- [ ] API endpoint receives language parameter

**MEJORA 2: Semantic Search**
- [ ] Button visible for all users
- [ ] Can enter problem description
- [ ] Returns 3 recommendations
- [ ] Recommendations have name, tag, reason, confidence
- [ ] Recommendations match the problem
- [ ] Works in all 3 languages
- [ ] Handles empty inventory gracefully

**MEJORA 3: Auto-Alerts**
- [ ] Button visible only for ADMIN/AUDITOR
- [ ] Hidden for regular USUARIO
- [ ] Can click to generate alerts
- [ ] Returns multiple alerts
- [ ] Severity color coding visible
- [ ] Works in all 3 languages
- [ ] Admin-only endpoint protection working
- [ ] Alert quality is high (relevant + actionable)

**Integration**
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Build succeeds
- [ ] All endpoints return valid JSON
- [ ] JWT auth working on all endpoints
- [ ] Database queries optimized (< 500ms)

---

## Sign-Off

After completing ALL tests, verify:

✅ All 3 improvements working as designed
✅ No breaking changes to existing features
✅ Performance acceptable (<5s per operation)
✅ Multi-language support functioning
✅ Admin role restrictions enforced
✅ Database queries logged successfully
✅ Ready for production deployment

---

**Test Date**: _______________
**Tester Name**: _______________
**Status**: ✅ PASS / ❌ FAIL
**Notes**: _______________

---

**Last Updated**: 2024
**Version**: 1.0
**QA Ready**: YES ✅
