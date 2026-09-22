import { db } from '@/db';
import { students, teachers, educationPackages, lessons, subjects, teacherSubjects, users, lessonAttendance } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { eq, and, sql, desc, isNull, inArray } from 'drizzle-orm';
import { DateRangeFilter } from '../payouts/DateRangeFilter';
import { ReportsClient } from './ReportsClient';

export default async function ReportsPage(props: { searchParams?: Promise<any> | any }) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) redirect('/dashboard');
  const orgId = user.organizationId;
  const isTeacher = user.role === 'TEACHER';

  const searchParams = await (props.searchParams || Promise.resolve({}));
  
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const startDate = searchParams?.startDate || defaultStart;
  const endDate = searchParams?.endDate || defaultEnd;

  let teacherStudentIds: string[] = [];
  if (isTeacher && user.teacherId) {
    const teacherStudentLessons = await db.select({ studentId: lessons.studentId })
      .from(lessons)
      .where(eq(lessons.teacherId, user.teacherId));
    teacherStudentIds = Array.from(new Set(teacherStudentLessons.map(l => l.studentId)));
  }

  // --- 1. OVERVIEW STATS ---
  const studentWhereConditions = [eq(students.organizationId, orgId)];
  if (isTeacher) {
    if (teacherStudentIds.length > 0) {
      studentWhereConditions.push(inArray(students.id, teacherStudentIds));
    } else {
      studentWhereConditions.push(sql`1=0`);
    }
  }

  const allStudents = await db.select({ id: students.id, status: students.status, isArchived: students.isArchived })
    .from(students)
    .where(and(...studentWhereConditions));

  const totalStudentsCount = allStudents.length;
  const activeStudentsCount = allStudents.filter(s => !s.isArchived && s.status === 'ACTIVE').length;

  let activeTeachersCount = 1;
  if (!isTeacher) {
    const allTeachers = await db.select({ id: teachers.id }).from(teachers).where(and(eq(teachers.organizationId, orgId), eq(teachers.isArchived, false)));
    activeTeachersCount = allTeachers.length;
  }

  // --- 2. PACKAGE BALANCES ---
  const packageWhereConditions = [eq(educationPackages.organizationId, orgId)];
  if (isTeacher) {
    if (teacherStudentIds.length > 0) {
      packageWhereConditions.push(inArray(educationPackages.studentId, teacherStudentIds));
    } else {
      packageWhereConditions.push(sql`1=0`);
    }
  }

  const orgPackages = await db.select({
    studentId: educationPackages.studentId,
    totalMinutes: educationPackages.totalMinutes,
    consumedMinutes: educationPackages.consumedMinutes,
    status: educationPackages.status,
  }).from(educationPackages).where(and(...packageWhereConditions));

  // Group by student to get total remaining hours per student
  const studentBalances = new Map<string, number>();
  for (const pkg of orgPackages) {
    if (pkg.status !== 'ACTIVE') continue; // Only count active packages
    const total = parseInt(pkg.totalMinutes || '0', 10);
    const consumed = parseInt(pkg.consumedMinutes || '0', 10);
    const remaining = Math.max(0, total - consumed);
    
    if (studentBalances.has(pkg.studentId)) {
      studentBalances.set(pkg.studentId, studentBalances.get(pkg.studentId)! + remaining);
    } else {
      studentBalances.set(pkg.studentId, remaining);
    }
  }

  // Bucket students
  let bucketRed = 0; // 0-5 hours (0-300 mins)
  let bucketOrange = 0; // 6-10 hours (301-600 mins)
  let bucketGreen = 0; // 10+ hours (601+ mins)

  studentBalances.forEach((remainingMins) => {
    if (remainingMins <= 300) bucketRed++;
    else if (remainingMins <= 600) bucketOrange++;
    else bucketGreen++;
  });

  // --- 3. LESSONS (BRANCHES & TIME DENSITY) ---
  const startStr = `${startDate} 00:00:00`;
  const endStr = `${endDate} 23:59:59`;
  const dateFilter = sql`${lessons.startTime} >= ${startStr}::timestamp AND ${lessons.startTime} <= ${endStr}::timestamp`;

  const lessonWhereConditions = [
    eq(lessons.organizationId, orgId),
    dateFilter,
  ];
  if (isTeacher && user.teacherId) {
    lessonWhereConditions.push(eq(lessons.teacherId, user.teacherId));
  }

  const rawOperationalLessons = await db.select({
    id: lessons.id,
    studentId: lessons.studentId,
    studentFirstName: students.firstName,
    studentLastName: students.lastName,
    parentName: students.parentName,
    parentPhone: students.parentPhone,
    teacherId: lessons.teacherId,
    teacherFirstName: users.firstName,
    teacherLastName: users.lastName,
    subjectId: lessons.subjectId,
    subjectName: subjects.name,
    startTime: lessons.startTime,
    endTime: lessons.endTime,
    durationMinutes: lessons.durationMinutes,
    lessonStatus: lessons.status,
    attendanceStatus: lessonAttendance.status,
    excuseReason: lessonAttendance.excuseReason,
    attendanceCreatedAt: lessonAttendance.createdAt,
  })
  .from(lessons)
  .leftJoin(students, eq(lessons.studentId, students.id))
  .leftJoin(teachers, eq(lessons.teacherId, teachers.id))
  .leftJoin(users, eq(teachers.userId, users.id))
  .leftJoin(subjects, eq(lessons.subjectId, subjects.id))
  .leftJoin(lessonAttendance, eq(lessons.id, lessonAttendance.lessonId))
  .where(and(...lessonWhereConditions))
  .orderBy(desc(lessons.startTime), desc(lessonAttendance.createdAt));

  // Deduplicate by lesson id (keeping the latest attendance record)
  const lessonMap = new Map<string, any>();
  const branchMap = new Map<string, any>();
  const timeBuckets = { morning: 0, noon: 0, afternoon: 0, evening: 0 };
  let totalLessonsInPeriod = 0;
  let completedLessonsCount = 0;

  for (const row of rawOperationalLessons) {
    if (lessonMap.has(row.id)) continue;

    // Determine effective operational status
    let effectiveStatus = 'PLANNED';
    if (row.lessonStatus === 'PLANNED') {
      effectiveStatus = 'PLANNED';
    } else if (row.attendanceStatus === 'TEACHER_ABSENT' || row.lessonStatus === 'TEACHER_ABSENT') {
      effectiveStatus = 'TEACHER_ABSENT';
    } else if (row.attendanceStatus === 'UNEXCUSED' || row.lessonStatus === 'UNEXCUSED') {
      effectiveStatus = 'UNEXCUSED';
    } else if (row.attendanceStatus === 'EXCUSED' || row.lessonStatus === 'CANCELLED') {
      effectiveStatus = 'CANCELLED';
    } else if (row.attendanceStatus === 'PRESENT' || row.lessonStatus === 'COMPLETED') {
      effectiveStatus = 'COMPLETED';
    } else {
      effectiveStatus = 'PLANNED';
    }

    const lessonObj = {
      id: row.id,
      studentId: row.studentId,
      studentFirstName: row.studentFirstName || 'Bilinmeyen',
      studentLastName: row.studentLastName || 'Öğrenci',
      parentName: row.parentName || null,
      parentPhone: row.parentPhone || null,
      teacherId: row.teacherId,
      teacherFirstName: row.teacherFirstName || 'Atanmamış',
      teacherLastName: row.teacherLastName || 'Öğretmen',
      subjectId: row.subjectId || 'unknown',
      subjectName: row.subjectName || 'Genel Ders',
      startTime: row.startTime instanceof Date ? row.startTime.toISOString() : String(row.startTime),
      endTime: row.endTime instanceof Date ? row.endTime.toISOString() : String(row.endTime),
      durationMinutes: row.durationMinutes || '60',
      lessonStatus: row.lessonStatus,
      attendanceStatus: row.attendanceStatus || null,
      excuseReason: row.excuseReason || null,
      effectiveStatus,
    };
    lessonMap.set(row.id, lessonObj);

    totalLessonsInPeriod++;
    if (effectiveStatus === 'COMPLETED') {
      completedLessonsCount++;
    }

    // Time density
    if (row.startTime) {
      const dateObj = new Date(row.startTime);
      const hour = dateObj.getHours();
      if (hour >= 8 && hour < 10) timeBuckets.morning++;
      else if (hour >= 10 && hour < 14) timeBuckets.noon++;
      else if (hour >= 14 && hour < 18) timeBuckets.afternoon++;
      else if (hour >= 18) timeBuckets.evening++;
    }

    // Branch aggregation
    const bId = row.subjectId || 'unknown';
    const bName = row.subjectName || 'Genel Ders';
    if (!branchMap.has(bId)) {
      branchMap.set(bId, {
        id: bId,
        name: bName,
        totalLessons: 0,
        completed: 0,
        cancelled: 0,
        unexcused: 0,
        teacherAbsent: 0,
        teachers: new Set(),
        students: new Set(),
      });
    }
    const b = branchMap.get(bId);
    b.totalLessons++;
    if (effectiveStatus === 'COMPLETED') b.completed++;
    if (effectiveStatus === 'CANCELLED') b.cancelled++;
    if (effectiveStatus === 'UNEXCUSED') b.unexcused++;
    if (effectiveStatus === 'TEACHER_ABSENT') b.teacherAbsent++;
    if (row.teacherId) b.teachers.add(row.teacherId);
    if (row.studentId) b.students.add(row.studentId);
  }

  const branchStats = Array.from(branchMap.values()).map(b => ({
    ...b,
    teacherCount: b.teachers.size,
    studentCount: b.students.size,
    percentage: totalLessonsInPeriod > 0 ? Math.round((b.totalLessons / totalLessonsInPeriod) * 100) : 0
  })).sort((a, b) => b.totalLessons - a.totalLessons);

  branchStats.forEach(b => { delete b.teachers; delete b.students; });
  const operationalLessons = Array.from(lessonMap.values());

  // Calculate remaining hours from active packages
  let totalRemainingMinutes = 0;
  for (const pkg of orgPackages) {
    if (pkg.status !== 'ACTIVE') continue;
    const total = parseInt(pkg.totalMinutes || '0', 10);
    const consumed = parseInt(pkg.consumedMinutes || '0', 10);
    totalRemainingMinutes += Math.max(0, total - consumed);
  }
  const remainingHours = Math.floor(totalRemainingMinutes / 60);

  // --- 4. FINANCIAL STATS ---
  const earningsWhereConditions = [
    eq(lessons.organizationId, orgId),
    eq(lessons.status, 'COMPLETED'),
  ];
  if (isTeacher && user.teacherId) {
    earningsWhereConditions.push(eq(lessons.teacherId, user.teacherId));
  }

  const allEarningsLessons = await db.select({
    teacherFeeAmount: lessons.teacherFeeAmount,
    packageHourlyRate: educationPackages.hourlyRate,
    compensationModel: teachers.compensationModel,
    compensationRate: teachers.compensationRate,
    startTime: lessons.startTime,
  })
  .from(lessons)
  .leftJoin(teachers, eq(lessons.teacherId, teachers.id))
  .leftJoin(educationPackages, eq(lessons.packageId, educationPackages.id))
  .where(and(...earningsWhereConditions));

  let totalOrgRevenue = 0;
  let totalTeacherRevenue = 0;
  let periodOrgRevenue = 0;

  const startD = new Date(startStr);
  const endD = new Date(endStr);

  for (const row of allEarningsLessons) {
    let teacherFee = parseFloat(row.teacherFeeAmount || '0');
    if (teacherFee === 0 && (row.compensationModel === 'INTERNAL_HOURLY' || row.compensationModel === 'EXTERNAL_HOURLY')) {
      teacherFee = parseFloat(row.compensationRate || '0');
    }
    const pkgRate = parseFloat(row.packageHourlyRate || '0');
    const orgRev = Math.max(0, pkgRate - teacherFee);
    
    totalOrgRevenue += orgRev;
    totalTeacherRevenue += teacherFee;

    if (row.startTime) {
      const lessonDate = new Date(row.startTime);
      if (lessonDate >= startD && lessonDate <= endD) {
        periodOrgRevenue += orgRev;
      }
    }
  }

  const reportData = {
    totalStudentsCount,
    activeStudentsCount,
    activeTeachersCount,
    remainingHours,
    deliveredHours: completedLessonsCount,
    totalOrgRevenue,
    totalTeacherRevenue,
    periodOrgRevenue,
    bucketRed,
    bucketOrange,
    bucketGreen,
    branchStats,
    timeBuckets,
    totalLessonsInPeriod,
    operationalLessons,
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight">
            {isTeacher ? 'Öğretmen Faaliyet ve Ders Raporlarım' : 'Kurum Raporları'}
          </h1>
          <p className="mt-1.5 text-sm text-gray-500 font-medium">
            {isTeacher 
              ? 'Girdiğiniz derslerin katılım ve faaliyet logları, branş ve zaman analizi.' 
              : 'Ders katılım & faaliyet logları, branş dağılımı ve kurumsal performans analizleri.'}
          </p>
        </div>
        <DateRangeFilter />
      </div>

      <ReportsClient data={reportData} isTeacher={isTeacher} />
    </div>
  );
}
