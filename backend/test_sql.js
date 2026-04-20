import { Pool } from 'pg';

const pool = new Pool({ connectionString: 'postgresql://postgres.wfieewcjknhrwgbzdpbo:z7gIIlGx2j3S7Tad@aws-1-us-east-1.pooler.supabase.com:5432/postgres' });

async function run() {
  try {
    const resUsers = await pool.query(`
      SELECT TRIM(split_part(requester_name, ' ', 1) || ' ' || split_part(requester_name, ' ', 2)) as name, 
             COUNT(id)::int as count 
      FROM requests 
      WHERE requester_name IS NOT NULL 
      GROUP BY name 
      ORDER BY count DESC 
      LIMIT 5
    `);
    console.log('USERS:', resUsers.rows);

    const resDisc = await pool.query(`
      WITH ranked AS (
        SELECT r.requester_disciplina as disciplina, 
               TRIM(split_part(COALESCE(a.name, 'Desconocido'), ' ', 1) || ' ' || split_part(COALESCE(a.name, 'Desconocido'), ' ', 2)) as name, 
               COUNT(r.id)::int as count,
               ROW_NUMBER() OVER(
                 PARTITION BY r.requester_disciplina 
                 ORDER BY COUNT(r.id) DESC
               ) as rn
        FROM requests r
        LEFT JOIN assets a ON r.asset_id = a.id
        WHERE r.requester_disciplina IS NOT NULL AND r.requester_disciplina != ''
        GROUP BY r.requester_disciplina, name
      )
      SELECT disciplina, name, count FROM ranked WHERE rn <= 5
    `);
    console.log('DISC:', resDisc.rows);
  } catch(e) {
    console.error('SQL ERROR:', e.message);
  } finally {
    pool.end();
  }
}
run();
