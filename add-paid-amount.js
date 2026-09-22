const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://mentoros_user:mentoros_password@localhost:5432/mentoros_db?schema=public",
  });
  
  await client.connect();
  
  try {
    const res = await client.query(`ALTER TABLE education_packages ADD COLUMN paid_amount VARCHAR(50) DEFAULT '0' NOT NULL;`);
    console.log("Column added successfully.");
  } catch (err) {
    if (err.code === '42701') {
       console.log("Column already exists.");
    } else {
       console.error("Error updating rows:", err);
    }
  } finally {
    await client.end();
  }
}

main();
