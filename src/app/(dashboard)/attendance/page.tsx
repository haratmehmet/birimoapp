import { db } from '@/db';
import { lessons, students, teachers, subjects, users, classrooms, organizations } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { AttendanceTable } from './AttendanceTable';
import { eq, and, gte, lte } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { format, parseISO, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, subDays, addWeeks, subWeeks, addMonths, subMonths, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ date?: string, tab?: string }> }) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) redirect('/dashboard');
  const orgId = user.organizationId;

  // 1. Parse Date & Tab
  const params = await searchParams;
  const currentTab = params.tab || 'daily';
  const selectedDateStr = params.date || format(new Date(), 'yyyy-MM-dd');

  // 1.5 Get Active Days
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  const activeDaysArr = org?.activeDays ? org.activeDays.split(',') : ['1','2','3','4','5','6','7'];
  
  const isDateActive = (d: Date) => {
    const jsD = getDay(d);
    const mapped = jsD === 0 ? '7' : jsD.toString();
    return activeDaysArr.includes(mapped);
  };

  let selectedDate = parseISO(selectedDateStr);
  if (!isDateActive(selectedDate)) {
    for (let i = 0; i < 7; i++) {
      selectedDate = addDays(selectedDate, 1);
      if (isDateActive(selectedDate)) break;
    }
  }
  const finalDateStr = format(selectedDate, 'yyyy-MM-dd');

  // 2. Calculate Date Bounds
  let start: Date;
  let end: Date;
  let prevDateStr: string;
  let nextDateStr: string;
  let displayTitle: string;

  if (currentTab === 'weekly') {
    start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    
    let lastActiveEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
    for (let i = 0; i < 7; i++) {
      if (isDateActive(lastActiveEnd)) break;
      lastActiveEnd = subDays(lastActiveEnd, 1);
    }
    end = lastActiveEnd;

    prevDateStr = format(subWeeks(selectedDate, 1), 'yyyy-MM-dd');
    nextDateStr = format(addWeeks(selectedDate, 1), 'yyyy-MM-dd');
    displayTitle = `${format(start, 'd MMM', { locale: tr })} - ${format(end, 'd MMM yyyy', { locale: tr })}`;
  } else if (currentTab === 'monthly') {
    start = startOfMonth(selectedDate);
    end = endOfMonth(selectedDate);
    prevDateStr = format(subMonths(selectedDate, 1), 'yyyy-MM-dd');
    nextDateStr = format(addMonths(selectedDate, 1), 'yyyy-MM-dd');
    displayTitle = format(selectedDate, 'MMMM yyyy', { locale: tr });
  } else {
    // daily
    start = startOfDay(selectedDate);
    end = endOfDay(selectedDate);

    let pDate = subDays(selectedDate, 1);
    for (let i = 0; i < 7; i++) {
      if (isDateActive(pDate)) break;
      pDate = subDays(pDate, 1);
    }
    prevDateStr = format(pDate, 'yyyy-MM-dd');

    let nDate = addDays(selectedDate, 1);
    for (let i = 0; i < 7; i++) {
      if (isDateActive(nDate)) break;
      nDate = addDays(nDate, 1);
    }
    nextDateStr = format(nDate, 'yyyy-MM-dd');

    displayTitle = format(selectedDate, 'd MMMM yyyy, EEEE', { locale: tr });
  }

  // 3. Fetch Lessons
  const teacherUsers = alias(users, 'teacher_users');
  const isTeacher = user.role === 'TEACHER';

  const whereConditions = [
    eq(lessons.organizationId, orgId),
    gte(lessons.startTime, start),
    lte(lessons.startTime, end),
  ];

  if (isTeacher && user.teacherId) {
    whereConditions.push(eq(lessons.teacherId, user.teacherId));
  }

  const filteredLessons = await db.select({
    id: lessons.id,
    startTime: lessons.startTime,
    endTime: lessons.endTime,
    durationMinutes: lessons.durationMinutes,
    status: lessons.status,
    studentName: students.firstName,
    studentLastName: students.lastName,
    teacherName: teacherUsers.firstName,
    teacherLastName: teacherUsers.lastName,
    subjectName: subjects.name,
    classroomName: classrooms.name,
  })
  .from(lessons)
  .innerJoin(students, eq(lessons.studentId, students.id))
  .innerJoin(teachers, eq(lessons.teacherId, teachers.id))
  .innerJoin(teacherUsers, eq(teachers.userId, teacherUsers.id))
  .innerJoin(subjects, eq(lessons.subjectId, subjects.id))
  .leftJoin(classrooms, eq(lessons.classroomId, classrooms.id))
  .where(and(...whereConditions))
  .orderBy(lessons.startTime);

  // 4. Tab Definitions
  const tabs = [
    { id: 'daily', label: 'Günlük' },
    { id: 'weekly', label: 'Haftalık' },
    { id: 'monthly', label: 'Aylık' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight">
            {isTeacher ? 'Yoklama Listem' : 'Yoklama İzleme'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">
            {isTeacher 
              ? 'Girdiğiniz derslerin yoklama durumlarını ve geçmiş derslerinizi görüntüleyin.' 
              : 'Öğrencilerin yoklama durumlarını ve geçmiş derslerini görüntüleyin.'}
          </p>
        </div>

        {/* Date Filter & Tabs */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Tabs */}
          <div className="flex p-1 bg-white rounded-lg border border-gray-200 shadow-sm">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={`/attendance?tab=${t.id}&date=${finalDateStr}`}
                className={`
                  px-4 py-1.5 text-sm font-semibold rounded-md transition-all duration-200
                  ${currentTab === t.id 
                    ? 'bg-[#004aad] text-white shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}
                `}
              >
                {t.label}
              </Link>
            ))}
          </div>

          {/* Date Navigation */}
          <div className="flex items-center gap-2">
            <Link
              href={`/attendance?tab=${currentTab}&date=${prevDateStr}`}
              className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
            <div className="px-4 py-1.5 bg-white border border-gray-200 rounded-md font-bold text-sm text-gray-800 shadow-sm flex items-center gap-2 min-w-[200px] justify-center">
              <CalendarIcon className="w-4 h-4 text-indigo-500" />
              {displayTitle}
            </div>
            <Link
              href={`/attendance?tab=${currentTab}&date=${nextDateStr}`}
              className="p-1.5 rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-sm"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <AttendanceTable lessons={filteredLessons} />
    </div>
  );
}
