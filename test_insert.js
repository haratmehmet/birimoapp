const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://mentoros_user:mentoros_password@localhost:5432/mentoros_db?schema=public'
});

async function run() {
  try {
    await pool.query(`
      insert into "lessons" (
        "organization_id", "student_id", "subject_id", "package_id", "teacher_id", 
        "start_time", "end_time", "duration_minutes", "status", "series_id"
      ) values (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
    `, [
      'dcfbe751-98b3-4275-95f7-6c666c75adce',
      'd1ab15f4-42a6-4531-a704-166182c76286',
      '741d867a-26e2-49c7-9838-c46c5ac471ee',
      '08829fd4-9bc1-445a-8eb2-8e0c98f68e7e',
      'd1e418cf-cd0d-4c1a-865e-0e6e44a57e53',
      '2026-08-24T05:00:00.000Z',
      '2026-08-24T05:40:00.000Z',
      '40',
      'PLANNED',
      null
    ]);
    console.log("Success");
  } catch (err) {
    console.error("FAILED");
    console.error(err);
  } finally {
    pool.end();
  }
}

run();
