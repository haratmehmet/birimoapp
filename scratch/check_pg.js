const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://mentoros_user:mentoros_password@localhost:5432/mentoros_db'
  });
  await client.connect();
  const res = await client.query('SELECT status, start_time FROM lessons');
  console.log(res.rows);
  await client.end();
}
main();
