import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { db } from '@/db';
import { students, teachers, users, lessons, subjects } from '@/db/schema';
import { eq, and, gte, lt, asc } from 'drizzle-orm';
import { WhatsAppClient } from './WhatsAppClient';
import { addDays, startOfDay } from 'date-fns';

export default async function WhatsAppPage() {
  const { user } = await getCurrentSession();

  if (!user || !user.organizationId || user.role === 'TEACHER') {
    redirect('/dashboard');
  }

  const orgId = user.organizationId;

  // Fetch all students with phones
  const orgStudents = await db.select({
    id: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    phone: students.phone,
    parentName: students.parentName,
    parentPhone: students.parentPhone,
  })
  .from(students)
  .where(and(
    eq(students.organizationId, orgId),
    eq(students.isArchived, false)
  ));

  // Fetch all teachers with phones
  const orgTeachers = await db.select({
    id: teachers.id,
    firstName: users.firstName,
    lastName: users.lastName,
    phone: users.phone,
  })
  .from(teachers)
  .innerJoin(users, eq(teachers.userId, users.id))
  .where(eq(teachers.organizationId, orgId));

  // Fetch planned lessons for the future
  const now = startOfDay(new Date());
  
  const plannedLessonsRaw = await db.select({
    lessonId: lessons.id,
    studentId: lessons.studentId,
    startTime: lessons.startTime,
    endTime: lessons.endTime,
    teacherFirstName: users.firstName,
    teacherLastName: users.lastName,
    subjectName: subjects.name,
  })
  .from(lessons)
  .innerJoin(teachers, eq(lessons.teacherId, teachers.id))
  .innerJoin(users, eq(teachers.userId, users.id))
  .innerJoin(subjects, eq(lessons.subjectId, subjects.id))
  .where(and(
    eq(lessons.organizationId, orgId),
    eq(lessons.status, 'PLANNED'),
    gte(lessons.startTime, now)
  ))
  .orderBy(asc(lessons.startTime));

  // Combine and format contacts
  const contacts = [
    ...orgStudents.map(s => ({
      id: `s_${s.id}`,
      type: 'STUDENT' as const,
      studentId: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      phone: s.phone || '',
      parentName: s.parentName || null,
      parentPhone: s.parentPhone || null,
    })),
    ...orgTeachers.map(t => ({
      id: `t_${t.id}`,
      type: 'TEACHER' as const,
      teacherId: t.id,
      firstName: t.firstName || '',
      lastName: t.lastName || '',
      phone: t.phone || '',
      parentName: null,
      parentPhone: null,
    }))
  ].filter(c => (c.phone && c.phone.trim().length > 5) || (c.parentPhone && c.parentPhone.trim().length > 5));

  return <WhatsAppClient initialContacts={contacts} plannedLessons={plannedLessonsRaw} />;
}
