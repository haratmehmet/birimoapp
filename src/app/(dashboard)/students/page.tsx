import { db } from '@/db';
import { students, educationPackages, lessons } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { eq, desc, and, sql } from 'drizzle-orm';
import { StudentsClient } from './StudentsClient';

export default async function StudentsPage() {
  const { user } = await getCurrentSession();

  if (!user || !user.organizationId) {
    redirect('/dashboard');
  }

  const isTeacher = user.role === 'TEACHER';
  const teacherId = user.teacherId;

  const studentConditions = [
    eq(students.organizationId, user.organizationId),
    eq(students.isArchived, false)
  ];

  if (isTeacher && teacherId) {
    studentConditions.push(sql`${students.id} IN (
      SELECT ${lessons.studentId} FROM ${lessons} WHERE ${lessons.teacherId} = ${teacherId}
    )`);
  }

  const orgStudents = await db.select({
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
    totalPackageMinutes: sql<number>`COALESCE(SUM(CAST(${educationPackages.totalMinutes} AS INTEGER)), 0)`.as('totalPackageMinutes'),
    consumedPackageMinutes: sql<number>`COALESCE(SUM(CAST(${educationPackages.consumedMinutes} AS INTEGER)), 0)`.as('consumedPackageMinutes'),
  })
  .from(students)
  .leftJoin(educationPackages, and(
    eq(students.id, educationPackages.studentId),
    eq(educationPackages.status, 'ACTIVE')
  ))
  .where(and(...studentConditions))
  .groupBy(students.id)
  .orderBy(desc(students.createdAt));

  return (
    <div className="h-full">
      <StudentsClient students={orgStudents} isTeacher={isTeacher} />
    </div>
  );
}
