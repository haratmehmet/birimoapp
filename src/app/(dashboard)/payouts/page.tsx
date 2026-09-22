import { db } from '@/db';
import { teacherPayouts, teachers, users, educationPackages, lessons, subjects, teacherSubjects } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { TeacherFinanceTable } from './TeacherFinanceTable';
import { DateRangeFilter } from './DateRangeFilter';
import { HideableAmount } from './HideableAmount';
import { eq, desc, and, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DollarSign, Wallet, GraduationCap, Clock, Activity } from 'lucide-react';

export default async function PayoutsPage(props: { searchParams?: Promise<any> | any }) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId || user.role === 'STAFF') redirect('/dashboard');

  const searchParams = await (props.searchParams || Promise.resolve({}));
  
  // Default to current month if no dates are provided
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const startDate = searchParams?.startDate || defaultStart;
  const endDate = searchParams?.endDate || defaultEnd;

  const orgId = user.organizationId;
  const teacherUsers = alias(users, 'teacher_users');

  const isTeacher = user.role === 'TEACHER';

  // 1. Calculate Toplam Kurum Hakediş (Institution Earnings) - only for non-teachers
  let totalRemainingHours = 0;
  if (!isTeacher) {
    const allPackages = await db.select({
      consumedMinutes: educationPackages.consumedMinutes,
      hourlyRate: educationPackages.hourlyRate,
      totalMinutes: educationPackages.totalMinutes,
    })
    .from(educationPackages)
    .where(eq(educationPackages.organizationId, orgId));

    for (const pkg of allPackages) {
      const total = parseInt(pkg.totalMinutes || '0', 10);
      const consumed = parseInt(pkg.consumedMinutes || '0', 10);
      totalRemainingHours += ((total - consumed) / 60);
    }
  }

  // 2. We will calculate Toplam Öğretmen Hakedişler and Toplam Verilen Birebir Ders Saati from the teacher stats below.

  const startTimestamp = startDate ? new Date(`${startDate}T00:00:00`).getTime() : 0;
  const endTimestamp = endDate ? new Date(`${endDate}T23:59:59`).getTime() : Infinity;

  const teacherWhereConditions = [
    eq(teachers.organizationId, orgId),
    eq(teachers.isArchived, false),
  ];
  if (isTeacher && user.teacherId) {
    teacherWhereConditions.push(eq(teachers.id, user.teacherId));
  }

  const teacherStatsRaw = await db.select({
    teacherId: teachers.id,
    firstName: teacherUsers.firstName,
    lastName: teacherUsers.lastName,
    gender: teacherUsers.gender,
    subjectName: subjects.name,
    compensationModel: teachers.compensationModel,
    compensationRate: teachers.compensationRate,
    lessonId: lessons.id,
    studentId: lessons.studentId,
    teacherFeeAmount: lessons.teacherFeeAmount,
    packageHourlyRate: educationPackages.hourlyRate,
    lessonStartTime: lessons.startTime,
  })
  .from(teachers)
  .innerJoin(teacherUsers, eq(teachers.userId, teacherUsers.id))
  .leftJoin(teacherSubjects, eq(teachers.id, teacherSubjects.teacherId))
  .leftJoin(subjects, eq(teacherSubjects.subjectId, subjects.id))
  .leftJoin(lessons, and(
    eq(lessons.teacherId, teachers.id),
    eq(lessons.status, 'COMPLETED')
  ))
  .leftJoin(educationPackages, eq(lessons.packageId, educationPackages.id))
  .where(and(...teacherWhereConditions));

  const teacherMap = new Map();

  for (const row of teacherStatsRaw) {
    if (!teacherMap.has(row.teacherId)) {
      teacherMap.set(row.teacherId, {
        id: row.teacherId,
        firstName: row.firstName,
        lastName: row.lastName,
        gender: row.gender,
        subjectName: row.subjectName,
        compensationModel: row.compensationModel,
        compensationRate: row.compensationRate,
        totalTeacherFee: 0,
        institutionEarnings: 0,
        completedHours: 0,
        periodTeacherFee: 0,
        periodInstitutionEarnings: 0,
        periodCompletedHours: 0,
        uniqueStudentsSet: new Set(),
      });
    }

    const t = teacherMap.get(row.teacherId);

    if (row.lessonId) {
      t.completedHours += 1; // All-time
      
      let teacherFee = parseFloat(row.teacherFeeAmount || '0');
      if (teacherFee === 0 && (row.compensationModel === 'INTERNAL_HOURLY' || row.compensationModel === 'EXTERNAL_HOURLY')) {
        teacherFee = parseFloat(row.compensationRate || '0');
      }
      
      const pkgRate = parseFloat(row.packageHourlyRate || '0');
      const orgEarn = Math.max(0, pkgRate - teacherFee);

      t.totalTeacherFee += teacherFee;
      t.institutionEarnings += orgEarn;
      t.totalCiro = (t.totalCiro || 0) + pkgRate;
      
      if (row.studentId) t.uniqueStudentsSet.add(row.studentId);

      // Period stats
      const lessonTime = row.lessonStartTime ? new Date(row.lessonStartTime).getTime() : 0;
      if (lessonTime >= startTimestamp && lessonTime <= endTimestamp) {
        t.periodTeacherFee += teacherFee;
        t.periodInstitutionEarnings += orgEarn;
        t.periodCompletedHours += 1;
      }
    }
  }

  const teacherStats = Array.from(teacherMap.values()).map(t => {
    const { uniqueStudentsSet, ...rest } = t;
    return {
      ...rest,
      uniqueStudents: uniqueStudentsSet.size,
    };
  });

  const totalOgretmenHakedis = teacherStats.reduce((acc, t) => acc + t.totalTeacherFee, 0);
  const totalKurumHakedis = teacherStats.reduce((acc, t) => acc + t.institutionEarnings, 0);
  const totalCiro = teacherStats.reduce((acc, t) => acc + (t.totalCiro || 0), 0);
  const totalDeliveredHours = teacherStats.reduce((acc, t) => acc + t.completedHours, 0);
  const periodTeacherHakedis = teacherStats.reduce((acc, t) => acc + t.periodTeacherFee, 0);
  const periodDeliveredHours = teacherStats.reduce((acc, t) => acc + t.periodCompletedHours, 0);
  const totalUniqueStudents = teacherStats.reduce((acc, t) => acc + t.uniqueStudents, 0);

  return (
    <div className="flex flex-col space-y-6 pb-8" style={{ minHeight: 'calc(100vh - 150px)' }}>
      <div className="flex-none flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight">
            {isTeacher ? 'Hakedişlerim ve Ders Takibi' : 'Finans ve Hakediş Yönetimi'}
          </h1>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            {isTeacher 
              ? 'Verdiğiniz birebir dersleri, dönemlik çalışma saatlerinizi ve hakedişlerinizi takip edin.' 
              : 'Kurum ve öğretmen hakedişlerini, talep edilen ve verilen ders saatlerini takip edin.'}
          </p>
        </div>
        <DateRangeFilter />
      </div>

      {/* Finance Stats */}
      {isTeacher ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Dönem Hakedişim</p>
                <HideableAmount amount={`${periodTeacherHakedis.toLocaleString('tr-TR')} ₺`} className="text-xl font-black text-gray-900 mt-1" />
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-tight">Seçilen tarih aralığındaki hak edilen kazanç</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">Toplam Hakedişim</p>
                <HideableAmount amount={`${totalOgretmenHakedis.toLocaleString('tr-TR')} ₺`} className="text-xl font-black text-gray-900 mt-1" />
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-tight">Şimdiye kadar tamamlanan tüm dersler</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Tamamlanan Ders Saatim</p>
                <h3 className="text-xl font-black text-gray-900 mt-1">{totalDeliveredHours} Saat</h3>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-tight">Dönemde: {periodDeliveredHours} saat tamamlandı</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Öğrenci Sayım</p>
                <h3 className="text-xl font-black text-gray-900 mt-1">{totalUniqueStudents} Öğrenci</h3>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-tight">Birebir ders verdiğiniz öğrenci sayısı</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">Kurum Toplam Birebir Ciro</p>
                <HideableAmount amount={`${totalCiro.toLocaleString('tr-TR')} ₺`} className="text-xl font-black text-gray-900 mt-1" />
              </div>
              <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center shrink-0">
                <Activity className="w-4 h-4 text-purple-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-tight">Tamamlanan derslerin toplam brüt cirosu</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-emerald-100 p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wide">Toplam Kurum Hakediş</p>
                <HideableAmount amount={`${totalKurumHakedis.toLocaleString('tr-TR')} ₺`} className="text-xl font-black text-gray-900 mt-1" />
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-tight">Tamamlanan dersler bazında kurum kazancı</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">Toplam Öğretmen Hakediş</p>
                <HideableAmount amount={`${totalOgretmenHakedis.toLocaleString('tr-TR')} ₺`} className="text-xl font-black text-gray-900 mt-1" />
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-tight">Tamamlanan dersler bazında öğretmen maliyeti</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Talep Edilen (Kalan)</p>
                <h3 className="text-xl font-black text-gray-900 mt-1">{Math.floor(totalRemainingHours)} Saat</h3>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <GraduationCap className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-tight">Henüz verilmemiş ders saati</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-5 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Verilen Birebir Ders</p>
                <h3 className="text-xl font-black text-gray-900 mt-1">{totalDeliveredHours} Saat</h3>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
            </div>
            <p className="text-[10px] text-gray-500 mt-3 leading-tight">Şu ana kadar tamamlanan ders sayısı</p>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-[400px]">
        <TeacherFinanceTable teachers={teacherStats} isTeacher={isTeacher} />
      </div>
    </div>
  );
}
