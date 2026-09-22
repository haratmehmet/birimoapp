import { db } from './index';
import { users } from './schema';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

async function main() {
  const username = 'admin';
  const plainPassword = 'password123';

  // Check if admin already exists
  const existingAdmin = await db.select().from(users).where(eq(users.username, username));
  
  if (existingAdmin.length > 0) {
    console.log('Admin user already exists.');
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(plainPassword, 10);

  await db.insert(users).values({
    username,
    passwordHash,
    firstName: 'Super',
    lastName: 'Admin',
    isActive: true,
  });

  console.log('Seed completed successfully!');
  console.log(`Username: ${username}`);
  console.log(`Password: ${plainPassword}`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
