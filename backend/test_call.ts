import 'dotenv/config';
import { triggerVoiceAlert } from './src/services/notificationService.js';

async function run() {
  const testNumber = process.argv[2];
  
  if (!testNumber) {
    console.error('⚠️ Por favor, proporciona un número de teléfono al cual llamar.');
    console.log('Ejemplo de uso: npx tsx test_call.ts 5512345678');
    process.exit(1);
  }

  console.log(`\nIniciando prueba de llamada a: ${testNumber}`);
  console.log('Asegúrate de que tus credenciales de API Key y TWILIO_STUDIO_FLOW_SID estén correctas en backend/.env\n');

  const nombre = 'Usuario de Prueba';
  const mensaje = 'esta es una prueba del sistema de escalación proactiva a través de Twilio Studio. Si escuchas este mensaje con voz natural, la integración está funcionando.';
  
  console.log(`Disparando Studio Flow con mensaje: "${mensaje}"\n`);
  
  const success = await triggerVoiceAlert(testNumber, nombre, mensaje);
  
  if (success) {
    console.log('\n✅ Ejecución de Studio Flow solicitada exitosamente. Tu teléfono debería sonar en unos segundos.');
  } else {
    console.log('\n❌ Falló el envío. Revisa los errores arriba o verifica tus credenciales.');
  }
  
  process.exit(0);
}

run();
