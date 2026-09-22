require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  const res = await pool.query(`
    SELECT l.id, l.status, l."package_id", s."first_name", s."last_name" 
    FROM lessons l 
    JOIN students s ON l."student_id" = s.id 
    WHERE s."first_name" ILIKE '%mehmet%' OR s."last_name" ILIKE '%arz%'
  `);
  console.table(res.rows);
  
  const pkgRes = await pool.query(`
    SELECT id, "consumed_minutes", "total_minutes"
    FROM education_packages
    WHERE "student_id" IN (SELECT id FROM students WHERE "first_name" ILIKE '%mehmet%' OR "last_name" ILIKE '%arz%')
  `);
  console.table(pkgRes.rows);
  
  process.exit(0);
}
check();
