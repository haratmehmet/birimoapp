import { db } from '../src/db';
import { educationPackages, students } from '../src/db/schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
  const pkgs = await db.select({
    id: educationPackages.id,
    title: educationPackages.title,
    studentName: students.firstName,
    totalMins: educationPackages.totalMinutes
  }).from(educationPackages)
    .leftJoin(students, eq(educationPackages.studentId, students.id))
    .orderBy(desc(educationPackages.createdAt))
    .limit(5);
  console.log(pkgs);
}
main().catch(console.error);
