'use client';

import { 
  Users, 
  GraduationCap, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  UserX, 
  Search, 
  Calendar, 
  ClipboardList,
  BarChart3,
  Sparkles,
  CalendarCheck,
  CalendarClock,
  ArrowDown,
  ArrowUp,
  ArrowUpDown
} from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

export function ReportsClient({ data, isTeacher = false }: { data: any; isTeacher?: boolean }) {
  const {
    activeStudentsCount = 0,
    activeTeachersCount = 0,
    remainingHours = 0,
    deliveredHours = 0,
    bucketRed = 0,
    bucketOrange = 0,
    bucketGreen = 0,
    branchStats = [],
    timeBuckets = { morning: 0, noon: 0, afternoon: 0, evening: 0 },
    totalLessonsInPeriod = 0,
    operationalLessons = [],
  } = data;

  const [activeTab, setActiveTab] = useState<'OPERATIONAL' | 'CAPACITY'>('OPERATIONAL');
  const [logSearch, setLogSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'UNEXCUSED' | 'CANCELLED' | 'TEACHER_ABSENT' | 'PLANNED'>('ALL');
  const [dateSortOrder, setDateSortOrder] = useState<'desc' | 'asc'>('desc');

  // Operational status styling helper
  const getStatusBadge = (st: string) => {
    switch (st) {
      case 'COMPLETED':
        return {
          label: 'Derse Katıldı',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          icon: CheckCircle2,
        };
      case 'UNEXCUSED':
        return {
          label: 'Mazeretsiz Gelmedi',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80',
          icon: AlertCircle,
        };
      case 'CANCELLED':
        return {
          label: 'Ders İptal Edildi',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
          icon: XCircle,
        };
      case 'TEACHER_ABSENT':
        return {
          label: 'Öğretmen Katılmadı',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200/80',
          icon: UserX,
        };
      default:
        return {
          label: 'Planlandı',
          badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
          icon: CalendarClock,
        };
    }
  };

  // Operational metrics calculated from the exact operational lessons dataset
  const stats = useMemo(() => {
    const attendedStudentIds = new Set<string>();
    let totalCompletedHours = 0;
    let completedMinutes = 0;
    let completedCount = 0;
    let unexcusedCount = 0;
    let cancelledCount = 0;
    let teacherAbsentCount = 0;
    let plannedCount = 0;

    const subjectAgg: Record<string, {
      subjectId: string;
      subjectName: string;
      completedHours: number;
      completedCount: number;
      students: Set<string>;
      unexcusedCount: number;
      cancelledCount: number;
      teacherAbsentCount: number;
      totalCount: number;
    }> = {};

    operationalLessons.forEach((l: any) => {
      const status = l.effectiveStatus || 'PLANNED';
      const durMins = parseInt(l.durationMinutes || '40', 10) || 40;
      const subId = l.subjectId || 'unknown';
      const subName = l.subjectName || 'Genel Ders';

      if (!subjectAgg[subId]) {
        subjectAgg[subId] = {
          subjectId: subId,
          subjectName: subName,
          completedHours: 0,
          completedCount: 0,
          students: new Set(),
          unexcusedCount: 0,
          cancelledCount: 0,
          teacherAbsentCount: 0,
          totalCount: 0,
        };
      }

      const s = subjectAgg[subId];
      s.totalCount++;

      if (status === 'COMPLETED') {
        if (l.studentId) {
          attendedStudentIds.add(l.studentId);
          s.students.add(l.studentId);
        }
        completedCount++;
        totalCompletedHours++; // Her oturum 1 ders saati
        completedMinutes += durMins;
        s.completedHours++;
        s.completedCount++;
      } else if (status === 'UNEXCUSED') {
        unexcusedCount++;
        s.unexcusedCount++;
      } else if (status === 'CANCELLED') {
        cancelledCount++;
        s.cancelledCount++;
      } else if (status === 'TEACHER_ABSENT') {
        teacherAbsentCount++;
        s.teacherAbsentCount++;
      } else {
        plannedCount++;
      }
    });

    const totalProcessed = completedCount + unexcusedCount + cancelledCount + teacherAbsentCount;
    const totalAll = operationalLessons.length;
    const attendanceRate = totalProcessed > 0 ? Math.round((completedCount / totalProcessed) * 100) : 0;

    const subjectStatsList = Object.values(subjectAgg)
      .map(s => ({
        ...s,
        studentCount: s.students.size,
        percentage: totalCompletedHours > 0 ? Math.round((s.completedHours / totalCompletedHours) * 100) : 0,
      }))
      .sort((a, b) => b.completedHours - a.completedHours || b.completedCount - a.completedCount);

    return {
      attendedStudentsCount: attendedStudentIds.size,
      totalCompletedHours,
      completedMinutes,
      completedCount,
      unexcusedCount,
      cancelledCount,
      teacherAbsentCount,
      plannedCount,
      totalProcessed,
      totalAll,
      attendanceRate,
      subjectStatsList,
    };
  }, [operationalLessons]);

  // Filtered and sorted operational logs for the table
  const filteredLogLessons = useMemo(() => {
    const list = operationalLessons.filter((l: any) => {
      const status = l.effectiveStatus || 'PLANNED';
      
      // Status filter
      if (statusFilter !== 'ALL' && status !== statusFilter) {
        return false;
      }

      // Search query
      if (logSearch.trim()) {
        const q = logSearch.toLocaleLowerCase('tr-TR');
        const student = `${l.studentFirstName || ''} ${l.studentLastName || ''}`.toLocaleLowerCase('tr-TR');
        const parent = `${l.parentName || ''} ${l.parentPhone || ''}`.toLocaleLowerCase('tr-TR');
        const teacher = `${l.teacherFirstName || ''} ${l.teacherLastName || ''}`.toLocaleLowerCase('tr-TR');
        const subject = (l.subjectName || '').toLocaleLowerCase('tr-TR');
        const reason = (l.excuseReason || '').toLocaleLowerCase('tr-TR');
        return student.includes(q) || parent.includes(q) || teacher.includes(q) || subject.includes(q) || reason.includes(q);
      }

      return true;
    });

    return [...list].sort((a: any, b: any) => {
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();
      return dateSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }, [operationalLessons, statusFilter, logSearch, dateSortOrder]);

  // Color palette for charts
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#f97316'];

  // Conic gradient for Branch Chart in capacity view
  const branchConicGradient = useMemo(() => {
    let currentDegree = 0;
    const stops = branchStats.map((b: any, i: number) => {
      const percentage = (b.totalLessons / (totalLessonsInPeriod || 1)) * 100;
      const deg = (percentage / 100) * 360;
      const stop = `${COLORS[i % COLORS.length]} ${currentDegree}deg ${currentDegree + deg}deg`;
      currentDegree += deg;
      return stop;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [branchStats, totalLessonsInPeriod]);

  // Conic gradient for Time Density
  const timeDensityTotal = timeBuckets.morning + timeBuckets.noon + timeBuckets.afternoon + timeBuckets.evening;
  const timeBucketsArr = [
    { label: '08:00 - 10:00 (Düşük)', value: timeBuckets.morning, color: '#93c5fd' },
    { label: '10:00 - 14:00 (Orta)', value: timeBuckets.noon, color: '#60a5fa' },
    { label: '14:00 - 18:00 (Yüksek)', value: timeBuckets.afternoon, color: '#3b82f6' },
    { label: '18:00 - 21:00+ (Çok Yüksek)', value: timeBuckets.evening, color: '#1d4ed8' }
  ];

  const timeConicGradient = useMemo(() => {
    let currentDegree = 0;
    const stops = timeBucketsArr.map((b) => {
      const percentage = (b.value / (timeDensityTotal || 1)) * 100;
      const deg = (percentage / 100) * 360;
      const stop = `${b.color} ${currentDegree}deg ${currentDegree + deg}deg`;
      currentDegree += deg;
      return stop;
    });
    return `conic-gradient(${stops.join(', ')})`;
  }, [timeBuckets, timeDensityTotal]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-500">
      
      {/* 1. ÜST SEKME SEÇİCİ (ZARİF APPLE SEGMENTED CONTROL) */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center p-1 bg-gray-100/90 rounded-2xl border border-gray-200/80 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('OPERATIONAL')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'OPERATIONAL'
                ? 'bg-white text-[#004aad] shadow-sm ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <ClipboardList className="w-4 h-4 text-[#004aad]" />
            <span>Ders Katılım & Faaliyet Logu</span>
            <span className="ml-1 text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-extrabold">
              {stats.totalAll}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CAPACITY')}
            className={`flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${
              activeTab === 'CAPACITY'
                ? 'bg-white text-[#004aad] shadow-sm ring-1 ring-black/5'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#004aad]" />
            <span>{isTeacher ? 'Ders Dağılımı & Zaman Analizi' : 'Kurum Kapasite & Branş Analizi'}</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-gray-400">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Tüm veriler yukarıdaki tarih aralığına göre anlık hesaplanmaktadır</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* SEKME 1: DERS KATILIM & FAALİYET LOGU (KULLANICI TALEBİ) */}
      {/* ======================================================== */}
      {activeTab === 'OPERATIONAL' && (
        <div className="space-y-6">
          
          {/* 4 BÜYÜK VE NET ÖZET KART */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* 1. Kaç Öğrenci Derse Girdi */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600">Derse Giren Öğrenci</span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900 tracking-tight">
                  {stats.attendedStudentsCount} <span className="text-sm font-semibold text-gray-400">öğrenci</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  Seçili dönemde derse katılan tekil öğrenci sayısı
                </p>
              </div>
            </div>

            {/* 2. Kaç Saat Ders Verildi */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between hover:border-emerald-200 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-600">Verilen Ders Saati</span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900 tracking-tight">
                  {stats.totalCompletedHours} <span className="text-sm font-semibold text-gray-400">Ders Saati</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  Toplam {stats.completedMinutes} dakika ({stats.completedCount} ders) başarıyla tamamlandı
                </p>
              </div>
            </div>

            {/* 3. Kaç Derse Girildi & Katılım Oranı */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between hover:border-teal-200 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-teal-600">Derse Katılım</span>
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900 tracking-tight">
                  {stats.completedCount} <span className="text-sm font-semibold text-gray-400">/ {stats.totalProcessed}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  %{stats.attendanceRate} gerçekleşen ders katılım oranı
                </p>
              </div>
            </div>

            {/* 4. Derse Girilmeyen & İptal Edilen */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs flex flex-col justify-between hover:border-rose-200 transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-rose-600">Girilmedi & İptal</span>
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-black text-gray-900 tracking-tight">
                  {stats.unexcusedCount + stats.cancelledCount + stats.teacherAbsentCount} <span className="text-sm font-semibold text-gray-400">oturum</span>
                </div>
                <p className="text-xs text-gray-500 mt-1 font-medium">
                  {stats.unexcusedCount} mazeretsiz, {stats.cancelledCount} iptal, {stats.teacherAbsentCount} öğrt. mazereti
                </p>
              </div>
            </div>

          </div>

          {/* BRANŞ BAZINDA DERS DAĞILIMI: ZARİF ÇUBUK İSTATİSTİKLERİ (SIFIR KUTUCUK, TAM ESTETİK) */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            {/* Başlık ve Özet */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Hangi Derslerden Kaç Saat Verildi?</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Tamamlanan derslerin branşlara göre saat ve oransal dağılımı</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                <span>Toplam: <strong className="text-gray-900">{stats.totalCompletedHours} Ders Saati</strong></span>
                <span className="text-gray-300">•</span>
                <span className="text-indigo-600 font-bold bg-indigo-50 px-2.5 py-0.5 rounded-full">{stats.subjectStatsList.length} Branş</span>
              </div>
            </div>

            {stats.subjectStatsList.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs flex flex-col items-center justify-center">
                <BookOpen className="w-8 h-8 text-gray-300 mb-2" />
                <p className="font-semibold text-gray-600">Bu Tarih Aralığında Tamamlanan Ders Yok</p>
                <p className="text-gray-400 mt-0.5">Yukarıdaki filtreden "Geçen Ay" veya "Tümü" seçerek geçmiş kayıtları inceleyebilirsiniz.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3.5">
                {stats.subjectStatsList.map((s, idx) => {
                  const color = COLORS[idx % COLORS.length];
                  return (
                    <div key={s.subjectId} className="group flex flex-col gap-1.5 py-0.5">
                      {/* Üst Satır: Branş Adı & Saat Bilgisi */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-bold text-gray-900 truncate">{s.subjectName}</span>
                          <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap">
                            ({s.studentCount} öğrenci • {s.completedCount} ders)
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-extrabold text-xs text-gray-900">{s.completedHours} Saat</span>
                          <span className="text-[11px] font-bold text-gray-400 w-8 text-right">%{s.percentage}</span>
                        </div>
                      </div>

                      {/* Zarif İnce Çubuk (Progress Bar) */}
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500 group-hover:brightness-95" 
                          style={{ width: `${Math.max(s.percentage, 3)}%`, backgroundColor: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DERS FAALİYET & KATILIM LOG TABLOSU (TAM GENİŞLİKTE VE AYRINTILI) */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
            
            {/* Tablo Üst Başlık & Araç Çubuğu */}
            <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-indigo-600" />
                  Ders Faaliyet & Katılım Log Kayıtları
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Seçili periyotta planlanan, tamamlanan, mazeretsiz ve iptal edilen tüm ders hareketleri
                </p>
              </div>

              {/* Arama ve Sıralama Araçları */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                {/* Tarih Sıralama (Segmented Pill) */}
                <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200/80 shadow-2xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setDateSortOrder('desc')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      dateSortOrder === 'desc'
                        ? 'bg-white text-indigo-600 shadow-xs ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                    En Yeni Tarih
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateSortOrder('asc')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      dateSortOrder === 'asc'
                        ? 'bg-white text-indigo-600 shadow-xs ring-1 ring-black/5'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                    En Eski Tarih
                  </button>
                </div>

                {/* Arama Kutusu */}
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Öğrenci, veli veya öğretmen ara..."
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Durum Filtresi Butonları */}
            <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto text-xs bg-white">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1 shrink-0">Durum:</span>
              {[
                { id: 'ALL', label: `Tümü (${stats.totalAll})` },
                { id: 'COMPLETED', label: `Derse Katıldı (${stats.completedCount})` },
                { id: 'UNEXCUSED', label: `Mazeretsiz (${stats.unexcusedCount})` },
                { id: 'CANCELLED', label: `İptal Edildi (${stats.cancelledCount})` },
                { id: 'TEACHER_ABSENT', label: `Öğretmen Katılmadı (${stats.teacherAbsentCount})` },
                { id: 'PLANNED', label: `Planlandı (${stats.plannedCount})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    statusFilter === f.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Log Listesi / Tablosu */}
            {filteredLogLessons.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs flex flex-col items-center justify-center">
                <Calendar className="w-10 h-10 text-gray-300 mb-2" />
                <p className="font-bold text-sm text-gray-700">Kayıt Bulunamadı</p>
                <p className="text-gray-400 mt-1">Seçili tarih aralığı ve filtre kriterlerine uygun ders hareketi bulunmuyor.</p>
              </div>
            ) : (
              <div className="overflow-x-auto min-w-0 w-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      <th 
                        onClick={() => setDateSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                        title="Tarihe göre sıralamak için tıklayın (En Yeni / En Eski)"
                        className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-indigo-900 font-extrabold">Tarih & Saat</span>
                          {dateSortOrder === 'desc' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold border border-indigo-100">
                              <ArrowDown className="w-3 h-3" /> En Yeni
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded font-bold border border-indigo-100">
                              <ArrowUp className="w-3 h-3" /> En Eski
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="py-3 px-4">Öğrenci & İletişim</th>
                      {!isTeacher && <th className="py-3 px-4">Öğretmen</th>}
                      <th className="py-3 px-4">Ders / Branş</th>
                      <th className="py-3 px-4">Süre</th>
                      <th className="py-3 px-4">Yoklama Durumu</th>
                      <th className="py-3 px-4">Mazeret / Gerekçe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {filteredLogLessons.map((l: any) => {
                      const st = getStatusBadge(l.effectiveStatus);
                      const lessonDate = new Date(l.startTime);
                      const dateFormatted = format(lessonDate, 'd MMM yyyy, EEE', { locale: tr });
                      const timeFormatted = `${format(lessonDate, 'HH:mm')} - ${format(new Date(l.endTime), 'HH:mm')}`;
                      const IconComponent = st.icon;

                      return (
                        <tr key={l.id} className="hover:bg-blue-50/30 transition-colors">
                          {/* Tarih & Saat */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-bold text-gray-900">{dateFormatted}</div>
                            <div className="text-[11px] text-gray-400 font-mono mt-0.5">{timeFormatted}</div>
                          </td>

                          {/* Öğrenci & Veli */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900">
                              {l.studentFirstName} {l.studentLastName}
                            </div>
                            {l.parentName && (
                              <div className="text-[11px] text-gray-500 mt-0.5">
                                <span className="text-gray-400">Veli:</span> {l.parentName} {l.parentPhone ? `(${l.parentPhone})` : ''}
                              </div>
                            )}
                          </td>

                          {/* Öğretmen */}
                          {!isTeacher && (
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="font-semibold text-gray-800">
                                {l.teacherFirstName} {l.teacherLastName}
                              </span>
                            </td>
                          )}

                          {/* Branş */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[11px] border border-indigo-100">
                              {l.subjectName}
                            </span>
                          </td>

                          {/* Süre */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-gray-600">
                            1 Ders <span className="text-[10px] text-gray-400">({Number(l.durationMinutes || 60) >= 60 ? '1 Saat' : `${l.durationMinutes} dk`})</span>
                          </td>

                          {/* Durum Rozeti */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${st.badgeClass}`}>
                              <IconComponent className="w-3.5 h-3.5" />
                              <span>{st.label}</span>
                            </span>
                          </td>

                          {/* Mazeret Notu */}
                          <td className="py-3.5 px-4 text-gray-500">
                            {l.excuseReason ? (
                              <span className="italic text-rose-700 bg-rose-50/60 px-2 py-1 rounded border border-rose-100 block text-[11px] max-w-xs">
                                "{l.excuseReason}"
                              </span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ======================================================== */}
      {/* SEKME 2: KURUM KAPASİTE & BRANŞ ANALİZİ (MEVCUT RAPORLAR) */}
      {/* ======================================================== */}
      {activeTab === 'CAPACITY' && (
        <div className="space-y-6">
          
          {/* Özet Kartlar */}
          <div className={`grid grid-cols-2 ${isTeacher ? 'md:grid-cols-3' : 'md:grid-cols-4'} gap-5`}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                  {isTeacher ? 'Öğrencilerim' : 'Aktif Öğrenci'}
                </p>
                <h3 className="text-2xl font-black mt-1 text-gray-900">{activeStudentsCount}</h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
            </div>

            {!isTeacher && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Aktif Öğretmen</p>
                  <h3 className="text-2xl font-black mt-1 text-gray-900">{activeTeachersCount}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Kalan Paket Saati</p>
                <h3 className="text-2xl font-black mt-1 text-gray-900">{remainingHours} <span className="text-sm font-semibold text-gray-400">saat</span></h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Tamamlanan Ders</p>
                <h3 className="text-2xl font-black mt-1 text-gray-900">{deliveredHours} <span className="text-sm font-semibold text-gray-400">saat</span></h3>
              </div>
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Paket Bitiş Durumu */}
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Paket Bitiş Durumu</h3>
                  <p className="text-xs text-gray-400">Kalan saatlerine göre öğrenci sayıları</p>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-around gap-4">
                <div className="flex items-center justify-between p-3.5 bg-red-50/50 border border-red-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <div>
                      <p className="text-xs font-bold text-red-950">Kritik (0 - 5 Saat)</p>
                      <p className="text-[11px] text-red-700">Yenilenmesi gerekenler</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-red-700">{bucketRed}</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    <div>
                      <p className="text-xs font-bold text-amber-950">Azalan (6 - 10 Saat)</p>
                      <p className="text-[11px] text-amber-700">Takip edilmesi gerekenler</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-amber-700">{bucketOrange}</span>
                </div>

                <div className="flex items-center justify-between p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                    <div>
                      <p className="text-xs font-bold text-emerald-950">Yeterli (10+ Saat)</p>
                      <p className="text-[11px] text-emerald-700">Paketi devam edenler</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-emerald-700">{bucketGreen}</span>
                </div>
              </div>
            </div>

            {/* Branş Dağılımı ve Pasta Grafik */}
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Ders Dağılımı (Branş)</h3>
                  <p className="text-xs text-gray-400">Verilen derslerin branşlara oranı</p>
                </div>
                <span className="text-xs font-bold text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200">
                  {totalLessonsInPeriod} Ders
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col items-center justify-center">
                {totalLessonsInPeriod > 0 ? (
                  <div className="flex flex-col items-center w-full">
                    <div className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-inner my-2" style={{ background: branchConicGradient }}>
                      <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                        <span className="text-2xl font-black text-gray-800">{branchStats.length}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Branş</span>
                      </div>
                    </div>
                    <div className="w-full mt-4 max-h-36 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                      {branchStats.slice(0, 5).map((b: any, i: number) => (
                        <div key={b.id} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                            <span className="font-medium text-gray-700 truncate max-w-[120px]">{b.name}</span>
                          </div>
                          <span className="font-bold text-gray-900">%{b.percentage}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-xs py-10">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Seçili aralıkta ders bulunmuyor
                  </div>
                )}
              </div>
            </div>

            {/* Saat Yoğunluğu Dağılımı */}
            <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Saat Yoğunluğu</h3>
                  <p className="text-xs text-gray-400">Günün saatlerine göre ders dağılımı</p>
                </div>
                <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                  {timeDensityTotal} Oturum
                </span>
              </div>
              <div className="p-5 flex-1 flex flex-col items-center justify-center">
                {timeDensityTotal > 0 ? (
                  <div className="flex flex-col items-center w-full">
                    <div className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-inner my-2" style={{ background: timeConicGradient }}>
                      <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                        <Clock className="w-6 h-6 text-blue-600 mb-0.5" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Saatler</span>
                      </div>
                    </div>
                    <div className="w-full mt-4 space-y-1.5">
                      {timeBucketsArr.map((b) => (
                        <div key={b.label} className="flex items-center justify-between text-xs py-1 px-2 rounded-lg hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.color }}></span>
                            <span className="font-medium text-gray-700">{b.label}</span>
                          </div>
                          <span className="font-bold text-gray-900">
                            {b.value} <span className="text-gray-400 font-normal">({timeDensityTotal > 0 ? Math.round((b.value / timeDensityTotal) * 100) : 0}%)</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-400 text-xs py-10">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Seçili aralıkta ders bulunmuyor
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
