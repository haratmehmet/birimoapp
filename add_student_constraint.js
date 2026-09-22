const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://mentoros_user:mentoros_password@localhost:5432/mentoros_db?schema=public'
});

async function run() {
  try {
    // Add student_conflict exclusion constraint
    await pool.query(`
      ALTER TABLE lessons ADD CONSTRAINT student_conflict 
      EXCLUDE USING gist (organization_id WITH =, student_id WITH =, tstzrange(start_time, end_time) WITH &&) 
      WHERE (status != 'CANCELLED')
    `);
    console.log("Student conflict constraint added successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
