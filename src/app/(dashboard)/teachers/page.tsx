import { db } from '@/db';
import { teachers, users, teacherSubjects, subjects, lessons } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { TeachersClient } from './TeachersClient';
import { eq, and, sql } from 'drizzle-orm';
import { GraduationCap, BookOpen } from 'lucide-react';

export default async function TeachersPage() {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId || user.role === 'TEACHER') redirect('/dashboard');

  const orgId = user.organizationId;

  // 1. Fetch Subjects for the Form
  const orgSubjects = await db.select().from(subjects).where(eq(subjects.organizationId, orgId));

  // 2. Fetch completed lesson counts per teacher
  const completedLessons = await db.select({
    teacherId: lessons.teacherId,
    count: sql<number>`count(*)`
  })
  .from(lessons)
  .where(and(eq(lessons.organizationId, orgId), eq(lessons.status, 'COMPLETED')))
  .groupBy(lessons.teacherId);

  const lessonCountMap = completedLessons.reduce((acc, curr) => {
    acc[curr.teacherId] = Number(curr.count);
    return acc;
  }, {} as Record<string, number>);

  // 3. Fetch all teachers with user details and subjects
  const teacherList = await db.select({
    id: teachers.id,
    userId: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.username,
    gender: users.gender,
    compensationModel: teachers.compensationModel,
    compensationRate: teachers.compensationRate,
    subjectId: teacherSubjects.subjectId,
    subjectName: subjects.name,
    subjectColor: subjects.color,
    phone: users.phone,
  })
  .from(teachers)
  .innerJoin(users, eq(teachers.userId, users.id))
  .leftJoin(teacherSubjects, eq(teachers.id, teacherSubjects.teacherId))
  .leftJoin(subjects, eq(teacherSubjects.subjectId, subjects.id))
  .where(and(eq(teachers.organizationId, orgId), eq(teachers.isArchived, false)));

  // Map the completed lesson count into the teacher object
  const teachersWithCounts = teacherList.map(t => ({
    ...t,
    completedLessonsCount: lessonCountMap[t.id] || 0
  }));

  return <TeachersClient teachers={teachersWithCounts} subjects={orgSubjects} />;
}
