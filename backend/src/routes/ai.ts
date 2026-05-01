import { Router, Request, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import { callGemini, generateAIResponse, generatePredictiveReport, semanticAssetSearch, generateAutomaticAlerts, getLocalizedSystemInstruction, type AIContext } from '../services/geminiService.js';
import { pool } from '../db/index.js';

const router = Router();

router.post('/generate', authMiddleware, async (req: Request, res: Response) => {
  const { prompt, temperature, maxOutputTokens } = req.body ?? {};
  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: 'Prompt es requerido.' });
    return;
  }

  try {
    const text = await callGemini(prompt, {
      temperature: typeof temperature === 'number' ? temperature : 0.2,
      maxOutputTokens: typeof maxOutputTokens === 'number' ? maxOutputTokens : 2048,
    });
    res.json({ text });
  } catch (error) {
    console.error('AI generate error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error interno de AI' });
  }
});

/** 
 * Endpoint de chat contextual: inyecta rol y contexto de BD.
 * POST /api/ai/chat
 * Body: { message: string }
 */
router.post('/chat', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { message } = req.body ?? {};
  const userId = req.user?.sub;
  const userRole = req.user?.role as string;

  if (!message || typeof message !== 'string') {
    res.status(400).json({ error: 'Message es requerido.' });
    return;
  }
  if (!userId || !userRole) {
    res.status(401).json({ error: 'Usuario no autenticado.' });
    return;
  }

  const client = await pool.connect();
  try {
    const context: AIContext = {};

    // === CONTEXTO POR ROL ===
    if (userRole === 'USUARIO') {
      // Para usuarios normales: activos disponibles + sus solicitudes activas
      const [availableRes, userReqRes] = await Promise.all([
        client.query(
          `SELECT id, name, tag, category FROM assets 
           WHERE status = 'Disponible'
           ORDER BY name ASC LIMIT 50`
        ),
        client.query(
          `SELECT r.id, r.asset_id, r.status, a.name
           FROM requests r
           LEFT JOIN assets a ON r.asset_id = a.id
           WHERE r.user_id = $1 AND r.status IN ('PENDING', 'ACTION_REQUIRED', 'APPROVED', 'ACTIVE', 'ACTIVE_INTERNAL', 'OVERDUE')
           ORDER BY r.created_at DESC LIMIT 20`,
          [userId]
        ),
      ]);

      context.availableAssets = (availableRes.rows as Array<any>).map(a => ({
        id: a.id,
        name: a.name,
        tag: a.tag,
        category: a.category,
        status: 'Disponible',
      }));

      context.userRequests = (userReqRes.rows as Array<any>).map(r => ({
        id: r.id,
        asset_id: r.asset_id,
        status: r.status,
        assets: { name: r.name },
      }));
    } else {
      // Para admin/auditor/líder: estadísticas globales + alertas de mantenimiento
      const [statsRes, maintenanceRes, categoryRes] = await Promise.all([
        client.query(`
          SELECT 
            jsonb_build_object(
              'total', COUNT(*),
              'Disponible', COUNT(*) FILTER (WHERE status = 'Disponible'),
              'Prestada', COUNT(*) FILTER (WHERE status = 'Prestada'),
              'En mantenimiento', COUNT(*) FILTER (WHERE status = 'En mantenimiento'),
              'En trámite', COUNT(*) FILTER (WHERE status = 'En trámite'),
              'Dada de baja', COUNT(*) FILTER (WHERE status = 'Dada de baja')
            ) as counts
          FROM assets`
        ),
        client.query(`SELECT COUNT(*)::int as alerts FROM assets WHERE maintenance_alert = true`),
        client.query(`
          SELECT category, COUNT(*)::int as count 
          FROM assets 
          WHERE status = 'Disponible'
          GROUP BY category 
          ORDER BY count DESC LIMIT 10`
        ),
      ]);

      const assetCounts = (statsRes.rows[0]?.counts as Record<string, number>) || {};
      const maintenanceAlerts = (maintenanceRes.rows[0]?.alerts as number) || 0;
      const categoryDist = (categoryRes.rows as Array<any>).reduce((acc: Record<string, number>, row) => {
        acc[row.category] = row.count;
        return acc;
      }, {});

      // Solicitudes activas y vencidas
      const [reqStatsRes, detailedReqRes] = await Promise.all([
        client.query(`
          SELECT 
            COUNT(*) FILTER (WHERE status IN ('ACTIVE', 'ACTIVE_INTERNAL')) as active,
            COUNT(*) FILTER (WHERE status = 'OVERDUE') as overdue
          FROM requests`
        ),
        client.query(`
          SELECT r.status, a.name as asset_name, r.requester_name as user_name
          FROM requests r
          LEFT JOIN assets a ON r.asset_id = a.id
          WHERE r.status IN ('OVERDUE', 'ACTIVE', 'ACTIVE_INTERNAL')
          ORDER BY r.status DESC, r.created_at DESC
          LIMIT 30
        `)
      ]);

      const reqStats = reqStatsRes.rows[0] as { active: number; overdue: number };

      context.globalStats = {
        assetCounts,
        requestCounts: { overdue: reqStats.overdue || 0, active: reqStats.active || 0 },
      };
      context.detailedRequests = detailedReqRes.rows.map(r => ({
        status: r.status,
        asset_name: r.asset_name,
        user_name: r.user_name
      }));
      context.categoryDistribution = categoryDist;
      context.maintenanceAlerts = maintenanceAlerts;
    }

    // === GENERAR RESPUESTA CON CONTEXTO ===
    const aiResponse = await generateAIResponse(
      message,
      userRole as 'USUARIO' | 'ADMIN_PATRIMONIAL' | 'AUDITOR' | 'LIDER_EQUIPO',
      context
    );

    res.json({ text: aiResponse });
  } catch (error) {
    console.error('AI chat error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error en chat de IA' });
  } finally {
    client.release();
  }
});

