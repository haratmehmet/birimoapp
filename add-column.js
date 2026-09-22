const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://mentoros_user:mentoros_password@localhost:5432/mentoros_db?schema=public",
  });
  
  await client.connect();
  
  try {
    await client.query(`ALTER TABLE education_packages ADD COLUMN hourly_rate VARCHAR(50);`);
    console.log("Column added successfully.");
  } catch (err) {
    console.error("Error adding column:", err);
  } finally {
    await client.end();
  }
}

main();
