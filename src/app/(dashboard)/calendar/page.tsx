// @ts-nocheck
import { db } from '@/db';
import { lessons, subjects, teachers, users, students, organizations, teacherSubjects, educationPackages, teacherAvailability, classrooms } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { eq, and, gte, lt, asc, sql } from 'drizzle-orm';
import { TimetableGrid } from './TimetableGrid';
import { WeeklyTrackingGrid } from './WeeklyTrackingGrid';
import { format, parseISO, startOfDay, endOfDay, addDays, subDays, getDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import { Settings, Moon, Calendar as CalendarIcon, Clock as ClockIcon } from 'lucide-react';
import { DatePickerNav } from './DatePickerNav';
import { PrintButton } from './PrintButton';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ date?: string, tab?: string }> }) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) redirect('/dashboard');
  const orgId = user.organizationId;

  // 1. Get Settings
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
  if (!org) redirect('/dashboard');

  // 2. Parse Date & Tab
  const params = await searchParams;
  const currentTab = params.tab || 'daily';
  
  if (!params.date) {
    const cookieStore = await cookies();
    const lastDate = cookieStore.get('lastCalendarDate')?.value;
    if (lastDate) {
      redirect(`/calendar?date=${lastDate}&tab=${currentTab}`);
    }
  }

  const selectedDateStr = params.date || format(new Date(), 'yyyy-MM-dd');
  const selectedDate = parseISO(selectedDateStr);
  const activeDaysArr = org.activeDays ? org.activeDays.split(',') : ['1','2','3','4','5','6','7'];
  
  const isDateActive = (d: Date) => {
    const jsD = getDay(d);
    const mapped = jsD === 0 ? '7' : jsD.toString();
    return activeDaysArr.includes(mapped);
  };

  let finalSelectedDate = selectedDate;
  if (!isDateActive(finalSelectedDate)) {
    for (let i = 0; i < 7; i++) {
      finalSelectedDate = addDays(finalSelectedDate, 1);
      if (isDateActive(finalSelectedDate)) break;
    }
  }

  const { startOfWeek, endOfWeek } = await import('date-fns');
  const start = currentTab === 'weekly' ? startOfWeek(finalSelectedDate, { weekStartsOn: 1 }) : startOfDay(finalSelectedDate);
  const end = currentTab === 'weekly' ? endOfWeek(finalSelectedDate, { weekStartsOn: 1 }) : endOfDay(finalSelectedDate);

  const jsDay = getDay(finalSelectedDate); // 0=Sun, 1=Mon...
  const isActiveDay = isDateActive(finalSelectedDate);

  // 2.6 Calculate Prev and Next Dates
  let pDate = currentTab === 'weekly' ? subDays(finalSelectedDate, 7) : subDays(finalSelectedDate, 1);
  if (currentTab !== 'weekly') {
    for (let i = 0; i < 7; i++) {
      if (isDateActive(pDate)) break;
      pDate = subDays(pDate, 1);
    }
  }
  const prevDate = format(pDate, 'yyyy-MM-dd');

  let nDate = currentTab === 'weekly' ? addDays(finalSelectedDate, 7) : addDays(finalSelectedDate, 1);
  if (currentTab !== 'weekly') {
    for (let i = 0; i < 7; i++) {
      if (isDateActive(nDate)) break;
      nDate = addDays(nDate, 1);
    }
  }
  const nextDate = format(nDate, 'yyyy-MM-dd');
  const displayDate = currentTab === 'weekly'
    ? `${format(start, 'd MMMM', { locale: tr })} - ${format(end, 'd MMMM yyyy', { locale: tr })}`
    : format(finalSelectedDate, 'd MMMM yyyy, EEEE', { locale: tr });

  const DAYS_MAP: Record<number, string> = {
    1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY', 4: 'THURSDAY', 
    5: 'FRIDAY', 6: 'SATURDAY', 0: 'SUNDAY'
  };

  const isStaff = user.role === 'STAFF';
  const isTeacher = user.role === 'TEACHER';
  const teacherId = user.teacherId;

  // 3. Fetch Teachers grouped by subjects
  const teacherConditions = [
    eq(teachers.organizationId, orgId),
    eq(teachers.isArchived, false)
  ];
  if (isTeacher && teacherId) {
    teacherConditions.push(eq(teachers.id, teacherId));
  }

  const teacherList = await db.select({
    teacherId: teachers.id,
    firstName: users.firstName,
    lastName: users.lastName,
    subjectId: subjects.id,
    subjectName: subjects.name,
    subjectColor: subjects.color,
    compensationModel: teachers.compensationModel,
  })
  .from(teachers)
  .innerJoin(users, eq(teachers.userId, users.id))
  .innerJoin(teacherSubjects, eq(teachers.id, teacherSubjects.teacherId))
  .innerJoin(subjects, eq(teacherSubjects.subjectId, subjects.id))
  .where(and(...teacherConditions));

  // 4. Fetch Students and their Active Packages (for assignment dropdown)
  const studentConditions = [
    eq(students.organizationId, orgId),
    eq(students.isArchived, false)
  ];
  if (isTeacher && teacherId) {
    studentConditions.push(sql`${students.id} IN (
      SELECT ${lessons.studentId} FROM ${lessons} WHERE ${lessons.teacherId} = ${teacherId}
    )`);
  }

  const studentsRaw = await db.select({
    studentId: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    packageId: educationPackages.id,
    packageTitle: educationPackages.title,
    packageCreatedAt: educationPackages.createdAt,
    packageTotalMinutes: educationPackages.totalMinutes,
    packageConsumedMinutes: educationPackages.consumedMinutes,
  })
  .from(students)
  .leftJoin(educationPackages, and(eq(students.id, educationPackages.studentId), eq(educationPackages.status, 'ACTIVE')))
  .where(and(...studentConditions))
  .orderBy(asc(educationPackages.createdAt));

  // Count PLANNED lesson minutes per package
  const plannedConditions = [
    eq(lessons.organizationId, orgId),
    eq(lessons.status, 'PLANNED')
  ];
  if (isTeacher && teacherId) {
    plannedConditions.push(eq(lessons.teacherId, teacherId));
  }

  const plannedMinutesRaw = await db.select({
    packageId: lessons.packageId,
    totalPlanned: sql<number>`COUNT(${lessons.id}) * 60`,
  })
  .from(lessons)
  .where(and(...plannedConditions))
  .groupBy(lessons.packageId);

  const plannedMinMap: Record<string, number> = {};
  for (const p of plannedMinutesRaw) {
    if (p.packageId) plannedMinMap[p.packageId] = Number(p.totalPlanned);
  }

  // Deduplicate students, keeping only the first (oldest) active package due to the order by clause
  const uniqueStudentsMap = new Map();
  for (const s of studentsRaw) {
    if (!uniqueStudentsMap.has(s.studentId)) {
      const totalMin = parseInt(s.packageTotalMinutes || '0', 10);
      const consumedMin = parseInt(s.packageConsumedMinutes || '0', 10);
      const plannedMin = s.packageId ? (plannedMinMap[s.packageId] || 0) : 0;
      const remainingMin = Math.max(0, totalMin - consumedMin - plannedMin);
      uniqueStudentsMap.set(s.studentId, {
        ...s,
        packageRemainingMinutes: remainingMin,
      });
    }
  }
  const studentsList = Array.from(uniqueStudentsMap.values());

  // 5. Fetch Lessons for selected date
  const dateLessonConditions = [
    eq(lessons.organizationId, orgId),
    gte(lessons.startTime, start),
    lt(lessons.startTime, end)
  ];
  if (isTeacher && teacherId) {
    dateLessonConditions.push(eq(lessons.teacherId, teacherId));
  }

  const dateLessons = await db.select({
    id: lessons.id,
    teacherId: lessons.teacherId,
    studentId: lessons.studentId,
    startTime: lessons.startTime,
    endTime: lessons.endTime,
    status: lessons.status,
    subjectId: lessons.subjectId,
    subjectName: subjects.name,
    subjectColor: subjects.color,
    classroomId: lessons.classroomId,
    classroomName: classrooms.name,
    studentFirstName: students.firstName,
    studentLastName: students.lastName,
    studentPhone: students.phone,
    studentParentName: students.parentName,
    studentParentPhone: students.parentPhone,
    packageId: lessons.packageId,
    packageTotalMinutes: educationPackages.totalMinutes,
    packageConsumedMinutes: educationPackages.consumedMinutes,
  })
  .from(lessons)
  .innerJoin(students, eq(lessons.studentId, students.id))
  .innerJoin(subjects, eq(lessons.subjectId, subjects.id))
  .leftJoin(classrooms, eq(lessons.classroomId, classrooms.id))
  .leftJoin(educationPackages, eq(lessons.packageId, educationPackages.id))
  .where(and(...dateLessonConditions));

  // 6. Fetch Teacher Availabilities (for Availability Tab)
  const availConditions = [eq(teacherAvailability.organizationId, orgId)];
  if (isTeacher && teacherId) {
    availConditions.push(eq(teacherAvailability.teacherId, teacherId));
  }

  const allAvailabilities = await db.select({
    teacherId: teacherAvailability.teacherId,
    dayOfWeek: teacherAvailability.dayOfWeek,
    startTime: teacherAvailability.startTime,
    endTime: teacherAvailability.endTime,
  })
  .from(teacherAvailability)
  .where(and(...availConditions));

  const lessonsWithPackageData = dateLessons.map(lesson => ({
    ...lesson,
    packagePlannedMinutes: lesson.packageId ? (plannedMinMap[lesson.packageId] || 0) : 0,
  }));

  const pageTitle = isTeacher 
    ? (currentTab === 'availability' ? 'Müsaitlik Durumum' : currentTab === 'weekly' ? 'Haftalık Ders Takibim' : 'Ders Programım')
    : (currentTab === 'availability' ? 'Müsaitlik Ders Programı' : currentTab === 'weekly' ? 'Haftalık Ders Takibi' : 'Günlük Ders Programı');

  const pageDesc = isTeacher
    ? 'Kişisel ders programınızı, öğrenci planlamalarınızı ve haftalık müsaitlik durumunuzu takip edin.'
    : (currentTab === 'availability' 
        ? 'Kurumdaki tüm öğretmenlerin haftalık müsaitlik durumunu topluca görüntüleyin.' 
        : currentTab === 'weekly' 
        ? 'Bir hafta boyunca işlenecek tüm dersleri öğrenci ve öğretmen bazında inceleyin.' 
        : 'Öğretmenlerin günlük planlamasını yapın ve ders atamalarını yönetin.');

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 md:h-[calc(100vh-12rem)] flex flex-col print:h-auto print:block print:overflow-visible">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight">
            {pageTitle}
          </h1>
          <p className="mt-2 text-gray-500 font-medium">
            {pageDesc}
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl shadow-sm border border-gray-100">
          <DatePickerNav 
            currentDate={format(finalSelectedDate, 'yyyy-MM-dd')}
            prevDate={prevDate}
            nextDate={nextDate}
            displayDate={displayDate}
          />
          
          <div className="w-px h-8 bg-gray-200 mx-1" />

          <PrintButton />

          {!isTeacher && !isStaff && (
            <>
              <div className="w-px h-8 bg-gray-200 mx-1" />
              <Link 
                href="/settings"
                className="p-2 hover:bg-indigo-50 hover:text-primary rounded-xl transition-colors text-gray-500"
                title="Planlama Ayarları"
              >
                <Settings className="w-5 h-5" />
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-0 print:border-none print:shadow-none print:block print:h-auto print:overflow-visible">
        {!isActiveDay && currentTab !== 'weekly' ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
            <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <Moon className="w-10 h-10 text-indigo-300" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Kurum Kapalı</h2>
            <p className="mt-2 text-gray-500 max-w-md">
              Bugün ({displayDate}) için kurum ayarlarında aktif gün seçilmemiş. Tatil günlerinde programa ders atanamaz veya işlenemez.
            </p>
            <Link href="/settings" className="mt-6 px-6 py-2 bg-white border border-gray-200 shadow-sm rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors">
              Ayarları Düzenle
            </Link>
          </div>
        ) : currentTab === 'weekly' ? (
          <WeeklyTrackingGrid
            selectedDate={finalSelectedDate}
            weekStart={start}
            weekEnd={end}
            orgSettings={{
              start: org.scheduleStartTime,
              end: org.scheduleEndTime,
              lessonDur: parseInt(org.lessonDurationMinutes),
              breakDur: parseInt(org.breakDurationMinutes),
              lunchBreakStart: org.lunchBreakStartTime,
              lunchBreakEnd: org.lunchBreakEndTime,
              activeDays: org.activeDays,
            }}
            teachers={teacherList}
            lessons={lessonsWithPackageData}
          />
        ) : (
          <TimetableGrid 
            mode={currentTab === 'availability' ? 'planning' : 'attendance'}
            selectedDate={format(finalSelectedDate, 'yyyy-MM-dd')}
            dayOfWeek={DAYS_MAP[jsDay]}
            availabilities={allAvailabilities}
            orgSettings={{
              start: org.scheduleStartTime,
              end: org.scheduleEndTime,
              lessonDur: parseInt(org.lessonDurationMinutes),
              breakDur: parseInt(org.breakDurationMinutes),
              lunchBreakStart: org.lunchBreakStartTime,
              lunchBreakEnd: org.lunchBreakEndTime,
              activeDays: org.activeDays,
            }}
            teachers={teacherList}
            students={studentsList}
            lessons={lessonsWithPackageData}
          />
        )}
      </div>
    </div>
  );
}
