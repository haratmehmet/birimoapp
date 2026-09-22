const { Pool } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '.env' });

async function check() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    let orgRes = await pool.query('SELECT id FROM organizations LIMIT 1');
    let orgId;
    
    if (orgRes.rows.length === 0) {
      console.log('No organization found. Creating birimO...');
      const insertOrg = await pool.query('INSERT INTO organizations (name) VALUES ($1) RETURNING id', ['birimO']);
      orgId = insertOrg.rows[0].id;
    } else {
      orgId = orgRes.rows[0].id;
    }

    const hash = await bcrypt.hash('password123', 10);
    const checkUser = await pool.query('SELECT id FROM users WHERE username = $1', ['manager']);
    
    if (checkUser.rows.length === 0) {
      await pool.query('INSERT INTO users (username, password_hash, first_name, last_name, organization_id, is_active) VALUES ($1, $2, $3, $4, $5, $6)', ['manager', hash, 'Kurum', 'Yöneticisi', orgId, true]);
      console.log('Manager user created successfully! Username: manager, Password: password123');
    } else {
      await pool.query('UPDATE users SET organization_id = $1, password_hash = $2 WHERE username = $3', [orgId, hash, 'manager']);
      console.log('Manager user updated successfully! Username: manager, Password: password123');
    }
    
    // Check if we can also make 'admin' an organization admin just in case
    await pool.query('UPDATE users SET organization_id = $1 WHERE username = $2', [orgId, 'admin']);
    console.log('Admin user is now also assigned to an organization so they can view the dashboard!');

  } catch(e) {
    console.error(e);
  } finally {
    pool.end();
  }
}
check();
