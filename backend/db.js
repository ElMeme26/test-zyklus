const mysql = require('mysql2/promise');
require('dotenv').config();

// Crear el pool de conexiones (es más eficiente que abrir/cerrar a cada rato)
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '26Leonar', // Tu contraseña de MySQL
  database: process.env.DB_NAME || 'zyklus-test',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Probar conexión al iniciar
pool.getConnection()
  .then(connection => {
    console.log('✅ Conectado exitosamente a MySQL');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Error conectando a MySQL:', err.message);
  });

module.exports = pool;