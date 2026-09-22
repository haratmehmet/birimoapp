'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Briefcase, CreditCard, CheckCircle2, Clock, Users, Banknote, ChevronDown, Eye, EyeOff, Calendar as CalendarIcon, CalendarRange, BookOpen } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { TeacherAvailabilityManager } from './TeacherAvailabilityManager';
import { getTeacherPerformanceStatsAction } from './actions';

export function TeacherDetailClient({ teacher, orgSettings, isTeacher = false }: { teacher: any; orgSettings: any; isTeacher?: boolean }) {
  const router = useRouter();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showEarnings, setShowEarnings] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const [timeFilter, setTimeFilter] = useState<'all' | 'daily' | 'weekly' | 'monthly' | 'custom'>('all');
  const [startDate, setStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(() => format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [detailsTab, setDetailsTab] = useState<'students' | 'lessons'>('students');

  const [stats, setStats] = useState({
    completedLessonsCount: teacher.completedLessonsCount,
    studentCount: teacher.studentCount,
    detailedStudents: teacher.detailedStudents || [],
    lessonsList: teacher.lessonsList || []
  });
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('mentoros_show_earnings');
    if (saved !== null) {
      setShowEarnings(saved === 'true');
    }
  }, []);

  useEffect(() => {
    if (timeFilter === 'all') {
      setStats({
        completedLessonsCount: teacher.completedLessonsCount,
        studentCount: teacher.studentCount,
        detailedStudents: teacher.detailedStudents || [],
        lessonsList: teacher.lessonsList || []
      });
      return;
    }

    if (timeFilter === 'custom' && (!startDate || !endDate)) {
      return;
    }
    
    let isSubscribed = true;
    setIsStatsLoading(true);
    getTeacherPerformanceStatsAction(teacher.id, timeFilter, startDate, endDate).then(res => {
      if (isSubscribed && res.success && res.data) {
        setStats({
          completedLessonsCount: res.data.completedLessonsCount,
          studentCount: res.data.studentCount,
          detailedStudents: res.data.detailedStudents || [],
          lessonsList: res.data.lessonsList || []
        });
      }
      if (isSubscribed) setIsStatsLoading(false);
    });
    
    return () => { isSubscribed = false; };
  }, [timeFilter, startDate, endDate, teacher.id, teacher.completedLessonsCount, teacher.studentCount, teacher.detailedStudents, teacher.lessonsList]);

  const toggleEarnings = () => {
    const nextState = !showEarnings;
    setShowEarnings(nextState);
    localStorage.setItem('mentoros_show_earnings', String(nextState));
  };

  const isFemale = teacher.gender === 'FEMALE';
  const isMale = teacher.gender === 'MALE';
  
  const badgeColorClass = isFemale
    ? 'bg-pink-100 text-pink-700'
    : isMale
      ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-700';

  const compModel = teacher.compensationModel === 'INTERNAL_HOURLY' ? 'Kurum İçi Saatlik' 
    : teacher.compensationModel === 'INTERNAL_FIXED' ? 'Kurum İçi Sabit' 
    : teacher.compensationModel === 'EXTERNAL_HOURLY' ? 'Kurum Dışı Saatlik' : 'Bilinmiyor';

  let totalPayoutDisplay = '-';
  if (teacher.compensationModel !== 'INTERNAL_FIXED' && teacher.compensationRate) {
    const total = (stats.completedLessonsCount || 0) * Number(teacher.compensationRate);
    totalPayoutDisplay = `${total.toLocaleString('tr-TR')} ₺`;
  } else if (teacher.compensationModel === 'INTERNAL_FIXED') {
    totalPayoutDisplay = 'Sabit Maaş';
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Üst Kısım / Geri Butonu */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push(isTeacher ? '/dashboard' : '/teachers')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors font-medium text-sm bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm hover:shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          {isTeacher ? 'Panele Dön' : 'Öğretmenlere Dön'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sol Kolon: Öğretmen Bilgileri */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 text-center border-b border-gray-100 bg-gray-50/50">
              <img src="/images/teacher.png" alt="Öğretmen" className={`w-24 h-24 mx-auto rounded-full shadow-md border-4 border-white mb-4 object-contain p-3 ${badgeColorClass}`} />
              <h2 className="text-xl font-bold text-gray-900">
                {teacher.firstName} {teacher.lastName}
              </h2>
              <p className="text-sm font-medium text-gray-500 mt-1">Öğretmen</p>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-medium text-gray-400">Kullanıcı Adı</p>
                  <p className="font-semibold text-gray-800 truncate" title={teacher.email}>@{teacher.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400">Telefon</p>
                  <p className="font-semibold text-gray-800">
                    {teacher.phone ? formatPhoneNumber(teacher.phone) : 'Belirtilmedi'}
                  </p>
                </div>
              </div>

              <div className="w-full h-px bg-gray-100 my-2" />

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400">Eğitim Branşı</p>
                  <p className="font-bold text-gray-900">{teacher.subjectName || 'Belirtilmemiş'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400">Anlaşma Modeli</p>
                  <p className="font-bold text-emerald-700">
                    {compModel}
                    {teacher.compensationModel !== 'INTERNAL_FIXED' && ` : ${teacher.compensationRate} ₺`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sağ Kolon: Öğretmen Aktiviteleri / Dersler vb. */}
        <div className="lg:col-span-3 space-y-6 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col min-w-0">
            <div className="p-4 lg:p-6 border-b border-gray-100 bg-gray-50/40 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-amber-500" />
                  Ders Geçmişi & Performans
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-medium">
                  {timeFilter === 'all' && 'Tüm zamanlardaki tamamlanan ders ve öğrenci performansı'}
                  {timeFilter === 'daily' && 'Bugün tamamlanan dersler'}
                  {timeFilter === 'weekly' && 'Bu hafta tamamlanan dersler'}
                  {timeFilter === 'monthly' && 'Bu ay tamamlanan dersler'}
                  {timeFilter === 'custom' && (
                    <span className="text-indigo-600 font-bold">
                      {startDate} ile {endDate} tarihleri arası özel aralık
                    </span>
                  )}
                </p>
              </div>

              {/* Filtre ve Tarih Aralığı Kontrolleri */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Hızlı Aralık Seçimi */}
                <div className="inline-flex bg-white p-1 rounded-xl shadow-xs border border-gray-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setTimeFilter('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      timeFilter === 'all' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Tümü
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter('daily')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      timeFilter === 'daily' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Bugün
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter('weekly')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      timeFilter === 'weekly' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Bu Hafta
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter('monthly')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      timeFilter === 'monthly' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Bu Ay
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimeFilter('custom')}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                      timeFilter === 'custom' ? 'bg-indigo-600 text-white font-bold shadow-xs' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <CalendarRange className="w-3.5 h-3.5" />
                    <span>Özel Tarih</span>
                  </button>
                </div>

                {/* Seçmeli Tarih Aralığı Inputları */}
                {timeFilter === 'custom' && (
                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl shadow-xs border border-indigo-200 animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center bg-gray-50 rounded-lg px-2.5 py-1 border border-gray-150">
                      <span className="text-[10px] uppercase font-bold text-gray-400 mr-1.5">Başlangıç:</span>
                      <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
                      />
                    </div>
                    <span className="text-gray-400 font-bold text-xs">-</span>
                    <div className="flex items-center bg-gray-50 rounded-lg px-2.5 py-1 border border-gray-150">
                      <span className="text-[10px] uppercase font-bold text-gray-400 mr-1.5">Bitiş:</span>
                      <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-xs font-bold text-gray-800 focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className={`p-6 transition-opacity duration-300 ${isStatsLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hakediş */}
                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                    <Banknote className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-emerald-800/70">Toplam Hakediş</p>
                    <button 
                      onClick={toggleEarnings} 
                      className="text-emerald-600 hover:text-emerald-800 transition-colors"
                      title={showEarnings ? "Gizle" : "Göster"}
                    >
                      {showEarnings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-2xl font-black text-emerald-700">{(!mounted || !showEarnings) ? '*** ₺' : totalPayoutDisplay}</p>
                </div>

                {/* Öğrenci Sayısı */}
                <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-blue-800/70 mb-1">Eğitim Verdiği Öğrenci</p>
                  <p className="text-2xl font-black text-blue-700">{stats.studentCount || 0}</p>
                </div>

                {/* Toplam Ders Saati */}
                <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                  <p className="text-sm font-medium text-amber-800/70 mb-1">Tamamlanan Ders Saati</p>
                  <p className="text-2xl font-black text-amber-700">{stats.completedLessonsCount || 0} Saat</p>
                </div>
              </div>
              
              <div className="mt-8 bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div 
                  onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                  className="p-5 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-100/50 transition-colors group"
                >
                  <h4 className="text-gray-900 font-bold text-lg flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-gray-400" />
                    Detaylı Ders Kayıtları
                  </h4>
                  <div className="flex items-center gap-3">
                    {isDetailsOpen && (
                      <div className="inline-flex bg-gray-200/60 p-0.5 rounded-lg text-xs" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setDetailsTab('students')}
                          className={`px-3 py-1 rounded-md font-bold transition-all ${
                            detailsTab === 'students' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Öğrenci Dağılımı ({stats.detailedStudents?.length || 0})
                        </button>
                        <button
                          type="button"
                          onClick={() => setDetailsTab('lessons')}
                          className={`px-3 py-1 rounded-md font-bold transition-all ${
                            detailsTab === 'lessons' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Ders Listesi ({stats.lessonsList?.length || 0})
                        </button>
                      </div>
                    )}
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDetailsOpen ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                
                {isDetailsOpen && (
                  detailsTab === 'students' ? (
                    stats.detailedStudents && stats.detailedStudents.length > 0 ? (
                      <div className="p-0">
                        {/* Mobile View: Cards */}
                        <div className="md:hidden space-y-3 p-4">
                          {stats.detailedStudents.map((s: any) => (
                            <div key={s.studentId} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <img src="/images/student.png" alt="Öğrenci" className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 shrink-0 object-contain p-1" />
                                  <span className="font-bold text-gray-900 text-sm">{s.firstName} {s.lastName}</span>
                                </div>
                                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-bold text-xs border border-amber-100">
                                  {s.completedHours} Saat
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-gray-500 border-t border-gray-50 pt-2">
                                <span className="font-medium">Son Ders Tarihi</span>
                                <span className="font-semibold">{s.lastLessonDate ? format(new Date(s.lastLessonDate), 'd MMM yyyy', { locale: tr }) : '-'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Desktop View: Table */}
                        <div className="hidden md:block overflow-x-auto min-w-0 w-full pb-2 custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-white border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <th className="p-4 pl-6 font-medium">Öğrenci</th>
                                <th className="p-4 font-medium text-center">Toplam Ders Saati</th>
                                <th className="p-4 pr-6 font-medium text-right">Son Ders Tarihi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {stats.detailedStudents.map((s: any) => (
                                <tr key={s.studentId} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="p-4 pl-6">
                                    <div className="flex items-center gap-3">
                                      <img src="/images/student.png" alt="Öğrenci" className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 shrink-0 object-contain p-1" />
                                      <span className="font-semibold text-gray-900 text-sm">{s.firstName} {s.lastName}</span>
                                    </div>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-amber-50 text-amber-700 font-bold text-xs border border-amber-100">
                                      {s.completedHours} Saat
                                    </span>
                                  </td>
                                  <td className="p-4 pr-6 text-right">
                                    <span className="text-sm font-medium text-gray-500">
                                      {s.lastLessonDate ? format(new Date(s.lastLessonDate), 'd MMMM yyyy', { locale: tr }) : '-'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-3 border border-gray-100">
                          <Clock className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Seçili tarih aralığında tamamlanmış öğrenci ders kaydı bulunmamaktadır.</p>
                      </div>
                    )
                  ) : (
                    /* Lessons Tab: Individual Completed Lessons */
                    stats.lessonsList && stats.lessonsList.length > 0 ? (
                      <div className="p-0">
                        {/* Mobile View: Lesson Cards */}
                        <div className="md:hidden space-y-3 p-4">
                          {stats.lessonsList.map((l: any) => (
                            <div key={l.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex flex-col gap-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-gray-900 text-sm">{l.studentFirstName} {l.studentLastName}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Tamamlandı
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>{l.subjectName}</span>
                                <span>{format(new Date(l.startTime), 'd MMMM yyyy, HH:mm', { locale: tr })}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Desktop View: Lessons Table */}
                        <div className="hidden md:block overflow-x-auto min-w-0 w-full pb-2 custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-white border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                <th className="p-4 pl-6 font-medium">Tarih & Saat</th>
                                <th className="p-4 font-medium">Öğrenci</th>
                                <th className="p-4 font-medium">Branş</th>
                                <th className="p-4 font-medium text-center">Süre</th>
                                <th className="p-4 pr-6 font-medium text-right">Durum</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {stats.lessonsList.map((l: any) => (
                                <tr key={l.id} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="p-4 pl-6">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-gray-900 text-sm">
                                        {format(new Date(l.startTime), 'd MMMM yyyy, EEEE', { locale: tr })}
                                      </span>
                                      <span className="text-xs text-gray-500 font-medium">
                                        {format(new Date(l.startTime), 'HH:mm')} - {format(new Date(l.endTime), 'HH:mm')}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <span className="font-semibold text-gray-900 text-sm">
                                      {l.studentFirstName} {l.studentLastName}
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <span className="text-sm font-medium text-gray-700">
                                      {l.subjectName}
                                    </span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-xs">
                                      {l.durationMinutes ? (Number(l.durationMinutes) >= 60 ? `${Math.round(Number(l.durationMinutes) / 60)} Saat` : `${l.durationMinutes} dk`) : '1 Saat'}
                                    </span>
                                  </td>
                                  <td className="p-4 pr-6 text-right">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Tamamlandı
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="p-12 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-3 border border-gray-100">
                          <Clock className="w-5 h-5 text-gray-400" />
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Seçili tarih aralığında tamamlanmış ders kaydı bulunmamaktadır.</p>
                      </div>
                    )
                  )
                )}
              </div>
              
              {/* Teacher Availability Section */}
              <TeacherAvailabilityManager 
                teacherId={teacher.id} 
                initialAvailabilities={teacher.availabilities || []} 
                orgSettings={orgSettings} 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// trigger rebuild
