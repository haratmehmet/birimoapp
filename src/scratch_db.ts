import { db } from './db';
import { sql } from 'drizzle-orm';

async function main() {
  try {
    await db.execute(sql`ALTER TABLE users RENAME COLUMN email TO username;`);
    console.log("Renamed successfully");
  } catch (e: any) {
    if (e.code === '42703') {
       console.log("Column already renamed or doesn't exist");
    } else {
       console.error(e);
       process.exit(1);
    }
  }
  process.exit(0);
}

main();
