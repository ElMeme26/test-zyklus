const express = require('express');
const cors = require('cors');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors()); // Permite peticiones de otros dominios
app.use(express.json()); // Permite recibir JSON en el body (para POST)

// --- RUTAS DE PRUEBA Y API ---

// 1. Obtener todos los activos (Reemplaza a supabase.from('assets'))
app.get('/api/assets', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM assets ORDER BY name ASC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener activos' });
  }
});

// 2. Obtener solicitudes (Con JOIN a users y assets)
app.get('/api/requests', async (req, res) => {
  try {
    // Nota: Ajustamos la query para traer datos del activo y usuario
    const query = `
        SELECT r.*, a.name as asset_name, a.image as asset_image, a.tag as asset_tag, u.name as user_name 
        FROM requests r
        JOIN assets a ON r.asset_id = a.id
        LEFT JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
        `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// 3. Crear solicitud (POST)
app.post('/api/requests', async (req, res) => {
  const { asset_id, user_id, days, motive } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO requests (asset_id, user_id, days_requested, motive, status) VALUES (?, ?, ?, ?, ?)',
      [asset_id, user_id, days, motive, 'PENDING']
    );
    res.json({ id: result.insertId, message: 'Solicitud creada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creando solicitud' });
  }
});

// 4. LOGIN (Simulado, busca por email)
app.post('/api/login', async (req, res) => {
  const { email } = req.body;
  try {
    // Buscamos si el usuario existe en MySQL
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Devolvemos el usuario real (con su ID de MySQL)
    res.json(users[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor Backend corriendo en http://localhost:${PORT}`);
});