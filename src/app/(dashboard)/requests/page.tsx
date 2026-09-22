import { db } from '@/db';
import { educationRequests, educationRequestItems, students, users, subjects, organizations } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { RequestForm, ConvertPackageForm } from './RequestForm';
import { eq, desc, and } from 'drizzle-orm';

import { RequestsClient } from './RequestsClient';

export default async function RequestsPage() {
  const { user } = await getCurrentSession();

  if (!user || !user.organizationId || user.role === 'TEACHER') {
    redirect('/dashboard');
  }

  // Fetch available students and subjects for the form
  const orgStudents = await db.select({
    id: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
  }).from(students).where(and(
    eq(students.organizationId, user.organizationId),
    eq(students.isArchived, false)
  ));

  const orgSubjects = await db.select().from(subjects).where(eq(subjects.organizationId, user.organizationId));

  const [orgSettings] = await db.select({
    startHour: organizations.scheduleStartTime,
    endHour: organizations.scheduleEndTime,
    activeDays: organizations.activeDays,
    lessonDurationMinutes: organizations.lessonDurationMinutes,
    breakDurationMinutes: organizations.breakDurationMinutes,
    lunchBreakStartTime: organizations.lunchBreakStartTime,
    lunchBreakEndTime: organizations.lunchBreakEndTime,
  }).from(organizations).where(eq(organizations.id, user.organizationId));
  
  const safeOrgSettings = orgSettings || {};

  // Fetch requests
  const requestsData = await db.select({
    id: educationRequests.id,
    status: educationRequests.status,
    notes: educationRequests.notes,
    createdAt: educationRequests.createdAt,
    studentId: students.id,
    studentFirstName: students.firstName,
    studentLastName: students.lastName,
    subjectName: subjects.name,
  })
  .from(educationRequests)
  .innerJoin(students, eq(educationRequests.studentId, students.id))
  .leftJoin(educationRequestItems, eq(educationRequests.id, educationRequestItems.requestId))
  .leftJoin(subjects, eq(educationRequestItems.subjectId, subjects.id))
  .where(eq(educationRequests.organizationId, user.organizationId))
  .orderBy(desc(educationRequests.createdAt));

  // Group by request since one request can have multiple subjects
  const requestsMap = new Map();
  requestsData.forEach(row => {
    if (!requestsMap.has(row.id)) {
      requestsMap.set(row.id, {
        id: row.id,
        studentId: row.studentId,
        studentName: `${row.studentFirstName} ${row.studentLastName}`,
        status: row.status,
        notes: row.notes,
        createdAt: row.createdAt,
        subjects: []
      });
    }
    if (row.subjectName) {
      requestsMap.get(row.id).subjects.push(row.subjectName);
    }
  });
  return (
    <div className="flex flex-col space-y-6 overflow-hidden" style={{ height: 'calc(100vh - 150px)' }}>
      <div className="flex-none">
        <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight">Eğitim Talepleri & Atamalar</h1>
        <p className="mt-2 text-sm text-gray-500 font-medium">Öğrencilerin eğitim taleplerini yönetin ve uygun öğretmenlere atayın.</p>
      </div>

      <div className="flex-1 overflow-hidden">
        <RequestsClient 
          requests={Array.from(requestsMap.values())} 
          students={orgStudents} 
          subjects={orgSubjects} 
          orgSettings={safeOrgSettings}
        />
      </div>
    </div>
  );
}
