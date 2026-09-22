const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://mentoros_user:mentoros_password@localhost:5432/mentoros_db?schema=public'
});

async function run() {
  try {
    await pool.query('ALTER TABLE lessons DROP CONSTRAINT teacher_conflict');
    await pool.query(`
      ALTER TABLE lessons ADD CONSTRAINT teacher_conflict 
      EXCLUDE USING gist (organization_id WITH =, teacher_id WITH =, tstzrange(start_time, end_time) WITH &&) 
      WHERE (status != 'CANCELLED')
    `);
    console.log("Constraint updated successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
