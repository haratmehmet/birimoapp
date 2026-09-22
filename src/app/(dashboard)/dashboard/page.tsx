import { getCurrentSession } from '@/lib/session';
import { db } from '@/db';
import { students, teachers, lessons, subjects, educationPackages, users, educationRequests } from '@/db/schema';
import { eq, and, gte, lt, lte, desc, not, sql } from 'drizzle-orm';
import { Users, GraduationCap, Clock, Wallet, CheckCircle2, TrendingUp, XCircle, AlertTriangle, Battery, ShieldCheck, Activity, FileText, Globe, ExternalLink } from 'lucide-react';
import { HideableAmount } from '../payouts/HideableAmount';
import { SuperAdminDashboard } from './SuperAdminDashboard';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { session, user } = await getCurrentSession();
  
  if (!session) {
    redirect('/login');
  }

  if (!user?.organizationId) {
    return <SuperAdminDashboard user={user} />;
  }

  const orgId = user.organizationId;
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

  const isStaff = user.role === 'STAFF';
  const isTeacher = user.role === 'TEACHER';
  const teacherId = user.teacherId;

  // 1. STATS: Aktif Öğrenci, Aktif Öğretmen
  const activeStudents = await db.select({ id: students.id }).from(students).where(and(eq(students.organizationId, orgId), eq(students.isArchived, false)));
  const activeTeachers = await db.select({ id: teachers.id }).from(teachers).where(and(eq(teachers.organizationId, orgId), eq(teachers.isArchived, false)));

  // Öğretmene özel atanmış / ders verdiği öğrenci sayısı
  let teacherStudentCount = 0;
  if (isTeacher && teacherId) {
    const teacherStudentsQuery = await db.select({ studentId: lessons.studentId })
      .from(lessons)
      .where(and(eq(lessons.organizationId, orgId), eq(lessons.teacherId, teacherId)))
      .groupBy(lessons.studentId);
    teacherStudentCount = teacherStudentsQuery.length;
  }

  // 2. STATS: Bu Aylık Tamamlanan Ders Saati
  const monthLessonsConditions = [
    eq(lessons.organizationId, orgId),
    gte(lessons.startTime, startOfMonth),
    lte(lessons.startTime, endOfMonth),
    eq(lessons.status, 'COMPLETED')
  ];
  if (isTeacher && teacherId) {
    monthLessonsConditions.push(eq(lessons.teacherId, teacherId));
  }

  const monthLessons = await db.select({
    id: lessons.id,
    durationMinutes: lessons.durationMinutes,
    status: lessons.status
  }).from(lessons)
  .where(and(...monthLessonsConditions));

  const thisMonthHours = monthLessons.length;

  // 3. STATS: Hakediş Hesaplamaları
  let thisMonthRevenue = 0;
  let teacherThisMonthEarnings = 0;

  if (isTeacher && teacherId) {
    // Öğretmenin bu ayki tamamlanan derslerden kazandığı toplam tutar
    const teacherMonthLessons = await db.select({
      teacherFeeAmount: lessons.teacherFeeAmount,
      compensationModel: teachers.compensationModel,
      compensationRate: teachers.compensationRate,
    })
    .from(lessons)
    .leftJoin(teachers, eq(lessons.teacherId, teachers.id))
    .where(and(
      eq(lessons.organizationId, orgId),
      eq(lessons.teacherId, teacherId),
      eq(lessons.status, 'COMPLETED'),
      gte(lessons.startTime, startOfMonth),
      lte(lessons.startTime, endOfMonth)
    ));

    for (const row of teacherMonthLessons) {
      let fee = parseFloat(row.teacherFeeAmount || '0');
      if (fee === 0 && (row.compensationModel === 'INTERNAL_HOURLY' || row.compensationModel === 'EXTERNAL_HOURLY')) {
        fee = parseFloat(row.compensationRate || '0');
      }
      teacherThisMonthEarnings += fee;
    }
  } else if (!isStaff) {
    // Kurum Aylık Hakediş (Finans modülüyle eşleşmesi için - Sadece Yönetici ve Süper Admin için)
    const monthEarningsLessons = await db.select({
      teacherFeeAmount: lessons.teacherFeeAmount,
      packageHourlyRate: educationPackages.hourlyRate,
      compensationModel: teachers.compensationModel,
      compensationRate: teachers.compensationRate,
    })
    .from(lessons)
    .leftJoin(teachers, eq(lessons.teacherId, teachers.id))
    .leftJoin(educationPackages, eq(lessons.packageId, educationPackages.id))
    .where(
      and(
        eq(lessons.organizationId, orgId),
        eq(lessons.status, 'COMPLETED'),
        gte(lessons.startTime, startOfMonth),
        lt(lessons.startTime, endOfMonth)
      )
    );

    for (const row of monthEarningsLessons) {
      let teacherFee = parseFloat(row.teacherFeeAmount || '0');
      if (teacherFee === 0 && (row.compensationModel === 'INTERNAL_HOURLY' || row.compensationModel === 'EXTERNAL_HOURLY')) {
        teacherFee = parseFloat(row.compensationRate || '0');
      }
      const pkgRate = parseFloat(row.packageHourlyRate || '0');
      thisMonthRevenue += Math.max(0, pkgRate - teacherFee);
    }
  }

  // 4. EĞİTİM TALEPLERİ / PLANLANAN DERSLER (Öğretmen için Planlanan Dersler)
  let pendingRequestsCount = 0;
  let teacherPlannedLessonsCount = 0;

  if (isTeacher && teacherId) {
    const plannedLessonsQuery = await db.select({ count: sql<number>`count(*)` })
      .from(lessons)
      .where(and(
        eq(lessons.organizationId, orgId),
        eq(lessons.teacherId, teacherId),
        eq(lessons.status, 'PLANNED'),
        gte(lessons.startTime, startOfMonth),
        lte(lessons.startTime, endOfMonth)
      ));
    teacherPlannedLessonsCount = Number(plannedLessonsQuery[0]?.count || 0);
  } else {
    const pendingRequestsQuery = await db.select({ count: sql<number>`count(*)` })
      .from(educationRequests)
      .where(and(eq(educationRequests.organizationId, orgId), eq(educationRequests.status, 'PENDING')));
    pendingRequestsCount = pendingRequestsQuery[0]?.count || 0;
  }

  // 5. BRANŞ DAĞILIMI VE GÜN/SAAT YOĞUNLUĞU
  const branchLessonsConditions = [
    eq(lessons.organizationId, orgId),
    gte(lessons.startTime, startOfMonth),
    lt(lessons.startTime, endOfMonth)
  ];
  if (isTeacher && teacherId) {
    branchLessonsConditions.push(eq(lessons.teacherId, teacherId));
  }

  const allMonthLessons = await db.select({
    subjectId: lessons.subjectId,
    subjectName: subjects.name,
    startTime: lessons.startTime
  })
  .from(lessons)
  .leftJoin(subjects, eq(lessons.subjectId, subjects.id))
  .where(and(...branchLessonsConditions));

  const subjectCounts: Record<string, number> = {};
  const timeBuckets = { morning: 0, noon: 0, afternoon: 0, evening: 0 };
  let totalBranchLessons = 0;
  
  allMonthLessons.forEach(l => {
    const name = l.subjectName || 'Bilinmeyen Branş';
    if (subjectCounts[name] === undefined) {
      subjectCounts[name] = 0;
    }
    subjectCounts[name]++;
    totalBranchLessons++;

    if (l.startTime) {
      const dateObj = new Date(l.startTime);
      const hour = dateObj.getHours();
      if (hour >= 8 && hour < 10) timeBuckets.morning++;
      else if (hour >= 10 && hour < 14) timeBuckets.noon++;
      else if (hour >= 14 && hour < 18) timeBuckets.afternoon++;
      else if (hour >= 18) timeBuckets.evening++;
    }
  });

  const branchData = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalBranchLessons > 0 ? Math.round((count / totalBranchLessons) * 100) : 0
    }));

  const pieColors = ['#004aad', '#ff914d', '#10b981', '#8b5cf6', '#f43f5e', '#06b6d4', '#eab308', '#ec4899', '#6366f1'];

  // Time Density Chart Data
  const timeDensityTotal = timeBuckets.morning + timeBuckets.noon + timeBuckets.afternoon + timeBuckets.evening;
  const timeBucketsArr = [
    { label: '08:00 - 10:00 (Düşük)', value: timeBuckets.morning, color: '#93c5fd' },
    { label: '10:00 - 14:00 (Orta)', value: timeBuckets.noon, color: '#60a5fa' },
    { label: '14:00 - 18:00 (Yüksek)', value: timeBuckets.afternoon, color: '#3b82f6' },
    { label: '18:00 - 21:00+ (Çok Yüksek)', value: timeBuckets.evening, color: '#1d4ed8' }
  ];

  let currentDegree = 0;
  const timeStops = timeBucketsArr.map((b) => {
    const percentage = timeDensityTotal > 0 ? (b.value / timeDensityTotal) * 100 : 0;
    const deg = (percentage / 100) * 360;
    const stop = `${b.color} ${currentDegree}deg ${currentDegree + deg}deg`;
    currentDegree += deg;
    return stop;
  });
  const timeConicGradient = `conic-gradient(${timeStops.join(', ')})`;

  // 5. ÖĞRENCİ PAKET DURUMU (Yalnızca Kurum / Yönetici için)
  let redPackages = 0;
  let orangePackages = 0;
  let greenPackages = 0;

  if (!isTeacher) {
    const packageConditions = [
      eq(educationPackages.organizationId, orgId),
      eq(educationPackages.status, 'ACTIVE')
    ];

    const allPackages = await db.select({
      totalMinutes: educationPackages.totalMinutes,
      consumedMinutes: educationPackages.consumedMinutes
    }).from(educationPackages)
    .where(and(...packageConditions));

    allPackages.forEach(pkg => {
      const remaining = Math.floor((parseInt(pkg.totalMinutes || '0', 10) - parseInt(pkg.consumedMinutes || '0', 10)) / 60);
      if (remaining <= 5) redPackages++;
      else if (remaining <= 10) orangePackages++;
      else greenPackages++;
    });
  }

  // 6. EĞİTİM AKTİVİTESİ (Son 4 İşlem)
  const recentConditions = [eq(lessons.organizationId, orgId)];
  if (isTeacher && teacherId) {
    recentConditions.push(eq(lessons.teacherId, teacherId));
  }

  const recentActivity = await db.select({
    id: lessons.id,
    status: lessons.status,
    startTime: lessons.startTime,
    studentFirstName: students.firstName,
    studentLastName: students.lastName,
    teacherFirstName: users.firstName,
    teacherLastName: users.lastName,
    subjectName: subjects.name
  })
  .from(lessons)
  .leftJoin(students, eq(lessons.studentId, students.id))
  .leftJoin(teachers, eq(lessons.teacherId, teachers.id))
  .leftJoin(users, eq(teachers.userId, users.id))
  .leftJoin(subjects, eq(lessons.subjectId, subjects.id))
  .where(and(...recentConditions))
  .orderBy(desc(lessons.updatedAt))
  .limit(4);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-5 w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      
      {/* 1. Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0 pt-2 pb-1">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#004aad]">
            Merhaba, {user.firstName} 👋
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            {isTeacher ? 'Öğretmen Paneli • Birebir Eğitim Yönetim Sistemi' : 'Birebir Eğitim Yönetim Sistemi'}
          </p>
        </div>
      </div>

      {/* 2. Stats Row */}
      {isTeacher ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
          <div className="col-span-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Öğrencilerim</span>
              <div className="text-2xl font-black text-gray-900">{teacherStudentCount} <span className="text-sm font-semibold text-gray-400">öğrenci</span></div>
            </div>
            <div className="p-2.5 bg-blue-50/50 text-[#004aad] rounded-xl border border-blue-100/50">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="col-span-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide block mb-1 whitespace-nowrap truncate" title="Tamamlanan Ders Saatim / Ay">Ders Saatim / Ay</span>
              <div className="text-2xl font-black text-gray-900">{thisMonthHours} <span className="text-sm font-semibold text-gray-400">ders</span></div>
            </div>
            <div className="p-2.5 bg-emerald-50/50 text-emerald-600 rounded-xl border border-emerald-100/50">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="col-span-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Bu Ayki Hakedişim</span>
              <HideableAmount amount={`₺${teacherThisMonthEarnings.toLocaleString('tr-TR')}`} className="text-2xl font-black text-gray-900 truncate" />
            </div>
            <div className="p-2.5 bg-[#ff914d]/10 text-[#ff914d] rounded-xl border border-[#ff914d]/20 flex-shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="col-span-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Planlanan Derslerim</span>
              <div className="text-2xl font-black text-gray-900">{teacherPlannedLessonsCount} <span className="text-sm font-semibold text-gray-400">ders</span></div>
            </div>
            <div className="p-2.5 bg-purple-50/50 text-purple-600 rounded-xl border border-purple-100/50">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      ) : (
        <div className={isStaff ? "grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0" : "grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-[1fr_1fr_1fr_1fr_1.3fr] gap-4 flex-shrink-0"}>
          <div className="col-span-1 lg:col-span-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Aktif Öğrenci</span>
              <div className="text-2xl font-black text-gray-900">{activeStudents.length}</div>
            </div>
            <div className="p-2.5 bg-blue-50/50 text-[#004aad] rounded-xl border border-blue-100/50">
              <Users className="w-5 h-5" />
            </div>
          </div>
          
          <div className="col-span-1 lg:col-span-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Aktif Öğretmen</span>
              <div className="text-2xl font-black text-gray-900">{activeTeachers.length}</div>
            </div>
            <div className="p-2.5 bg-purple-50/50 text-purple-600 rounded-xl border border-purple-100/50">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>

          <div className="col-span-1 lg:col-span-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wide block mb-1 whitespace-nowrap truncate" title="Verilen Birebir Ders / Ay">Verilen Birebir Ders / Ay</span>
              <div className="text-2xl font-black text-gray-900">{thisMonthHours} <span className="text-sm font-semibold text-gray-400">ders</span></div>
            </div>
            <div className="p-2.5 bg-emerald-50/50 text-emerald-600 rounded-xl border border-emerald-100/50">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="col-span-1 lg:col-span-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
            <div>
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Eğitim Talepleri</span>
              <div className="text-2xl font-black text-gray-900">{pendingRequestsCount} <span className="text-sm font-semibold text-gray-400">bekl.</span></div>
            </div>
            <div className="p-2.5 bg-rose-50/50 text-rose-600 rounded-xl border border-rose-100/50">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          {!isStaff && (
            <div className="col-span-2 lg:col-span-4 xl:col-span-1 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Kurum Aylık Hakediş</span>
                <HideableAmount amount={`₺${thisMonthRevenue.toLocaleString('tr-TR')}`} className="text-2xl font-black text-gray-900 truncate" />
              </div>
              <div className="p-2.5 bg-[#ff914d]/10 text-[#ff914d] rounded-xl border border-[#ff914d]/20 flex-shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Middle & Bottom Section */}
      {isTeacher ? (
        <div className="flex-1 min-h-[300px] flex flex-col lg:flex-row gap-4 flex-shrink-0">
          {/* Gün / Saat Yoğunluğu */}
          <div className="lg:w-1/3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
            <h3 className="text-xs font-extrabold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide flex-shrink-0">
              <Clock className="w-4 h-4 text-indigo-500" />
              Ders Saati Yoğunluğum
            </h3>
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-2">
              {timeDensityTotal > 0 ? (
                <>
                  <div className="relative w-28 h-28 shrink-0 hover:scale-105 transition-transform duration-500">
                    <div 
                      className="w-full h-full rounded-full shadow-lg border-2 border-white"
                      style={{ background: timeConicGradient }}
                    ></div>
                    <div className="absolute inset-0 m-auto w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-inner">
                      <Activity className="w-4 h-4 text-indigo-500" />
                    </div>
                  </div>
                  
                  <div className="w-full space-y-2.5">
                    {timeBucketsArr.map((bucket, i) => {
                      const percentage = timeDensityTotal > 0 ? Math.round((bucket.value / timeDensityTotal) * 100) : 0;
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-[10px] font-bold text-gray-700 mb-0.5">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bucket.color }}></span>
                              {bucket.label}
                            </span>
                            <span>%{percentage}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-1.5 rounded-full transition-all duration-1000 ease-out"
                              style={{ width: `${percentage}%`, backgroundColor: bucket.color }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="w-full flex-1 flex items-center justify-center text-xs text-gray-400 font-medium bg-gray-50/30 rounded-xl border border-dashed border-gray-100 py-10">
                  Veri bulunamadı.
                </div>
              )}
            </div>
          </div>

          {/* Son Ders Hareketleri */}
          <div className="lg:w-2/3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col min-h-[200px]">
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <h3 className="text-xs font-extrabold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                <Activity className="w-4 h-4 text-[#004aad]" />
                Son Ders Hareketlerim
              </h3>
              <Link href="/calendar" className="text-[10px] font-bold text-gray-500 hover:text-[#004aad] transition-colors bg-gray-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-gray-100">
                Ders Programım
              </Link>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {recentActivity.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium bg-gray-50/30 rounded-xl border border-dashed border-gray-100 py-12">
                  Henüz aktivite yok.
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-gray-50">
                  {recentActivity.map((act) => (
                    <div key={act.id} className="flex items-center justify-between py-2.5 px-2 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0
                          ${act.status === 'COMPLETED' ? 'text-green-500 bg-green-50' : 
                            act.status === 'EXCUSED' ? 'text-orange-500 bg-orange-50' : 
                            act.status === 'CANCELLED' ? 'text-red-500 bg-red-50' : 'text-[#004aad] bg-blue-50'}`}
                        >
                          {act.status === 'COMPLETED' ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={3} /> : 
                           act.status === 'EXCUSED' ? <AlertTriangle className="w-3.5 h-3.5" strokeWidth={3} /> : 
                           act.status === 'CANCELLED' ? <XCircle className="w-3.5 h-3.5" strokeWidth={3} /> : <Clock className="w-3.5 h-3.5" strokeWidth={3} />}
                        </div>
                        <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                          <p className="text-[13px] font-bold text-gray-900 truncate">
                            {act.studentFirstName} {act.studentLastName}
                          </p>
                          <span className="hidden sm:inline text-gray-300 ml-1 mr-1">/</span>
                          <span className="text-[10px] font-bold text-[#004aad] bg-blue-50 px-2 py-0.5 rounded-md self-start sm:self-auto">{act.subjectName}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <p className="text-[11px] text-gray-400 font-medium">
                          {new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(act.startTime))}
                        </p>
                        <span className={`inline-flex px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest
                          ${act.status === 'COMPLETED' ? 'text-green-600 bg-green-50' : 
                            act.status === 'EXCUSED' ? 'text-orange-600 bg-orange-50' : 
                            act.status === 'CANCELLED' ? 'text-red-600 bg-red-50' : 'text-[#004aad] bg-blue-50'}`}
                        >
                          {act.status === 'COMPLETED' ? 'TAMAMLANDI' : 
                           act.status === 'EXCUSED' ? 'MAZERETLİ' : 
                           act.status === 'CANCELLED' ? 'İPTAL' : 'PLANLANDI'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* 3. Middle Row: Gün/Saat Yoğunluğu & Branş */}
          <div className="flex-1 min-h-[180px] max-h-[220px] flex flex-col lg:flex-row gap-4 flex-shrink-0">
            {/* Gün / Saat Yoğunluğu */}
            <div className="lg:w-1/2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
              <h3 className="text-xs font-extrabold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide flex-shrink-0">
                <Clock className="w-4 h-4 text-indigo-500" />
                Gün/Saat Yoğunluğu
              </h3>
              <div className="flex-1 flex flex-row items-center justify-between gap-6 px-2">
                {timeDensityTotal > 0 ? (
                  <>
                    <div className="relative w-28 h-28 shrink-0 hover:scale-105 transition-transform duration-500">
                      <div 
                        className="w-full h-full rounded-full shadow-lg border-2 border-white"
                        style={{ background: timeConicGradient }}
                      ></div>
                      <div className="absolute inset-0 m-auto w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-inner">
                        <Activity className="w-4 h-4 text-indigo-500" />
                      </div>
                    </div>
                    
                    <div className="flex-1 space-y-2.5">
                      {timeBucketsArr.map((bucket, i) => {
                        const percentage = timeDensityTotal > 0 ? Math.round((bucket.value / timeDensityTotal) * 100) : 0;
                        return (
                          <div key={i}>
                            <div className="flex justify-between text-[10px] font-bold text-gray-700 mb-0.5">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: bucket.color }}></span>
                                {bucket.label}
                              </span>
                              <span>%{percentage}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className="h-1.5 rounded-full transition-all duration-1000 ease-out"
                                style={{ width: `${percentage}%`, backgroundColor: bucket.color }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="w-full flex-1 flex items-center justify-center text-xs text-gray-400 font-medium bg-gray-50/30 rounded-xl border border-dashed border-gray-100">
                    Veri bulunamadı.
                  </div>
                )}
              </div>
            </div>

            {/* Branş Dağılımı */}
            <div className="lg:w-1/2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col min-h-0">
              <h3 className="text-xs font-extrabold text-gray-900 mb-4 flex items-center gap-2 uppercase tracking-wide flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                Branş Dağılımı
              </h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                {branchData.length > 0 ? (
                  <div className="space-y-3.5">
                    {branchData.map((b, i) => (
                      <div key={b.name} className="flex items-center gap-3">
                        <div className="w-24 text-[11px] font-bold text-gray-600 truncate" title={b.name}>
                          {b.name}
                        </div>
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all duration-1000 ease-out" 
                            style={{ 
                              width: `${b.percentage}%`, 
                              backgroundColor: pieColors[i % pieColors.length] 
                            }} 
                          />
                        </div>
                        <div className="w-8 text-right text-[11px] font-black text-gray-900">
                          %{b.percentage}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs font-medium text-gray-400">
                    Veri Yok
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4. Bottom Row: Aktiviteler & Paket + Sistem */}
          <div className="flex-1 min-h-[220px] flex flex-col lg:flex-row gap-4 flex-shrink-0">
            {/* Son Eğitim Aktiviteleri */}
            <div className="lg:w-2/3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col min-h-[160px]">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-xs font-extrabold text-gray-900 flex items-center gap-2 uppercase tracking-wide">
                  <Activity className="w-4 h-4 text-[#004aad]" />
                  Son Eğitim Aktiviteleri
                </h3>
                <Link href="/calendar" className="text-[10px] font-bold text-gray-500 hover:text-[#004aad] transition-colors bg-gray-50 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-gray-100">
                  Tümünü Gör
                </Link>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {recentActivity.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-gray-400 font-medium bg-gray-50/30 rounded-xl border border-dashed border-gray-100">
                    Henüz aktivite yok.
                  </div>
                ) : (
                  <div className="flex flex-col divide-y divide-gray-50">
                    {recentActivity.map((act) => (
                      <div key={act.id} className="flex items-center justify-between py-2.5 px-2 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0
                            ${act.status === 'COMPLETED' ? 'text-green-500 bg-green-50' : 
                              act.status === 'EXCUSED' ? 'text-orange-500 bg-orange-50' : 
                              act.status === 'CANCELLED' ? 'text-red-500 bg-red-50' : 'text-[#004aad] bg-blue-50'}`}
                          >
                            {act.status === 'COMPLETED' ? <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={3} /> : 
                             act.status === 'EXCUSED' ? <AlertTriangle className="w-3.5 h-3.5" strokeWidth={3} /> : 
                             act.status === 'CANCELLED' ? <XCircle className="w-3.5 h-3.5" strokeWidth={3} /> : <Clock className="w-3.5 h-3.5" strokeWidth={3} />}
                          </div>
                          <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <p className="text-[13px] font-bold text-gray-900 truncate">
                              {act.studentFirstName} {act.studentLastName}
                            </p>
                            <span className="hidden sm:inline text-gray-300">/</span>
                            <p className="text-[11px] font-semibold text-gray-500 truncate">
                              Öğretmen: <span className="text-gray-700">{act.teacherFirstName} {act.teacherLastName}</span>
                            </p>
                            <span className="hidden sm:inline text-gray-300 ml-1 mr-1">/</span>
                            <span className="text-[10px] font-bold text-[#004aad] bg-blue-50 px-2 py-0.5 rounded-md self-start sm:self-auto">{act.subjectName}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <p className="text-[11px] text-gray-400 font-medium">
                            {new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(act.startTime))}
                          </p>
                          <span className={`inline-flex px-2 py-1 rounded-md text-[9px] font-extrabold uppercase tracking-widest
                            ${act.status === 'COMPLETED' ? 'text-green-600 bg-green-50' : 
                              act.status === 'EXCUSED' ? 'text-orange-600 bg-orange-50' : 
                              act.status === 'CANCELLED' ? 'text-red-600 bg-red-50' : 'text-[#004aad] bg-blue-50'}`}
                          >
                            {act.status === 'COMPLETED' ? 'TAMAMLANDI' : 
                             act.status === 'EXCUSED' ? 'MAZERETLİ' : 
                             act.status === 'CANCELLED' ? 'İPTAL' : 'PLANLANDI'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Paket Durumları & Sistem Durumu */}
            <div className="lg:w-1/3 flex flex-col gap-4">
              {/* Paket Durumları */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col">
                <h3 className="text-[11px] font-extrabold text-gray-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
                  <Battery className="w-3.5 h-3.5 text-gray-400" />
                  Paket Durumları
                </h3>
                <div className="space-y-1.5 flex-1 flex flex-col justify-center">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-red-50/80 border border-red-100/30">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-red-900">0-5 Saat (Kritik)</span>
                    </div>
                    <span className="font-black text-red-600 text-[11px]">{redPackages}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50/80 border border-orange-100/30">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      <span className="text-[11px] font-bold text-orange-900">5-10 Saat</span>
                    </div>
                    <span className="font-black text-orange-600 text-[11px]">{orangePackages}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-green-50/80 border border-green-100/30">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="text-[11px] font-bold text-green-900">10+ Saat (Güvende)</span>
                    </div>
                    <span className="font-black text-green-600 text-[11px]">{greenPackages}</span>
                  </div>
                </div>
              </div>

              {/* Sistem Durumu */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col justify-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-extrabold text-gray-900 truncate uppercase tracking-wide">Sistem Güvende</span>
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                    </div>
                    <span className="text-[9px] font-semibold text-emerald-600 truncate">Uçtan Uca Şifreleme Aktif</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
