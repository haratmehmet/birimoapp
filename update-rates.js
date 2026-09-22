const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://mentoros_user:mentoros_password@localhost:5432/mentoros_db?schema=public",
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`UPDATE education_packages SET hourly_rate = '1200' WHERE hourly_rate IS NULL OR hourly_rate = '';`);
    console.log(`Updated ${res.rowCount} rows.`);
  } catch (err) {
    console.error("Error updating rows:", err);
  } finally {
    await client.end();
  }
}

main();
