import { db } from '@/db';
import { teachers, users, teacherSubjects, subjects } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { PoolClient } from './PoolClient';
import { eq, and } from 'drizzle-orm';

export default async function TeachersPoolPage() {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId || user.role === 'TEACHER') redirect('/dashboard');

  const orgId = user.organizationId;

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
  .where(and(eq(teachers.organizationId, orgId), eq(teachers.isArchived, true)));

  return <PoolClient teachers={teacherList} />;
}
