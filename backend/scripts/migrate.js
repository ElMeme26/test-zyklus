import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
});

async function updateSchema() {
  console.log('Running DB Migration...');
  try {
    const query = `
      ALTER TABLE requests ADD COLUMN IF NOT EXISTS digital_signature TEXT;
      ALTER TABLE requests ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;
      ALTER TABLE requests ADD COLUMN IF NOT EXISTS signature_date TIMESTAMP WITH TIME ZONE;
    `;
    await pool.query(query);
    console.log('Migration successful.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

updateSchema();
