import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { 
  generateAIResponse, 
  semanticAssetSearch, 
  generatePredictiveReport, 
  generateAutomaticAlerts 
} from '../src/services/geminiService.js';

async function runTests() {
  console.log("==========================================");
  console.log("🚀 STARTING ZYKLA AI TESTS");
  console.log("==========================================\n");

  const context = {
    availableAssets: [
      { id: '1', name: 'Multímetro Fluke', tag: 'FLK-01', status: 'Disponible' },
      { id: '2', name: 'Cámara Sony 4K', tag: 'CAM-02', status: 'En mantenimiento' },
      { id: '3', name: 'Taladro DeWalt', tag: 'TAL-03', status: 'Disponible' }
    ],
    userRequests: [],
    globalStats: {
      assetCounts: { total: 100, Disponible: 50, Prestada: 30, 'En mantenimiento': 20 },
      requestCounts: { overdue: 5, active: 30 }
    }
  };

  try {
    console.log("--- TEST 1: Usuario Estándar (Búsqueda Semántica) ---");
    const test1_userMessage = "Necesito medir el voltaje de un panel, ¿qué recomiendas?";
    console.log("Prompt:", test1_userMessage);
    const test1_res = await generateAIResponse(test1_userMessage, 'USUARIO', context);
    console.log("Zykla:", test1_res);
    console.log("\n");

    console.log("--- TEST 2: Usuario Estándar (Prueba de Límite/Disponibilidad) ---");
    const test2_userMessage = "Necesito la Cámara Sony 4K para grabar un evento";
    console.log("Prompt:", test2_userMessage);
    const test2_res = await generateAIResponse(test2_userMessage, 'USUARIO', context);
    console.log("Zykla:", test2_res);
    console.log("\n");

    console.log("--- TEST 3: Semantic Asset Search (Recomendaciones JSON) ---");
    const test3_res = await semanticAssetSearch("necesito hacer hoyos en la pared", context.availableAssets);
    console.log("Zykla JSON:", JSON.stringify(test3_res, null, 2));
    console.log("\n");

    console.log("--- TEST 4: Manager/Admin (Gráfica JSON) ---");
    const test4_userMessage = "Genera una gráfica con el estatus de los activos";
    console.log("Prompt:", test4_userMessage);
    const test4_res = await generateAIResponse(test4_userMessage, 'ADMIN_PATRIMONIAL', context);
    console.log("Zykla:", test4_res);
    console.log("\n");

    console.log("--- TEST 5: Manager/Admin (Análisis en Viñetas) ---");
    const test5_userMessage = "Dame las métricas y recomendaciones para optimizar el inventario basado en los datos";
    console.log("Prompt:", test5_userMessage);
    const test5_res = await generateAIResponse(test5_userMessage, 'AUDITOR', context);
    console.log("Zykla:", test5_res);
    console.log("\n");

    console.log("--- TEST 6: Reporte Predictivo ---");
    const requestedAssets = ['Multímetro Fluke', 'Multímetro Fluke', 'Multímetro Fluke', 'Osciloscopio', 'Taladro DeWalt'];
    const test6_res = await generatePredictiveReport(requestedAssets, 'auditor');
    console.log("Zykla:", test6_res);
    console.log("\n");

    console.log("--- TEST 7: Alertas Automáticas (JSON) ---");
    const stats = {
      totalAssets: 100,
      maintenanceNeeded: 5,
      overdueRequests: 3,
      assetsByStatus: { Disponible: 50, Prestada: 30, 'En mantenimiento': 20 },
      avgBorrowTime: 48,
      topAssets: [{ name: 'Multímetro', uses: 20 }]
    };
    const test7_res = await generateAutomaticAlerts(stats, 'es');
    console.log("Zykla JSON:", JSON.stringify(test7_res, null, 2));
    console.log("\n");

  } catch (error) {
    console.error("Test Error:", error);
  }
}

runTests();
