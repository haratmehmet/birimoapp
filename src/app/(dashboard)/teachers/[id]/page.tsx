import { db } from '@/db';
import { teachers, users, teacherSubjects, subjects, lessons } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { eq, and, sql, desc } from 'drizzle-orm';
import { TeacherDetailClient } from './TeacherDetailClient';
import { students, organizations, teacherAvailability } from '@/db/schema';

export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await getCurrentSession();
  
  if (!user || !user.organizationId) {
    redirect('/dashboard');
  }

  const isTeacher = user.role === 'TEACHER';
  if (isTeacher && user.teacherId !== id) {
    redirect('/dashboard');
  }

  const orgId = user.organizationId;

  // 1. Fetch teacher details
  const [teacher] = await db.select({
    id: teachers.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.username,
    phone: users.phone,
    gender: users.gender,
    compensationModel: teachers.compensationModel,
    compensationRate: teachers.compensationRate,
    subjectId: teacherSubjects.subjectId,
    subjectName: subjects.name,
  })
  .from(teachers)
  .innerJoin(users, eq(teachers.userId, users.id))
  .leftJoin(teacherSubjects, eq(teachers.id, teacherSubjects.teacherId))
  .leftJoin(subjects, eq(teacherSubjects.subjectId, subjects.id))
  .where(and(eq(teachers.id, id), eq(teachers.organizationId, orgId)))
  .limit(1);

  if (!teacher) {
    redirect('/teachers');
  }

  // 2. Fetch completed lesson counts
  const [{ count }] = await db.select({
    count: sql<number>`count(*)`
  })
  .from(lessons)
  .where(and(
    eq(lessons.teacherId, id),
    eq(lessons.status, 'COMPLETED')
  ));

  // 3. Fetch unique student count for this teacher
  const [{ studentCount }] = await db.select({
    studentCount: sql<number>`count(distinct ${lessons.studentId})`
  })
  .from(lessons)
  .where(and(
    eq(lessons.teacherId, id),
    eq(lessons.status, 'COMPLETED')
  ));

  // 4. Fetch detailed student lesson stats
  const detailedStudents = await db.select({
    studentId: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    completedHours: sql<number>`count(${lessons.id})::int`,
    lastLessonDate: sql<Date>`max(${lessons.endTime})`,
  })
  .from(lessons)
  .innerJoin(students, eq(lessons.studentId, students.id))
  .where(and(
    eq(lessons.teacherId, id),
    eq(lessons.status, 'COMPLETED')
  ))
  .groupBy(students.id, students.firstName, students.lastName)
  .orderBy(desc(sql`count(${lessons.id})`));

  // 4.5 Fetch initial detailed lessons list
  const initialLessonsList = await db.select({
    id: lessons.id,
    startTime: lessons.startTime,
    endTime: lessons.endTime,
    durationMinutes: lessons.durationMinutes,
    studentFirstName: students.firstName,
    studentLastName: students.lastName,
    subjectName: subjects.name,
  })
  .from(lessons)
  .innerJoin(students, eq(lessons.studentId, students.id))
  .innerJoin(subjects, eq(lessons.subjectId, subjects.id))
  .where(and(
    eq(lessons.teacherId, id),
    eq(lessons.status, 'COMPLETED')
  ))
  .orderBy(desc(lessons.startTime));

  // 5. Fetch Organization Settings (for bounds)
  const [org] = await db.select({
    startHour: organizations.scheduleStartTime,
    endHour: organizations.scheduleEndTime,
    activeDays: organizations.activeDays,
    lessonDurationMinutes: organizations.lessonDurationMinutes,
    breakDurationMinutes: organizations.breakDurationMinutes,
    lunchBreakStartTime: organizations.lunchBreakStartTime,
    lunchBreakEndTime: organizations.lunchBreakEndTime,
  })
  .from(organizations)
  .where(eq(organizations.id, orgId))
  .limit(1);

  // 6. Fetch Teacher Availability
  const availabilities = await db.select({
    dayOfWeek: teacherAvailability.dayOfWeek,
    startTime: teacherAvailability.startTime,
    endTime: teacherAvailability.endTime,
  })
  .from(teacherAvailability)
  .where(and(eq(teacherAvailability.teacherId, id), eq(teacherAvailability.organizationId, orgId)));

  const teacherWithStats = {
    ...teacher,
    completedLessonsCount: Number(count),
    studentCount: Number(studentCount),
    detailedStudents: detailedStudents,
    lessonsList: initialLessonsList,
    availabilities: availabilities,
  };

  return <TeacherDetailClient teacher={teacherWithStats} orgSettings={org} isTeacher={isTeacher} />;
}
