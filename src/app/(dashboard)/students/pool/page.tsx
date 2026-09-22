import { db } from '@/db';
import { students, educationPackages } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { eq, desc, and, sql } from 'drizzle-orm';
import { PoolClient } from './PoolClient';

export default async function StudentsPoolPage() {
  const { user } = await getCurrentSession();

  if (!user || !user.organizationId) {
    redirect('/dashboard');
  }

  const archivedStudents = await db.select({
    id: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    phone: students.phone,
    email: students.email,
    gender: students.gender,
    educationLevel: students.educationLevel,
    grade: students.grade,
    status: students.status,
    parentName: students.parentName,
    parentPhone: students.parentPhone,
    createdAt: students.createdAt,
    totalPackageMinutes: sql<number>`COALESCE(SUM(CAST(${educationPackages.totalMinutes} AS INTEGER)), 0)`.as('totalPackageMinutes'),
    consumedPackageMinutes: sql<number>`COALESCE(SUM(CAST(${educationPackages.consumedMinutes} AS INTEGER)), 0)`.as('consumedPackageMinutes'),
  })
  .from(students)
  .leftJoin(educationPackages, and(
    eq(students.id, educationPackages.studentId),
    eq(educationPackages.status, 'ACTIVE')
  ))
  .where(and(
    eq(students.organizationId, user.organizationId),
    eq(students.isArchived, true)
  ))
  .groupBy(students.id)
  .orderBy(desc(students.updatedAt));

  return (
    <div className="h-full">
      <PoolClient students={archivedStudents} />
    </div>
  );
}
