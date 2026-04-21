import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgresql://postgres.wfieewcjknhrwgbzdpbo:z7gIIlGx2j3S7Tad@aws-1-us-east-1.pooler.supabase.com:5432/postgres' });

async function run() {
  try {
    await pool.query(`ALTER TABLE requests ADD COLUMN IF NOT EXISTS last_voice_alert_at TIMESTAMP;`);
    console.log('Added last_voice_alert_at to requests');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        subscription JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('push_subscriptions table created');
  } catch(e) {
    console.error('SQL ERROR:', e.message);
  } finally {
    pool.end();
  }
}
run();