/** 
 * MEJORA 2: Búsqueda Semántica
 * POST /api/ai/semantic-search
 * Body: { problem: string, language?: 'es'|'en'|'pt' }
 * Recomienda activos disponibles que mejor resuelven el problema del usuario.
 */
router.post('/semantic-search', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { problem, language = 'es' } = req.body ?? {};

  if (!problem || typeof problem !== 'string') {
    res.status(400).json({ error: 'Problem description es requerida.' });
    return;
  }

  const client = await pool.connect();
  try {
    // Obtener activos disponibles
    const assetsRes = await client.query(`
      SELECT id, name, tag, category, description 
      FROM assets 
      WHERE status = 'Disponible'
      ORDER BY name ASC
    `);

    const availableAssets = (assetsRes.rows as Array<any>).map(a => ({
      id: a.id,
      name: a.name,
      tag: a.tag,
      category: a.category || 'Sin categoría',
      description: a.description || '',
    }));

    if (availableAssets.length === 0) {
      res.json({ recommendations: [], message: 'No hay activos disponibles.' });
      return;
    }

    // Ejecutar búsqueda semántica con Gemini
    const recommendations = await semanticAssetSearch(problem, availableAssets);
    
    res.json({ 
      recommendations,
      language,
      problem,
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error en búsqueda semántica' });
  } finally {
    client.release();
  }
});

/** 
 * MEJORA 3: Alertas Automáticas
 * POST /api/ai/alerts
 * Body: { language?: 'es'|'en'|'pt' }
 * Genera alertas automáticas basadas en estadísticas del sistema.
 */
router.post('/alerts', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { language = 'es', role, context: bodyContext } = req.body ?? {};
  const userRole = (role || req.user?.role) as string;

  // Solo admins pueden generar alertas
  if (!['ADMIN_PATRIMONIAL', 'AUDITOR', 'LIDER_EQUIPO'].includes(userRole)) {
    res.status(403).json({ error: 'Solo administradores pueden generar alertas.' });
    return;
  }

  const client = await pool.connect();
  try {
    // Recopilar estadísticas del sistema si no vienen en el body (o combinarlas)
    const [assetStatsRes, maintenanceRes, overdueRes, topAssetsRes] = await Promise.all([
      client.query(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(*) FILTER (WHERE maintenance_alert = true)::int as maintenance_needed
        FROM assets
      `),
      client.query(`
        SELECT COUNT(*)::int as count 
        FROM assets 
        WHERE maintenance_alert = true
      `),
      client.query(`
        SELECT COUNT(*)::int as count 
        FROM requests 
        WHERE status = 'OVERDUE'
      `),
      client.query(`
        SELECT a.name, COUNT(*)::int as uses
        FROM requests r
        LEFT JOIN assets a ON r.asset_id = a.id
        WHERE r.status IN ('COMPLETED', 'ACTIVE', 'ACTIVE_INTERNAL')
        GROUP BY a.name
        ORDER BY uses DESC
        LIMIT 5
      `),
    ]);

    const assetStats = assetStatsRes.rows[0] as { total: number; maintenance_needed: number };
    const maintenanceCount = maintenanceRes.rows[0]?.count || 0;
    const overdueCount = overdueRes.rows[0]?.count || 0;
    const topAssets = topAssetsRes.rows as Array<{ name: string; uses: number }>;

    const stats = {
      totalAssets: assetStats.total || 0,
      maintenanceNeeded: maintenanceCount || 0,
      overdueRequests: overdueCount || 0,
      assetsByStatus: {}, // Podría ampliarse con más detalles
      avgBorrowTime: 0, // Podrías calcular este promedio
      topAssets: topAssets || [],
      ...bodyContext // Combinar con el contexto del frontend si existe
    };

    // Validación de contexto vacío
    if (stats.totalAssets === 0 && (!bodyContext || Object.keys(bodyContext).length === 0)) {
      res.json({
        alerts: [{
          type: 'ANOMALY',
          title: 'Sistema sin datos',
          description: 'No hay suficientes datos registrados (activos o solicitudes) para generar un análisis.',
          severity: 'LOW'
        }],
        stats,
        language,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Generar alertas con Gemini
    const alerts = await generateAutomaticAlerts(stats, language as 'es' | 'en' | 'pt');

    res.json({
      alerts,
      stats,
      language,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : 'Error desconocido';
    console.error(`[AI Alerts Error] - Detalle interno:`, error);
    res.status(500).json({ error: 'Error interno generando alertas', detail: errorDetails });
  } finally {
    client.release();
  }
});

router.post('/predictive-report', authMiddleware, async (req: Request, res: Response) => {
  const { requestedAssets, audience } = req.body ?? {};
  if (!Array.isArray(requestedAssets)) {
    res.status(400).json({ error: 'requestedAssets debe ser un arreglo.' });
    return;
  }
  if (audience !== 'administrador' && audience !== 'auditor') {
    res.status(400).json({ error: 'Audiencia no válida.' });
    return;
  }

  try {
    const text = await generatePredictiveReport(requestedAssets, audience);
    res.json({ text });
  } catch (error) {
    console.error('AI predictive report error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Error interno de AI' });
  }
});

export default router;
