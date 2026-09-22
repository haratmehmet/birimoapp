import { db } from './src/db';
import { sql } from 'drizzle-orm';
async function run() {
  try {
    await db.execute(sql`ALTER TABLE organizations ADD COLUMN lunch_break_start_time VARCHAR(10)`);
    await db.execute(sql`ALTER TABLE organizations ADD COLUMN lunch_break_end_time VARCHAR(10)`);
    console.log("Success");
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
run();
