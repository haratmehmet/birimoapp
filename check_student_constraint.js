const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://mentoros_user:mentoros_password@localhost:5432/mentoros_db?schema=public'
});

async function run() {
  try {
    const res = await pool.query(`
      SELECT pg_get_constraintdef(c.oid) AS def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE c.conname = 'student_conflict' AND t.relname = 'lessons';
    `);
    console.log(res.rows[0].def);
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
