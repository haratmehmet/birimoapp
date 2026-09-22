'use client';

import { useState, useEffect } from 'react';
import { Search, MessageCircle, Send, Users, Calendar, Trash2, RefreshCw, CheckSquare, ChevronDown, ChevronUp, Filter, FileText, Printer } from 'lucide-react';
import { format, startOfDay, endOfDay, endOfWeek, addDays, endOfMonth } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import { StudentPlanPdfModal } from './StudentPlanPdfModal';

type Contact = {
  id: string;
  type: 'STUDENT' | 'TEACHER';
  studentId?: string;
  teacherId?: string;
  firstName: string;
  lastName: string;
  phone: string;
  parentName?: string | null;
  parentPhone?: string | null;
};

export type PlannedLesson = {
  lessonId: string;
  studentId: string;
  startTime: Date;
  endTime: Date;
  teacherFirstName: string | null;
  teacherLastName: string | null;
  subjectName: string;
};

interface Props {
  initialContacts: Contact[];
  plannedLessons?: PlannedLesson[];
}

export function WhatsAppClient({ initialContacts, plannedLessons = [] }: Props) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [recipientType, setRecipientType] = useState<'STUDENT' | 'PARENT'>('STUDENT');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  type ScopeFilter = 'THIS_WEEK' | 'NEXT_7_DAYS' | 'THIS_MONTH' | 'ALL';
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('THIS_WEEK');
  const [excludedLessonIds, setExcludedLessonIds] = useState<string[]>([]);
  const [showLessonSelector, setShowLessonSelector] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const [hiddenLessons, setHiddenLessons] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem('hidden_whatsapp_lessons');
    if (stored) {
      try {
        setHiddenLessons(JSON.parse(stored));
      } catch (e) {}
    }
  }, []);

  const [studentToHide, setStudentToHide] = useState<{ studentId: string, name: string } | null>(null);

  const confirmHideStudent = () => {
    if (!studentToHide) return;
    const studentId = studentToHide.studentId;
    const studentLessons = plannedLessons.filter(l => l.studentId === studentId);
    const newHidden = [...hiddenLessons, ...studentLessons.map(l => l.lessonId)];
    const uniqueHidden = Array.from(new Set(newHidden));
    
    setHiddenLessons(uniqueHidden);
    localStorage.setItem('hidden_whatsapp_lessons', JSON.stringify(uniqueHidden));
    
    if (selectedContactId === `s_${studentId}`) {
      setSelectedContactId(null);
    }
    setStudentToHide(null);
  };

  const handleHideStudentClick = (studentId: string | undefined, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!studentId) return;
    setStudentToHide({ studentId, name });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  const handleSelectContact = (id: string) => {
    setSelectedContactId(id);
    setExcludedLessonIds([]);
    setShowLessonSelector(false);
  };

  // Sadece planlı dersi olan ve tamamen gizlenmemiş öğrencileri filtrele
  const plannedStudents = initialContacts.filter(c => {
    if (c.type !== 'STUDENT') return false;
    const studentLessons = plannedLessons.filter(l => l.studentId === c.studentId);
    // Öğrencinin en az 1 tane gizlenmemiş dersi varsa listede göster (yeni plan girilmişse)
    return studentLessons.some(l => !hiddenLessons.includes(l.lessonId));
  });

  const filteredContacts = plannedStudents.filter(c => {
    const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
    const parentName = (c.parentName || '').toLowerCase();
    const parentPhone = c.parentPhone || '';
    const q = searchTerm.toLowerCase();
    return fullName.includes(q) || c.phone.includes(q) || parentName.includes(q) || parentPhone.includes(q);
  });

  const selectedContact = plannedStudents.find(c => c.id === selectedContactId);

  // Tarih aralığı ve ders hesaplamaları
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const next7DaysEnd = endOfDay(addDays(now, 7));
  const monthEnd = endOfMonth(now);

  const selectedStudentAllLessons = selectedContact
    ? plannedLessons.filter(l => l.studentId === selectedContact.studentId && !hiddenLessons.includes(l.lessonId))
    : [];

  const getLessonsByScope = (lessonsList: PlannedLesson[], scope: ScopeFilter) => {
    return lessonsList.filter(l => {
      const lDate = new Date(l.startTime);
      if (lDate < todayStart) return false;
      if (scope === 'THIS_WEEK') return lDate <= weekEnd;
      if (scope === 'NEXT_7_DAYS') return lDate <= next7DaysEnd;
      if (scope === 'THIS_MONTH') return lDate <= monthEnd;
      return true;
    });
  };

  const countThisWeek = getLessonsByScope(selectedStudentAllLessons, 'THIS_WEEK').length;
  const countNext7Days = getLessonsByScope(selectedStudentAllLessons, 'NEXT_7_DAYS').length;
  const countThisMonth = getLessonsByScope(selectedStudentAllLessons, 'THIS_MONTH').length;
  const countAll = getLessonsByScope(selectedStudentAllLessons, 'ALL').length;

  const currentScopedLessons = getLessonsByScope(selectedStudentAllLessons, scopeFilter);
  const activeLessons = currentScopedLessons.filter(l => !excludedLessonIds.includes(l.lessonId));

  const getScopeTitle = (filter: ScopeFilter) => {
    switch (filter) {
      case 'THIS_WEEK':
        return 'bu haftaki';
      case 'NEXT_7_DAYS':
        return 'önümüzdeki 7 günlük';
      case 'THIS_MONTH':
        return 'bu ayki';
      case 'ALL':
      default:
        return 'güncel';
    }
  };

  const getMessagePreview = (
    contact: Contact, 
    type: 'STUDENT' | 'PARENT' = recipientType, 
    lessonsToSend: PlannedLesson[] = activeLessons
  ) => {
    if (lessonsToSend.length === 0) {
      return '';
    }

    const scopeTitle = getScopeTitle(scopeFilter);
    let planText = '';
    if (type === 'PARENT') {
      planText = `Sayın ${contact.parentName || 'Velimiz'},\nÖğrencimiz ${contact.firstName} ${contact.lastName}'in ${scopeTitle} ders programı aşağıdaki gibidir:\n\n`;
    } else {
      planText = `Merhaba ${contact.firstName} ${contact.lastName},\n${scopeTitle.charAt(0).toUpperCase() + scopeTitle.slice(1)} ders programın aşağıdaki gibidir:\n\n`;
    }
    
    const grouped: Record<string, PlannedLesson[]> = {};
    lessonsToSend.forEach(l => {
      const dateStr = format(new Date(l.startTime), 'd MMMM yyyy EEEE', { locale: tr });
      if (!grouped[dateStr]) grouped[dateStr] = [];
      grouped[dateStr].push(l);
    });
    
    Object.entries(grouped).forEach(([dateStr, lessons]) => {
      planText += `🗓️ *${dateStr}*\n`;
      lessons.forEach(l => {
        const sTime = format(new Date(l.startTime), 'HH:mm');
        const eTime = format(new Date(l.endTime), 'HH:mm');
        const tName = l.teacherFirstName ? `${l.teacherFirstName} ${l.teacherLastName}` : 'Öğretmen';
        planText += `▫️ ${sTime} - ${eTime} | ${l.subjectName} (${tName})\n`;
      });
      planText += `\n`;
    });
    
    if (type === 'PARENT') {
      planText += `Bilgilerinize sunar, öğrencimize başarılar dileriz!`;
    } else {
      planText += `İyi dersler dileriz!`;
    }
    return planText;
  };

  const handleSend = () => {
    if (!selectedContact) return;

    if (activeLessons.length === 0) {
      alert('Gönderilecek herhangi bir ders bulunmuyor. Lütfen farklı bir tarih aralığı (örn. 7 Günlük, Bu Ay veya Tüm Plan) seçiniz.');
      return;
    }

    const targetPhone = recipientType === 'PARENT' ? selectedContact.parentPhone : selectedContact.phone;
    if (!targetPhone) {
      alert(recipientType === 'PARENT' ? 'Bu öğrencinin kayıtlı bir veli telefonu bulunmuyor.' : 'Bu öğrencinin kayıtlı bir telefon numarası bulunmuyor.');
      return;
    }

    let phoneNum = targetPhone.replace(/[^0-9]/g, '');
    if (phoneNum.length === 11 && phoneNum.startsWith('0')) {
      phoneNum = '9' + phoneNum;
    } else if (phoneNum.length === 10 && phoneNum.startsWith('5')) {
      phoneNum = '90' + phoneNum;
    }

    const finalMessage = getMessagePreview(selectedContact, recipientType, activeLessons);
    const url = `https://api.whatsapp.com/send?phone=${phoneNum}&text=${encodeURIComponent(finalMessage)}`;
    
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#004aad] tracking-tight">Whatsapp Ders Planlama Gönderimi</h1>
          <p className="mt-1 md:mt-2 text-xs md:text-sm text-gray-500 font-medium">Sistemde planlanmış dersleri olan öğrencilerinize tek tıkla programlarını iletin.</p>
          <div className="mt-4 p-4 bg-red-50/50 border-l-4 border-red-500 rounded-r-xl inline-block">
            <p className="text-sm text-red-700 font-medium leading-relaxed">
              <strong className="block mb-1 text-red-800">⚠️ Önemli Uyarı</strong>
              Masaüstü veya mobil cihazınızda o an açık olan WhatsApp hesabı, bu mesajları gönderen numara olarak kullanılacaktır. Mesaj göndermeden önce lütfen cihazınızdaki WhatsApp uygulamasında <span className="underline font-bold">kurumunuzun resmi numarasının</span> açık olduğundan emin olunuz.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
        {/* Sol: Kişi Seçimi */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Planlı Öğrenciler ({plannedStudents.length})
              </h2>
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded-lg text-xs font-bold transition-all"
                title="Yeni planlamaları veritabanından çek"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Güncelle</span>
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="İsim veya numara ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar">
            {filteredContacts.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredContacts.map(contact => (
                  <div 
                    key={contact.id} 
                    className={`p-4 hover:bg-indigo-50/50 transition-colors cursor-pointer flex items-center justify-between border-l-4 ${
                      selectedContactId === contact.id ? 'bg-indigo-50/80 border-indigo-500' : 'border-transparent'
                    }`}
                    onClick={() => handleSelectContact(contact.id)}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                      <div className="font-bold text-gray-900 truncate">{contact.firstName} {contact.lastName}</div>
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-gray-500 font-medium">
                        <span>Öğr: {contact.phone || 'Yok'}</span>
                        {contact.parentPhone && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-indigo-600 font-semibold truncate" title={contact.parentName ? `Veli: ${contact.parentName} (${contact.parentPhone})` : `Veli: ${contact.parentPhone}`}>
                              Veli: {contact.parentPhone}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefresh();
                        }}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Öğrencinin planını yenile"
                      >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        onClick={(e) => handleHideStudentClick(contact.studentId, `${contact.firstName} ${contact.lastName}`, e)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Mesaj gönderildi olarak işaretle (Listeden gizle)"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-gray-500 text-sm">
                Arama kriterlerine uygun veya numarası kayıtlı öğrenci bulunamadı.
              </div>
            )}
          </div>
        </div>

        {/* Sağ: Mesaj Paneli */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[700px]">
          {selectedContact ? (
            <>
              <div className="p-4 sm:p-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                    Mesaj Önizlemesi
                  </h2>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {selectedContact.firstName} {selectedContact.lastName}
                  </div>
                </div>

                {/* Alıcı Seçici (Öğrenci / Veli) */}
                <div className="inline-flex bg-gray-200/70 p-1 rounded-xl border border-gray-200 text-xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setRecipientType('STUDENT')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      recipientType === 'STUDENT'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Öğrenciye Gönder
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecipientType('PARENT')}
                    className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                      recipientType === 'PARENT'
                        ? 'bg-white text-indigo-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Veliye Gönder
                  </button>
                </div>
              </div>

              {/* Seçili Alıcı Bilgi Barı */}
              <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Hedef Alıcı:</span>
                  <span className="font-bold text-gray-800">
                    {recipientType === 'PARENT'
                      ? (selectedContact.parentName ? `${selectedContact.parentName} (${selectedContact.firstName}'in Velisi)` : `${selectedContact.firstName}'in Velisi`)
                      : `${selectedContact.firstName} ${selectedContact.lastName}`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500">Numara:</span>
                  <span className={`font-mono font-bold ${
                    (recipientType === 'PARENT' ? selectedContact.parentPhone : selectedContact.phone)
                      ? 'text-indigo-600'
                      : 'text-red-500'
                  }`}>
                    {(recipientType === 'PARENT' ? selectedContact.parentPhone : selectedContact.phone) || 'Numara Kayıtlı Değil'}
                  </span>
                </div>
              </div>

              {/* Zaman Aralığı ve Ders Seçici Çubuğu */}
              <div className="px-4 sm:px-6 py-3 bg-white border-b border-gray-100 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                      <Filter className="w-3 h-3 text-indigo-500" />
                      Aralık:
                    </span>
                    {[
                      { id: 'THIS_WEEK', label: 'Bu Hafta', count: countThisWeek },
                      { id: 'NEXT_7_DAYS', label: '7 Günlük', count: countNext7Days },
                      { id: 'THIS_MONTH', label: 'Bu Ay', count: countThisMonth },
                      { id: 'ALL', label: 'Tüm Plan', count: countAll },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setScopeFilter(item.id as ScopeFilter);
                          setExcludedLessonIds([]);
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                          scopeFilter === item.id
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200/80 hover:text-gray-900'
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                          scopeFilter === item.id ? 'bg-white/25 text-white' : 'bg-gray-200/90 text-gray-700'
                        }`}>
                          {item.count}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {currentScopedLessons.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowLessonSelector(!showLessonSelector)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 py-1 px-2.5 rounded-lg bg-indigo-50/70 hover:bg-indigo-100/70 border border-indigo-100 transition-colors shrink-0"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Ders Seç ({activeLessons.length}/{currentScopedLessons.length})</span>
                        {showLessonSelector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}

                    {activeLessons.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsPdfModalOpen(true)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 py-1 px-3 rounded-lg bg-rose-50 hover:bg-rose-100/80 border border-rose-200/70 transition-all shrink-0 shadow-2xs"
                        title="Seçili ders aralığını şık ve tatlı bir PDF olarak indir veya yazdır"
                      >
                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                        <span>PDF İndir ({scopeFilter === 'THIS_WEEK' ? 'Bu Hafta' : scopeFilter === 'NEXT_7_DAYS' ? '7 Günlük' : scopeFilter === 'THIS_MONTH' ? 'Bu Ay' : 'Tümü'})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Açılır Ders Seçim Listesi (İsteğe bağlı Checkbox) */}
                {showLessonSelector && currentScopedLessons.length > 0 && (
                  <div className="mt-1 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs flex flex-col gap-2">
                    {/* Sabit Başlık - Asla kaydırma çubuğunun altında kalmaz */}
                    <div className="flex items-center justify-between pb-1.5 border-b border-indigo-100 font-semibold text-gray-600 shrink-0">
                      <span>Mesaja dahil edilecek dersler:</span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button
                          type="button"
                          onClick={() => setExcludedLessonIds([])}
                          className="text-indigo-600 hover:underline font-bold"
                        >
                          Tümünü Seç
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => setExcludedLessonIds(currentScopedLessons.map(l => l.lessonId))}
                          className="text-red-500 hover:underline font-bold"
                        >
                          Temizle
                        </button>
                      </div>
                    </div>
                    {/* Kaydırılabilir Ders Listesi (İç boşluklu) */}
                    <div className="space-y-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                      {currentScopedLessons.map((l) => {
                        const isExcluded = excludedLessonIds.includes(l.lessonId);
                        const dateStr = format(new Date(l.startTime), 'd MMM EEE', { locale: tr });
                        const sTime = format(new Date(l.startTime), 'HH:mm');
                        const eTime = format(new Date(l.endTime), 'HH:mm');
                        const tName = l.teacherFirstName ? `${l.teacherFirstName} ${l.teacherLastName}` : 'Öğretmen';
                        return (
                          <label
                            key={l.lessonId}
                            className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${
                              !isExcluded ? 'bg-white text-gray-900 shadow-2xs' : 'bg-transparent text-gray-400 line-through'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={!isExcluded}
                              onChange={() => {
                                if (isExcluded) {
                                  setExcludedLessonIds(prev => prev.filter(id => id !== l.lessonId));
                                } else {
                                  setExcludedLessonIds(prev => [...prev, l.lessonId]);
                                }
                              }}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0"
                            />
                            <span className="font-semibold text-gray-800 shrink-0">{dateStr}</span>
                            <span className="text-gray-600 shrink-0">{sTime} - {eTime}</span>
                            <span className="text-gray-500 truncate">• {l.subjectName} ({tName})</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gradient-to-br from-indigo-50/40 via-slate-50/50 to-blue-50/40 relative">
                {activeLessons.length > 0 ? (
                  <div className="relative z-10 bg-white rounded-2xl rounded-tr-none p-5 shadow-md max-w-md ml-auto border border-gray-100/50">
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                      {getMessagePreview(selectedContact, recipientType, activeLessons)}
                    </pre>
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 text-[10px] text-gray-400 font-medium">
                      <span>{activeLessons.length} ders listelendi</span>
                      <span>WhatsApp Önizlemesi</span>
                    </div>
                  </div>
                ) : (
                  <div className="relative z-10 bg-amber-50 rounded-2xl p-6 shadow-sm max-w-md mx-auto border border-amber-200 text-center">
                    <Calendar className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                    <h4 className="font-bold text-sm text-amber-900 mb-1">Seçilen Aralıkta Planlı Ders Yok</h4>
                    <p className="text-xs text-amber-700 leading-relaxed">
                      Bu öğrencinin <strong>{getScopeTitle(scopeFilter)}</strong> planlanmış dersi bulunmuyor.
                      Yukarıdaki <strong>7 Günlük</strong>, <strong>Bu Ay</strong> veya <strong>Tüm Plan</strong> seçeneklerini kullanarak diğer dersleri görüntüleyebilirsiniz.
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-5 border-t border-gray-100 bg-white flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPdfModalOpen(true)}
                  disabled={activeLessons.length === 0}
                  className="px-4 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-2xl font-bold text-xs sm:text-sm shadow-2xs transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                  title="Seçilen aralığı şık bir PDF olarak indir veya yazdır"
                >
                  <Printer className="w-4 h-4 text-rose-600" />
                  <span>PDF İndir / Yazdır</span>
                </button>

                <button
                  onClick={handleSend}
                  disabled={activeLessons.length === 0 || (recipientType === 'PARENT' ? !selectedContact.parentPhone : !selectedContact.phone)}
                  className="flex-1 py-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl font-bold text-sm sm:text-base shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>
                    {recipientType === 'PARENT' ? 'Veliye WhatsApp Gönder' : 'Öğrenciye WhatsApp Gönder'}
                  </span>
                  <span className="text-xs font-normal opacity-90 hidden xl:inline">
                    ({(recipientType === 'PARENT' ? selectedContact.parentPhone : selectedContact.phone) || 'Numara Yok'})
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50/30">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                <Users className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Öğrenci Seçin</h3>
              <p className="text-gray-500 max-w-sm text-sm">
                Gönderilecek ders planlaması mesajının önizlemesini görmek için sol taraftaki listeden bir öğrenci seçin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Özel Onay Modalı */}
      {studentToHide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Emin misiniz?</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                <span className="font-bold text-indigo-600">{studentToHide.name}</span> isimli öğrencinin ders planını WhatsApp üzerinden gönderdiğinize emin misiniz? Öğrenci listeden gizlenecektir.
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setStudentToHide(null)}
                className="flex-1 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                İptal Et
              </button>
              <button
                onClick={confirmHideStudent}
                className="flex-1 py-3 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 shadow-sm transition-colors"
              >
                Evet, Gizle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Şık ve Tatlı Öğrenci Ders Planı PDF Modalı */}
      {selectedContact && (
        <StudentPlanPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          student={selectedContact}
          lessons={activeLessons}
          scopeFilter={scopeFilter}
        />
      )}
    </div>
  );
}
