const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://mentoros_user:mentoros_password@localhost:5432/mentoros_db?schema=public'
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT l.id, l.start_time, l.end_time, l.status, u.first_name, u.last_name
      FROM lessons l
      JOIN teachers t ON l.teacher_id = t.id
      JOIN users u ON t.user_id = u.id
      WHERE l.start_time >= '2026-08-24T00:00:00Z' AND l.start_time <= '2026-08-25T00:00:00Z'
      ORDER BY l.start_time ASC;
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
