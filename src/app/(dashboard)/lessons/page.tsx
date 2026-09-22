import { db } from '@/db';
import { lessons, educationPackages, students, teachers, users, subjects, classrooms } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { LessonForm } from './LessonForm';
import { eq, desc, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export default async function LessonsPage() {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) redirect('/dashboard');

  const orgId = user.organizationId;

  // Fetch form data
  const orgStudents = await db.select({ id: students.id, name: students.firstName }).from(students).where(and(eq(students.organizationId, orgId), eq(students.isArchived, false)));
  const orgTeachers = await db.select({ id: teachers.id, name: users.firstName }).from(teachers).innerJoin(users, eq(teachers.userId, users.id)).where(and(eq(teachers.organizationId, orgId), eq(teachers.isArchived, false)));
  const orgPackages = await db.select().from(educationPackages).where(eq(educationPackages.organizationId, orgId));
  const orgSubjects = await db.select().from(subjects).where(eq(subjects.organizationId, orgId));
  const orgClassrooms = await db.select().from(classrooms).where(eq(classrooms.organizationId, orgId));

  const teacherUsers = alias(users, 'teacher_users');

  // Fetch planned lessons
  const orgLessons = await db.select({
    id: lessons.id,
    startTime: lessons.startTime,
    endTime: lessons.endTime,
    durationMinutes: lessons.durationMinutes,
    status: lessons.status,
    studentName: students.firstName,
    teacherName: teacherUsers.firstName,
    subjectName: subjects.name,
    classroomName: classrooms.name,
  })
  .from(lessons)
  .innerJoin(students, eq(lessons.studentId, students.id))
  .innerJoin(teachers, eq(lessons.teacherId, teachers.id))
  .innerJoin(teacherUsers, eq(teachers.userId, teacherUsers.id))
  .innerJoin(subjects, eq(lessons.subjectId, subjects.id))
  .leftJoin(classrooms, eq(lessons.classroomId, classrooms.id))
  .where(eq(lessons.organizationId, orgId))
  .orderBy(desc(lessons.createdAt));
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ders Planlama</h1>
          <p className="mt-1 text-sm text-gray-500">Öğrencilere yeni dersler atayın ve planlanmış dersleri görün.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Yeni Ders Planla</h2>
            <LessonForm 
              students={orgStudents} 
              teachers={orgTeachers} 
              packages={orgPackages} 
              subjects={orgSubjects} 
              classrooms={orgClassrooms} 
            />
          </div>
        </div>

        <div className="xl:col-span-2 min-w-0">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto min-w-0 w-full pb-2">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih / Saat</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detay (Branş/Süre)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orgLessons.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Planlanmış ders bulunmuyor.</td></tr>
                ) : (
                  orgLessons.map((l) => (
                    <tr key={l.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{new Date(l.startTime).toLocaleDateString('tr-TR')}</div>
                        <div className="text-gray-500">
                          {new Date(l.startTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - 
                          {new Date(l.endTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{l.subjectName} ({Number(l.durationMinutes) >= 60 ? `${Math.round(Number(l.durationMinutes) / 60)} Saat` : `${l.durationMinutes} dk`})</div>
                        <div>Derslik: {l.classroomName || 'Online/Yok'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          l.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          l.status === 'UNEXCUSED' ? 'bg-orange-100 text-orange-800' :
                          l.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                          l.status === 'TEACHER_ABSENT' ? 'bg-purple-100 text-purple-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {l.status === 'COMPLETED' ? 'Derse Katıldı' :
                           l.status === 'UNEXCUSED' ? 'Mazeretsiz' :
                           l.status === 'CANCELLED' ? 'Mazeretli İptal' :
                           l.status === 'TEACHER_ABSENT' ? 'Öğretmen Katılmadı' :
                           'Planlandı'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
