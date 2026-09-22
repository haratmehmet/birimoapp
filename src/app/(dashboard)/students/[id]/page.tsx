import { db } from '@/db';
import { students, educationPackages } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { eq, and, desc, sql } from 'drizzle-orm';
import { StudentDetailClient } from './StudentDetailClient';

export default async function StudentDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { user } = await getCurrentSession();

  if (!user || !user.organizationId) {
    redirect('/dashboard');
  }

  // Fetch the student
  const [student] = await db.select()
    .from(students)
    .where(and(
      eq(students.id, params.id),
      eq(students.organizationId, user.organizationId)
    ));

  if (!student) {
    redirect('/students');
  }

  const isTeacher = user.role === 'TEACHER';
  const teacherId = user.teacherId;

  // Öğretmen kontrolü: Eğer öğretmen ise bu öğrenciye ders verip vermediği kontrol edilir
  if (isTeacher && teacherId) {
    const { lessons } = await import('@/db/schema');
    const hasLesson = await db.select({ id: lessons.id })
      .from(lessons)
      .where(and(
        eq(lessons.organizationId, user.organizationId),
        eq(lessons.studentId, student.id),
        eq(lessons.teacherId, teacherId)
      ))
      .limit(1);

    if (hasLesson.length === 0) {
      redirect('/students');
    }
  }

  // Fetch student packages
  const packages = await db.select()
    .from(educationPackages)
    .where(and(
      eq(educationPackages.studentId, student.id),
      eq(educationPackages.organizationId, user.organizationId)
    ))
    .orderBy(desc(educationPackages.createdAt));

  // Fetch aggregated planned schedules
  const { lessons, teachers, users, subjects } = await import('@/db/schema');
  
  const scheduleConditions = [
    eq(lessons.studentId, student.id),
    eq(lessons.status, 'PLANNED')
  ];
  if (isTeacher && teacherId) {
    scheduleConditions.push(eq(lessons.teacherId, teacherId));
  }

  const plannedSchedules = await db.select({
    teacherFirstName: users.firstName,
    teacherLastName: users.lastName,
    subjectName: subjects.name,
    totalMinutes: sql<number>`COUNT(${lessons.id}) * 60`.mapWith(Number),
    lessonCount: sql<number>`COUNT(${lessons.id})`.mapWith(Number),
    startDate: sql<string>`MIN(${lessons.startTime})`,
    endDate: sql<string>`MAX(${lessons.startTime})`,
  })
  .from(lessons)
  .innerJoin(teachers, eq(lessons.teacherId, teachers.id))
  .innerJoin(users, eq(teachers.userId, users.id))
  .innerJoin(subjects, eq(lessons.subjectId, subjects.id))
  .where(and(...scheduleConditions))
  .groupBy(users.firstName, users.lastName, subjects.name);

  return (
    <div className="h-full">
      <StudentDetailClient student={student} packages={packages} plannedSchedules={plannedSchedules} isTeacher={isTeacher} />
    </div>
  );
}
