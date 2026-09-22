'use client';

import { useState, useMemo } from 'react';
import { parse, addMinutes, addDays, format, isBefore, isEqual, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Plus, User, Check, X, Clock, AlertCircle, ChevronDown, Search, Trash2, MessageCircle, UserX, Calendar, RotateCcw } from 'lucide-react';
import { updateLessonStatusAction, deleteLessonAction, assignLessonAction } from './actions';
import { PrintableDailyTable } from './PrintableDailyTable';
import { useRouter } from 'next/navigation';
import { TeacherWeeklyScheduleModal } from './TeacherWeeklyScheduleModal';

export function TimetableGrid({
  mode = 'attendance',
  dayOfWeek,
  availabilities = [],
  selectedDate,
  orgSettings,
  teachers,
  students,
  lessons,
}: {
  mode?: 'attendance' | 'planning';
  dayOfWeek?: string;
  availabilities?: any[];
  selectedDate: string;
  orgSettings: { start: string; end: string; lessonDur: number; breakDur: number; lunchBreakStart?: string | null; lunchBreakEnd?: string | null };
  teachers: any[];
  students: any[];
  lessons: (any & {
    studentFirstName: string;
    studentLastName: string;
    studentPhone?: string | null;
  })[];
}) {
  const router = useRouter();
  const [assignModal, setAssignModal] = useState<{ teacherId: string; subjectId: string; startTime: Date; isOneOff?: boolean } | null>(null);
  const [scheduleModalTeacher, setScheduleModalTeacher] = useState<{ id: string, name: string, subjectId: string } | null>(null);
  const [detailModal, setDetailModal] = useState<any>(null); // The lesson object
  const [lessonToDelete, setLessonToDelete] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [totalHours, setTotalHours] = useState(1);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [whatsAppRecipient, setWhatsAppRecipient] = useState<'STUDENT' | 'PARENT'>('STUDENT');

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const search = studentSearch.toLowerCase();
    return students.filter(s => 
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(search) || 
      (s.packageTitle && s.packageTitle.toLowerCase().includes(search))
    );
  }, [students, studentSearch]);

  const selectedStudentDetails = useMemo(() => {
    if (!selectedStudentId) return null;
    const [sId, pId] = selectedStudentId.split('|');
    return students.find(s => s.studentId === sId && String(s.packageId) === pId);
  }, [selectedStudentId, students]);

  // Find conflict lesson if student already has an overlapping lesson at this time
  const conflictLesson = useMemo(() => {
    if (!assignModal || !selectedStudentId) return null;
    const [sId] = selectedStudentId.split('|');
    return lessons.find(l => {
      if (l.studentId !== sId || l.status === 'CANCELLED') return false;
      const lStart = new Date(l.startTime).getTime();
      const lEnd = new Date(l.endTime).getTime();
      const aStart = assignModal.startTime.getTime();
      const aEnd = aStart + orgSettings.lessonDur * 60000;
      return (lStart < aEnd && lEnd > aStart);
    });
  }, [selectedStudentId, assignModal, lessons, orgSettings.lessonDur]);

  // Group teachers by subject
  const teachersBySubject = useMemo(() => {
    const grouped: Record<string, typeof teachers> = {};
    teachers.forEach(t => {
      if (!grouped[t.subjectName]) grouped[t.subjectName] = [];
      grouped[t.subjectName].push(t);
    });
    return grouped;
  }, [teachers]);

  // Generate Time Slots based on settings
  const timeSlots = useMemo(() => {
    const slots = [];
    const baseDate = parseISO(selectedDate);
    let current = parse(orgSettings.start, 'HH:mm', baseDate);
    const end = parse(orgSettings.end, 'HH:mm', baseDate);
    
    let lunchStart: Date | null = null;
    let lunchEnd: Date | null = null;
    if (orgSettings.lunchBreakStart && orgSettings.lunchBreakEnd) {
      lunchStart = parse(orgSettings.lunchBreakStart, 'HH:mm', baseDate);
      lunchEnd = parse(orgSettings.lunchBreakEnd, 'HH:mm', baseDate);
    }

    while (isBefore(current, end) || isEqual(current, end)) {
      const slotEnd = addMinutes(current, orgSettings.lessonDur);
      
      // Check if slot overlaps with lunch break
      const isOverlapWithLunch = lunchStart && lunchEnd && (
        (isBefore(current, lunchEnd) && isBefore(lunchStart, slotEnd))
      );

      if (isOverlapWithLunch) {
        // Skip to end of lunch break
        current = lunchEnd!;
        continue;
      }

      if (isBefore(slotEnd, end) || isEqual(slotEnd, end)) {
        slots.push({
          start: current,
          end: slotEnd,
          label: `${format(current, 'HH:mm')} - ${format(slotEnd, 'HH:mm')}`
        });
      }
      current = addMinutes(slotEnd, orgSettings.breakDur);
    }
    return slots;
  }, [selectedDate, orgSettings]);

  // Handle forms
  const handleAssignSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assignModal) return;
    setPending(true);
    const formData = new FormData(e.currentTarget);
    const studentValue = formData.get('studentId') as string;
    const [studentId, packageId] = studentValue.split('|');
    
    if (!packageId || packageId === 'null' || packageId === 'undefined') {
      setErrorModal("Bu öğrencinin kalan ders saati talebi aşıyor. Kalan eğitim saati kadar öğrencilere ders atanabilir.");
      setPending(false);
      return;
    }

    const selectedStudentDetails = students.find(s => s.studentId === studentId && s.packageId === packageId);
    
    if (!assignModal.isOneOff && selectedStudentDetails && selectedStudentDetails.packageRemainingMinutes != null) {
      const maxHours = Math.floor(selectedStudentDetails.packageRemainingMinutes / 60);
      if (!isUnlimited && totalHours > maxHours) {
        setErrorModal(`Paket bakiyesi yetersiz! Öğrencinin paketinde ${maxHours} saat kalmış. ${totalHours} saat planlayamazsınız.`);
        setPending(false);
        return;
      }
    }

    const res = await assignLessonAction({
      teacherId: assignModal.teacherId,
      subjectId: assignModal.subjectId,
      studentId: studentId,
      packageId: packageId,
      startTime: assignModal.startTime,
      durationMinutes: orgSettings.lessonDur,
      isOneOff: assignModal.isOneOff,
      totalLessons: assignModal.isOneOff ? 1 : (isUnlimited ? -1 : totalHours),
    });
    
    if (res.error) {
      setErrorModal(res.error);
      setPending(false);
      return; // Stop here if there's an error, don't close assign modal yet so they can fix it
    }
    
    setPending(false);
    setAssignModal(null);
    setSelectedStudentId('');
    router.refresh(); // Or we can rely on revalidatePath in action
  };

  const closeAssignModal = () => {
    setAssignModal(null);
    setSelectedStudentId('');
    setStudentSearch('');
    setIsDropdownOpen(false);
    setTotalHours(1);
    setIsUnlimited(false);
  };

  const handleUpdateStatus = async (lessonId: string, status: string) => {
    setPending(true);
    await updateLessonStatusAction(lessonId, status);
    setPending(false);
    setDetailModal(null);
    router.refresh();
  };

  const handleDeleteLesson = (lessonId: string) => {
    setLessonToDelete(lessonId);
  };

  const confirmDeleteLesson = async () => {
    if (!lessonToDelete) return;
    setPending(true);
    const res = await deleteLessonAction(lessonToDelete);
    setPending(false);
    
    if (res.success) {
      setDetailModal(null);
      setLessonToDelete(null);
      router.refresh();
    } else {
      setErrorModal(res.error || 'Ders silinemedi');
    }
  };

  const handleWhatsAppAction = (actionType: 'notify' | 'cancel' | 'unexcused' | 'teacher_absent') => {
    const isParent = whatsAppRecipient === 'PARENT';
    const targetPhone = isParent ? detailModal?.studentParentPhone : detailModal?.studentPhone;
    if (!targetPhone) return;
    
    // Clean phone number
    let phoneNum = targetPhone.replace(/[^0-9]/g, '');
    if (phoneNum.length === 11 && phoneNum.startsWith('0')) {
      phoneNum = '9' + phoneNum;
    } else if (phoneNum.length === 10 && phoneNum.startsWith('5')) {
      phoneNum = '90' + phoneNum;
    }

    const lessonDateStr = format(new Date(detailModal.startTime), 'dd MMMM yyyy', { locale: tr });
    const lessonTimeStr = format(new Date(detailModal.startTime), 'HH:mm');
    const teacher = teachers.find(t => t.teacherId === detailModal.teacherId);
    const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Öğretmeniniz';
    
    let message = '';
    
    if (isParent) {
      const parentGreeting = `Sayın ${detailModal.studentParentName || 'Velimiz'}, öğrencimiz ${detailModal.studentFirstName} ${detailModal.studentLastName}'in`;
      if (actionType === 'notify') {
        message = `${parentGreeting} ${lessonDateStr} saat ${lessonTimeStr} tarihindeki ${teacherName} ile olan dersi planlanmıştır. Bilginize sunarız.`;
      } else if (actionType === 'cancel') {
        message = `${parentGreeting} ${lessonDateStr} saat ${lessonTimeStr} tarihindeki ${teacherName} ile olan dersi iptal edilmiştir.`;
      } else if (actionType === 'unexcused') {
        message = `${parentGreeting} ${lessonDateStr} saat ${lessonTimeStr} tarihindeki ${teacherName} ile olan dersine mazeretsiz olarak katılmadığı tespit edilmiştir. Bilginize sunarız.`;
      } else if (actionType === 'teacher_absent') {
        message = `${parentGreeting} ${lessonDateStr} saat ${lessonTimeStr} tarihindeki ${teacherName} ile olan dersi öğretmenimizin mazereti nedeniyle bugün yapılamayacaktır. Ders hakkınız saklıdır ve en kısa sürede telafi dersi planlanacaktır. Bilginize sunarız.`;
      }
    } else {
      if (actionType === 'notify') {
        message = `Merhaba ${detailModal.studentFirstName}, ${lessonDateStr} saat ${lessonTimeStr} tarihindeki ${teacherName} ile olan dersiniz planlanmıştır.`;
      } else if (actionType === 'cancel') {
        message = `Merhaba ${detailModal.studentFirstName}, ${lessonDateStr} saat ${lessonTimeStr} tarihindeki ${teacherName} ile olan dersiniz iptal edilmiştir.`;
      } else if (actionType === 'unexcused') {
        message = `Merhaba ${detailModal.studentFirstName}, ${lessonDateStr} saat ${lessonTimeStr} tarihindeki ${teacherName} ile olan dersinize mazeretsiz olarak katılmadığınız tespit edilmiştir.`;
      } else if (actionType === 'teacher_absent') {
        message = `Merhaba ${detailModal.studentFirstName}, ${lessonDateStr} saat ${lessonTimeStr} tarihindeki ${teacherName} ile olan dersimiz öğretmenimizin mazereti nedeniyle yapılamayacaktır. Ders hakkın saklıdır ve en kısa sürede telafisi yapılacaktır. İyi günler dileriz!`;
      }
    }

    const url = `https://api.whatsapp.com/send?phone=${phoneNum}&text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  return (
    <>
    <div className="flex flex-col h-full bg-white relative print:hidden">
      
      {/* Scrollable Container */}
      <div className="flex-1 relative w-full overflow-auto custom-scrollbar">
        <div className="min-w-max md:min-w-full flex flex-col align-top h-full">
          
          {/* Header Row (Time Slots) */}
          <div className="flex sticky top-0 z-20 bg-white border-b border-gray-200 w-full shadow-sm">
            <div className="w-44 shrink-0 border-r border-gray-200 p-3 flex items-center justify-center font-bold text-gray-500 bg-white sticky left-0 z-30 shadow-[1px_0_5px_-2px_rgba(0,0,0,0.1)] text-xs">
              Branş & Öğretmen
            </div>
            {timeSlots.map((slot, i) => (
              <div key={i} className="flex-1 min-w-[80px] md:min-w-0 border-r border-gray-200 p-1 flex flex-col items-center justify-center">
                <span className="text-xs font-bold text-gray-900">{format(slot.start, 'HH:mm')}</span>
                <span className="text-[10px] font-medium text-gray-500">{format(slot.end, 'HH:mm')}</span>
              </div>
            ))}
          </div>

          {/* Body Rows */}
          {Object.entries(teachersBySubject).map(([subjectName, tList]) => (
            <div key={subjectName}>
              {/* Subject Group Header */}
              <div 
                className="flex w-full border-b"
                style={{ 
                  backgroundColor: `${tList[0].subjectColor}10`, 
                  borderColor: `${tList[0].subjectColor}30` 
                }}
              >
                <div 
                  className="w-44 shrink-0 p-2 pl-3 text-[11px] font-extrabold uppercase tracking-wider sticky left-0 z-10 border-r"
                  style={{ 
                    color: tList[0].subjectColor,
                    borderColor: `${tList[0].subjectColor}30`,
                    backgroundColor: `${tList[0].subjectColor}15`
                  }}
                >
                  {subjectName}
                </div>
                <div className="flex-1" />
              </div>

              {/* Teachers */}
              {tList.map(teacher => {
                const isExternal = teacher.compensationModel === 'EXTERNAL_HOURLY';
                return (
                <div key={teacher.teacherId} className="flex border-b border-gray-100 hover:bg-gray-50/50 transition-colors group w-full">
                  
                  {/* Teacher Name Sidebar */}
                  <div 
                    onClick={() => mode === 'planning' && setScheduleModalTeacher({ id: teacher.teacherId, name: `${teacher.firstName} ${teacher.lastName}`, subjectId: teacher.subjectId })}
                    className={`w-44 shrink-0 p-2 border-r flex items-center gap-2 sticky left-0 z-10 transition-colors ${mode === 'planning' ? 'cursor-pointer' : ''} ${isExternal ? 'bg-orange-50 border-orange-100 group-hover:bg-orange-100' : 'bg-white border-gray-200 group-hover:bg-gray-50'}`}
                  >
                    <img src="/images/teacher.png" alt="Öğretmen" className={`w-7 h-7 rounded-full shrink-0 object-contain p-1 ${isExternal ? 'bg-orange-200/60' : 'bg-indigo-50 border border-indigo-100'}`} />
                    <span className={`font-semibold text-xs truncate ${isExternal ? 'text-orange-950' : 'text-gray-900'}`}>
                      {teacher.firstName} {teacher.lastName}
                    </span>
                    {isExternal && (
                      <span className="ml-auto text-[8px] font-bold bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded uppercase">Dışı</span>
                    )}
                  </div>

                  {/* Time Slot Cells */}
                  {timeSlots.map((slot, i) => {
                    // Find if a lesson overlaps with this slot
                    const slotLessons = lessons.filter(l => {
                      if (l.teacherId !== teacher.teacherId) return false;
                      const lStart = new Date(l.startTime).getTime();
                      const lEnd = new Date(l.endTime).getTime();
                      const sStart = slot.start.getTime();
                      const sEnd = slot.end.getTime();
                      // Overlap logic: lesson starts before slot ends AND lesson ends after slot starts
                      return (lStart < sEnd && lEnd > sStart);
                    });
                    const cellLesson = slotLessons.find(l => l.status !== 'CANCELLED') || slotLessons[0];

                    let containerClass = "w-full h-full min-h-[50px] rounded-lg border shadow-sm flex flex-col justify-center px-2 py-1.5 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] overflow-hidden ";
                    let textClass = "text-[11px] font-bold leading-tight w-full break-words whitespace-normal text-center mb-1 ";
                    let pillClass = "text-[9px] font-semibold mt-auto opacity-80 rounded px-1.5 py-[1px] w-max mx-auto ";

                    if (cellLesson?.status === 'COMPLETED') {
                      containerClass += "bg-emerald-50/90 border-emerald-200/60 border-l-[3px] border-l-emerald-500";
                      textClass += "text-emerald-900";
                      pillClass += "bg-emerald-100/80 text-emerald-800";
                    } else if (cellLesson?.status === 'UNEXCUSED') {
                      containerClass += "bg-orange-50/80 border-orange-200/60 border-l-[3px] border-l-orange-400 opacity-90";
                      textClass += "text-orange-800 line-through decoration-orange-400/50";
                      pillClass += "bg-orange-100/80 text-orange-800";
                    } else if (cellLesson?.status === 'CANCELLED') {
                      containerClass += "bg-rose-50/80 border-rose-200/60 border-l-[3px] border-l-rose-400 opacity-80";
                      textClass += "text-rose-700 line-through decoration-rose-400/50";
                      pillClass += "bg-rose-100/80 text-rose-700";
                    } else if (cellLesson?.status === 'TEACHER_ABSENT') {
                      containerClass += "bg-purple-50/90 border-purple-200/60 border-l-[3px] border-l-purple-500 opacity-90";
                      textClass += "text-purple-900 font-bold";
                      pillClass += "bg-purple-100/80 text-purple-800";
                    } else { // PLANNED
                      containerClass += "bg-amber-50/90 border-amber-200/60 border-l-[3px] border-l-amber-500";
                      textClass += "text-amber-900";
                      pillClass += "bg-amber-100/80 text-amber-800";
                    }

                    return (
                      <div key={i} className="flex-1 min-w-[80px] md:min-w-0 border-r border-gray-100 p-1 relative group/cell">
                        {cellLesson ? (
                          <div 
                            onClick={() => setDetailModal(cellLesson)}
                            className={containerClass}
                          >
                            <span className={textClass}>
                              {cellLesson.studentFirstName} {cellLesson.studentLastName}
                            </span>
                            <span className={pillClass}>
                              {cellLesson.status === 'COMPLETED' ? '✔' : 
                               cellLesson.status === 'UNEXCUSED' ? '✖' : 
                               cellLesson.status === 'CANCELLED' ? 'İptal' : 
                               cellLesson.status === 'TEACHER_ABSENT' ? 'Öğrt.' : 'Saat'}
                            </span>
                          </div>
                        ) : (
                          (() => {
                            const slotTimeStr = format(slot.start, 'HH:mm');
                            const isAvailable = availabilities.some(a => 
                              a.teacherId === teacher.teacherId && 
                              a.dayOfWeek === dayOfWeek &&
                              a.startTime === slotTimeStr
                            );
                            const isPast = slot.start.getTime() < new Date().getTime();

                            if (mode === 'planning') {
                              if (isAvailable) {
                                if (isPast) {
                                  return (
                                    <div className="w-full h-full min-h-[44px] rounded-lg bg-gray-50 flex flex-col items-center justify-center border border-transparent opacity-60 cursor-not-allowed">
                                      <span className="text-[9px] font-semibold text-gray-400 mb-0.5">Süre Geçti</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div 
                                    onClick={() => setAssignModal({ teacherId: teacher.teacherId, subjectId: teacher.subjectId, startTime: slot.start })}
                                    className="w-full h-full min-h-[44px] rounded-lg border border-red-100 bg-red-50/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-red-50 hover:border-red-200 group-hover/cell:shadow-sm"
                                  >
                                    <span className="text-[9px] font-semibold text-red-500 opacity-80 mb-0.5">Planlanmamış</span>
                                    <Plus className="w-3.5 h-3.5 text-red-400 opacity-50 group-hover/cell:opacity-100 transition-opacity" />
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="w-full h-full min-h-[44px] rounded-lg bg-gray-50 flex flex-col items-center justify-center border border-transparent opacity-80">
                                    <span className="text-[10px] font-bold text-gray-500">
                                      Dersi Var
                                    </span>
                                  </div>
                                );
                              }
                            } else {
                              // Attendance Mode
                              if (isAvailable) {
                                return (
                                  <div className="w-full h-full min-h-[44px] rounded-lg bg-green-50/50 flex flex-col items-center justify-center border border-green-100/50">
                                    <span className="text-[10px] font-bold text-green-600/70">
                                      Boş
                                    </span>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="w-full h-full min-h-[44px] rounded-lg bg-gray-50 flex flex-col items-center justify-center border border-transparent opacity-80">
                                    <span className="text-[10px] font-bold text-gray-400">
                                      Dersi Var
                                    </span>
                                  </div>
                                );
                              }
                            }
                          })()
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            </div>
          ))}
          
        </div>
      </div>
    </div>

      {/* ASSIGN MODAL */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={closeAssignModal} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-visible animate-in zoom-in-95 fade-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-3xl">
              <h3 className="text-xl font-bold text-gray-900">Öğrenci Ata</h3>
              <button onClick={closeAssignModal} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleAssignSubmit} className="p-6">
              <div className="mb-6 p-4 bg-indigo-50 text-indigo-700 rounded-2xl flex items-center gap-3">
                <Clock className="w-5 h-5" />
                <div>
                  <p className="text-sm font-bold">{format(assignModal.startTime, 'd MMMM yyyy', { locale: tr })}</p>
                  <p className="text-xs opacity-80">{format(assignModal.startTime, 'HH:mm')} - {format(addMinutes(assignModal.startTime, orgSettings.lessonDur), 'HH:mm')}</p>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <label className="text-sm font-semibold text-gray-700">Öğrenci Seçin</label>
                <div className="relative">
                  <input type="hidden" name="studentId" value={selectedStudentId} required />
                  <div 
                    className="w-full rounded-xl border border-gray-200 p-4 text-base bg-white cursor-pointer flex justify-between items-center focus-within:ring-2 focus-within:ring-primary/20 hover:border-primary/50 transition-colors shadow-sm"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  >
                    <span className={selectedStudentId ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                      {selectedStudentDetails ? 
                        `${selectedStudentDetails.firstName} ${selectedStudentDetails.lastName} ${selectedStudentDetails.packageTitle ? `(${selectedStudentDetails.packageTitle})` : '(Paket Yok)'}`
                        : 'Öğrenci arayın veya seçin...'}
                    </span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </div>
                  
                  {isDropdownOpen && (
                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-20 backdrop-blur-sm bg-white/90">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input 
                            type="text" 
                            className="w-full pl-9 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-base focus:border-primary focus:ring-1 focus:ring-primary focus:bg-white outline-none transition-all shadow-sm"
                            placeholder="İsim veya paket ara..."
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="p-1">
                        {filteredStudents.length > 0 ? (
                          filteredStudents.map((s, idx) => {
                            const val = `${s.studentId}|${s.packageId}`;
                            const isSelected = selectedStudentId === val;
                            return (
                              <div
                                key={`${s.studentId}-${s.packageId || idx}`}
                                onClick={() => {
                                  setSelectedStudentId(val);
                                  setIsDropdownOpen(false);
                                  setStudentSearch('');
                                }}
                                className={`px-4 py-3 rounded-lg text-base cursor-pointer transition-colors flex items-center justify-between ${isSelected ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'}`}
                              >
                                <span>{s.firstName} {s.lastName} <span className="opacity-70 text-sm ml-1 font-medium">{s.packageTitle ? `(${s.packageTitle})` : '(Paket Yok)'}</span></span>
                                {isSelected && <Check className="w-5 h-5" strokeWidth={3} />}
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-sm text-gray-500 font-medium">Öğrenci bulunamadı.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-amber-600 mt-1">Sadece aktif paketi olan öğrenciler atanabilir.</p>
              </div>

              {/* Toplam Saat Seçimi */}
              {!assignModal.isOneOff && (
                <div className="space-y-2 mb-6">
                  <label className="text-sm font-semibold text-gray-700">Toplam Ders Saati</label>
                  {/* Plansız / Paket Bitene Kadar Checkbox */}
                  <div className="flex items-center gap-2 mb-3">
                    <input 
                      type="checkbox" 
                      id="unlimited" 
                      checked={isUnlimited}
                      onChange={(e) => setIsUnlimited(e.target.checked)}
                      className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                    />
                    <label htmlFor="unlimited" className="text-sm font-semibold text-gray-700 cursor-pointer">
                      Süresiz Planla (Paket bitene kadar devam etsin)
                    </label>
                  </div>

                  {!isUnlimited && (
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setTotalHours(Math.max(1, totalHours - 1))}
                        className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={totalHours === 0 ? '' : totalHours}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          setTotalHours(val === '' ? 0 : parseInt(val, 10));
                        }}
                        onBlur={() => {
                          if (totalHours === 0) setTotalHours(1);
                        }}
                        className="w-20 text-center text-lg font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <button
                        type="button"
                        onClick={() => setTotalHours(totalHours + 1)}
                        className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center transition-colors"
                      >
                        +
                      </button>
                      <span className="text-sm text-gray-500 font-medium">saat</span>
                    </div>
                  )}

                  {/* Kalan Paket Bakiyesi */}
                  {selectedStudentDetails && (
                    <div className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-500">
                      <span>Paket bakiyesi:</span>
                      <span className="font-bold text-gray-900">
                        {selectedStudentDetails.packageRemainingMinutes ? Math.floor(selectedStudentDetails.packageRemainingMinutes / 60) : 0} saat kaldı
                      </span>
                    </div>
                  )}

                  {/* Bakiye Yetersizliği Uyarısı */}
                  {!isUnlimited && selectedStudentDetails && selectedStudentDetails.packageRemainingMinutes != null && (
                    totalHours > Math.floor(selectedStudentDetails.packageRemainingMinutes / 60)
                  ) && (
                    <div className="mt-2 p-3 bg-red-50 rounded-xl border border-red-200/60 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-red-700">Paket bakiyesi yetersiz!</p>
                        <p className="text-xs text-red-600 mt-0.5">
                          Öğrencinin paketinde <strong>{Math.floor(selectedStudentDetails.packageRemainingMinutes / 60)} saat</strong> kalmış.
                          {' '}{totalHours} saat planlayamazsınız.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tahmini Bitiş Tarihi */}
                  {assignModal && totalHours > 0 && !(selectedStudentDetails && selectedStudentDetails.packageRemainingMinutes != null && !isUnlimited && totalHours > Math.floor(selectedStudentDetails.packageRemainingMinutes / 60)) && (
                    <div className="mt-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100/50">
                      <div className="flex items-center gap-2 text-emerald-700">
                        <Clock className="w-4 h-4" />
                        <span className="text-xs font-semibold">
                          Tahmini eğitim tamamlanma tarihi:
                        </span>
                      </div>
                      <p className="text-sm font-bold text-emerald-900 mt-1">
                        {isUnlimited 
                          ? (selectedStudentDetails 
                              ? format(addDays(assignModal.startTime, (Math.floor((selectedStudentDetails.packageRemainingMinutes || 0) / 60) - 1) * 7), 'd MMMM yyyy, EEEE', { locale: tr })
                              : 'Paket bitene kadar devam edecek')
                          : format(addDays(assignModal.startTime, (totalHours - 1) * 7), 'd MMMM yyyy, EEEE', { locale: tr })
                        }
                      </p>
                      <p className="text-xs text-emerald-600 mt-0.5">
                        {isUnlimited 
                          ? `Paketteki kalan tüm ders hakkı kullanılacak (${selectedStudentDetails ? Math.floor((selectedStudentDetails.packageRemainingMinutes || 0) / 60) : '?'} saat)`
                          : `Haftada 1 ders × ${totalHours} hafta = ${totalHours} ders (${totalHours} saat)`
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}

              {conflictLesson && (
                <div className="mb-6 p-4 bg-amber-50 rounded-2xl border border-amber-200/60 shadow-sm flex items-start gap-3 animate-in fade-in zoom-in-95 duration-300">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm mb-1">Ders Çakışması Uyarısı!</h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Seçtiğiniz öğrencinin bu saatte (<strong>{format(new Date(conflictLesson.startTime), 'HH:mm')}</strong>) zaten planlanmış bir dersi bulunmaktadır. <br/>
                      Lütfen farklı bir saat veya öğrenci seçiniz.
                    </p>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                disabled={pending || !!conflictLesson || (!assignModal.isOneOff && !isUnlimited && selectedStudentDetails && selectedStudentDetails.packageRemainingMinutes != null && totalHours > Math.floor(selectedStudentDetails.packageRemainingMinutes / 60))} 
                className="w-full py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {pending ? 'Atanıyor...' : 'Dersi Kaydet'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL / ATTENDANCE MODAL */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setDetailModal(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col max-h-[92vh] border border-gray-100">
            {/* Modal Header */}
            <div 
              className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0"
              style={{ 
                background: `linear-gradient(to right, ${detailModal.subjectColor || '#004aad'}18, #ffffff)` 
              }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-11 h-11 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm border"
                  style={{ 
                    backgroundColor: `${detailModal.subjectColor || '#004aad'}20`,
                    borderColor: `${detailModal.subjectColor || '#004aad'}40`,
                    color: detailModal.subjectColor || '#004aad'
                  }}
                >
                  {detailModal.subjectName?.charAt(0) || 'D'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">Ders Detayı & Yoklama</h3>
                    <span 
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold border"
                      style={{ 
                        backgroundColor: `${detailModal.subjectColor || '#004aad'}15`, 
                        borderColor: `${detailModal.subjectColor || '#004aad'}35`,
                        color: detailModal.subjectColor || '#004aad'
                      }}
                    >
                      {detailModal.subjectName || 'Birebir Ders'}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="flex items-center gap-1 text-gray-700">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      {format(new Date(detailModal.startTime), 'd MMMM yyyy, EEEE', { locale: tr })}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-indigo-600 font-bold">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      {format(new Date(detailModal.startTime), 'HH:mm')} - {format(new Date(detailModal.endTime), 'HH:mm')}
                    </span>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setDetailModal(null)} 
                className="w-9 h-9 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 rounded-full transition-colors font-bold text-base"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Body - 2 Columns */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gradient-to-b from-white to-gray-50/40">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Sol Kolon (7/12): Bilgiler, Durum Seçimi ve Aksiyonlar */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  
                  {/* Öğrenci & Öğretmen Kartı */}
                  <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-base shadow-sm shrink-0">
                          <User className="w-6 h-6 text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base sm:text-lg font-black text-gray-900 truncate">
                            {detailModal.studentFirstName} {detailModal.studentLastName}
                          </h4>
                          <div className="text-xs text-gray-500 font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            <span>Öğr: {detailModal.studentPhone || 'Telefon Yok'}</span>
                            {detailModal.studentParentPhone && (
                              <>
                                <span className="text-gray-300">•</span>
                                <span className="text-indigo-600 font-semibold truncate" title={detailModal.studentParentName || 'Veli'}>
                                  Veli: {detailModal.studentParentName || 'Kayıtlı'} ({detailModal.studentParentPhone})
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Mevcut Durum Rozeti */}
                      <div className="shrink-0">
                        {detailModal.status === 'COMPLETED' ? (
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" /> Derse Katıldı
                          </span>
                        ) : detailModal.status === 'UNEXCUSED' ? (
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1.5">
                            <X className="w-3.5 h-3.5" /> Mazeretsiz
                          </span>
                        ) : detailModal.status === 'CANCELLED' ? (
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" /> Mazeretli İptal
                          </span>
                        ) : detailModal.status === 'TEACHER_ABSENT' ? (
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1.5">
                            <UserX className="w-3.5 h-3.5" /> Öğretmen Katılmadı
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Bekliyor
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-medium">Öğretmen:</span>
                        <span className="font-bold text-gray-800 truncate">
                          {(() => {
                            const t = teachers.find(tch => tch.teacherId === detailModal.teacherId);
                            return t ? `${t.firstName} ${t.lastName}` : (detailModal.teacherFirstName ? `${detailModal.teacherFirstName} ${detailModal.teacherLastName}` : 'Öğretmen');
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-medium">Derslik:</span>
                        <span className="font-bold text-gray-800 truncate">
                          {detailModal.classroomName || 'Birebir Eğitim'}
                        </span>
                      </div>
                    </div>

                    {/* Paket Bakiye Bilgisi */}
                    {detailModal.packageTotalMinutes && (
                      <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px] font-semibold text-gray-500">
                        <span>
                          Kalan Paket: <strong className="text-gray-900">{Math.floor(Math.max(0, parseInt(detailModal.packageTotalMinutes, 10) - parseInt(detailModal.packageConsumedMinutes || '0', 10)) / 60)} Saat</strong>
                        </span>
                        <span>
                          Planlanmamış: <strong className="text-indigo-600">{Math.floor(Math.max(0, parseInt(detailModal.packageTotalMinutes, 10) - parseInt(detailModal.packageConsumedMinutes || '0', 10) - (detailModal.packagePlannedMinutes || 0)) / 60)} Saat</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Yoklama Durumu Seçenekleri */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-extrabold uppercase tracking-wider text-gray-500">
                        Yoklama Durumunu Güncelle
                      </h5>
                      <span className="text-[10px] text-gray-400 font-medium">Tıklayarak yoklamayı anında işleyin</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      {/* 1. Derse Katıldı */}
                      <button 
                        onClick={() => handleUpdateStatus(detailModal.id, 'COMPLETED')}
                        disabled={pending || detailModal.status === 'COMPLETED'}
                        className={`p-3 rounded-2xl transition-all border flex items-center gap-3 text-left ${
                          detailModal.status === 'COMPLETED' 
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-500/20' 
                            : 'bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/80 border-emerald-200/70'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${detailModal.status === 'COMPLETED' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>
                          <Check className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black leading-tight">Derse Katıldı</div>
                          <div className={`text-[10px] font-medium leading-tight mt-0.5 ${detailModal.status === 'COMPLETED' ? 'text-emerald-100' : 'text-emerald-600'}`}>
                            1 saat bakiye düşer
                          </div>
                        </div>
                      </button>

                      {/* 2. Mazeretsiz Devamsızlık */}
                      <button 
                        onClick={() => handleUpdateStatus(detailModal.id, 'UNEXCUSED')}
                        disabled={pending || detailModal.status === 'UNEXCUSED'}
                        className={`p-3 rounded-2xl transition-all border flex items-center gap-3 text-left ${
                          detailModal.status === 'UNEXCUSED' 
                            ? 'bg-orange-500 text-white border-orange-600 shadow-md shadow-orange-500/20' 
                            : 'bg-orange-50/70 text-orange-800 hover:bg-orange-100/80 border-orange-200/70'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${detailModal.status === 'UNEXCUSED' ? 'bg-white/20' : 'bg-orange-100 text-orange-700'}`}>
                          <X className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black leading-tight">Mazeretsiz</div>
                          <div className={`text-[10px] font-medium leading-tight mt-0.5 ${detailModal.status === 'UNEXCUSED' ? 'text-orange-100' : 'text-orange-600'}`}>
                            Ceza (Bakiye düşer)
                          </div>
                        </div>
                      </button>

                      {/* 3. Mazeretli İptal */}
                      <button 
                        onClick={() => handleUpdateStatus(detailModal.id, 'CANCELLED')}
                        disabled={pending || detailModal.status === 'CANCELLED'}
                        className={`p-3 rounded-2xl transition-all border flex items-center gap-3 text-left ${
                          detailModal.status === 'CANCELLED' 
                            ? 'bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/20' 
                            : 'bg-rose-50/70 text-rose-800 hover:bg-rose-100/80 border-rose-200/70'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${detailModal.status === 'CANCELLED' ? 'bg-white/20' : 'bg-rose-100 text-rose-700'}`}>
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black leading-tight">Mazeretli İptal</div>
                          <div className={`text-[10px] font-medium leading-tight mt-0.5 ${detailModal.status === 'CANCELLED' ? 'text-rose-100' : 'text-rose-600'}`}>
                            Öğrenci mazereti / İade
                          </div>
                        </div>
                      </button>

                      {/* 4. Öğretmen Katılamadı */}
                      <button 
                        onClick={() => handleUpdateStatus(detailModal.id, 'TEACHER_ABSENT')}
                        disabled={pending || detailModal.status === 'TEACHER_ABSENT'}
                        className={`p-3 rounded-2xl transition-all border flex items-center gap-3 text-left ${
                          detailModal.status === 'TEACHER_ABSENT' 
                            ? 'bg-purple-600 text-white border-purple-700 shadow-md shadow-purple-600/20' 
                            : 'bg-purple-50/70 text-purple-800 hover:bg-purple-100/80 border-purple-200/70'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${detailModal.status === 'TEACHER_ABSENT' ? 'bg-white/20' : 'bg-purple-100 text-purple-700'}`}>
                          <UserX className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-black leading-tight">Öğretmen Katılmadı</div>
                          <div className={`text-[10px] font-medium leading-tight mt-0.5 ${detailModal.status === 'TEACHER_ABSENT' ? 'text-purple-100' : 'text-purple-600'}`}>
                            Öğrenci saati düşmez
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Alt İşlemler */}
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    {detailModal.status !== 'PLANNED' && (
                      <button 
                        onClick={() => handleUpdateStatus(detailModal.id, 'PLANNED')}
                        disabled={pending}
                        className="py-2.5 px-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-colors border border-gray-200 flex items-center gap-1.5"
                        title="İşlemi geri al ve dersi Planlandı durumuna getir"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                        <span>Planlandı Olarak Sıfırla</span>
                      </button>
                    )}
                    {(detailModal.status === 'CANCELLED' || detailModal.status === 'TEACHER_ABSENT') && (
                      <button 
                        onClick={() => {
                          setAssignModal({
                            teacherId: detailModal.teacherId,
                            subjectId: detailModal.subjectId,
                            startTime: new Date(detailModal.startTime),
                            isOneOff: true,
                          });
                          setDetailModal(null);
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs hover:bg-indigo-100 transition-colors border border-indigo-200"
                      >
                        <User className="w-4 h-4" />
                        <span>Bu Saate Yeni Öğrenci Ata</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteLesson(detailModal.id)}
                      disabled={pending}
                      className="py-2.5 px-3 rounded-xl bg-white text-gray-500 font-bold text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors border border-gray-200 flex items-center gap-1.5 ml-auto"
                      title="Dersi programdan tamamen sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Dersi Kaldır</span>
                    </button>
                  </div>
                </div>

                {/* Sağ Kolon (5/12): WhatsApp Bildirim Merkezi */}
                <div className="lg:col-span-5 bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm flex flex-col justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <p className="text-xs font-extrabold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />
                        WhatsApp Bildirimi
                      </p>

                      {/* Alıcı Seçici (Öğrenci / Veli) */}
                      <div className="inline-flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
                        <button
                          type="button"
                          onClick={() => setWhatsAppRecipient('STUDENT')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                            whatsAppRecipient === 'STUDENT'
                              ? 'bg-white text-indigo-700 shadow-sm'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          Öğrenci
                        </button>
                        <button
                          type="button"
                          onClick={() => setWhatsAppRecipient('PARENT')}
                          className={`px-2.5 py-1 rounded-md font-bold transition-all ${
                            whatsAppRecipient === 'PARENT'
                              ? 'bg-white text-indigo-700 shadow-sm'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          Veli
                        </button>
                      </div>
                    </div>

                    {/* Seçili Alıcı Bilgisi */}
                    <div className="text-xs bg-slate-50 rounded-xl p-3 border border-slate-200/60 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Hedef Alıcı</span>
                        <span className="font-extrabold text-gray-800 truncate">
                          {whatsAppRecipient === 'PARENT' 
                            ? (detailModal.studentParentName ? `${detailModal.studentParentName} (Veli)` : 'Öğrenci Velisi') 
                            : `${detailModal.studentFirstName} ${detailModal.studentLastName}`}
                        </span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[10px] uppercase font-bold text-gray-400">Telefon</span>
                        <span className={`font-mono font-bold ${
                          (whatsAppRecipient === 'PARENT' ? detailModal.studentParentPhone : detailModal.studentPhone)
                            ? 'text-indigo-600'
                            : 'text-red-500'
                        }`}>
                          {(whatsAppRecipient === 'PARENT' ? detailModal.studentParentPhone : detailModal.studentPhone) || 'Kayıt Yok'}
                        </span>
                      </div>
                    </div>

                    {/* Bildirim Butonları */}
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      <button
                        onClick={() => handleWhatsAppAction('notify')}
                        disabled={whatsAppRecipient === 'PARENT' ? !detailModal.studentParentPhone : !detailModal.studentPhone}
                        title={(whatsAppRecipient === 'PARENT' ? !detailModal.studentParentPhone : !detailModal.studentPhone) ? "Kayıtlı telefon numarası bulunmuyor" : ""}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-[#25D366]/10 text-[#075E54] hover:bg-[#25D366]/20 rounded-xl font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-[#25D366]/20"
                      >
                        <span>Yaklaşan Ders Saat Bildirimi</span>
                        <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      </button>

                      <button
                        onClick={() => handleWhatsAppAction('cancel')}
                        disabled={whatsAppRecipient === 'PARENT' ? !detailModal.studentParentPhone : !detailModal.studentPhone}
                        title={(whatsAppRecipient === 'PARENT' ? !detailModal.studentParentPhone : !detailModal.studentPhone) ? "Kayıtlı telefon numarası bulunmuyor" : ""}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-rose-150"
                      >
                        <span>Ders İptal Bildirimi Gönder</span>
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      </button>

                      <button
                        onClick={() => handleWhatsAppAction('unexcused')}
                        disabled={whatsAppRecipient === 'PARENT' ? !detailModal.studentParentPhone : !detailModal.studentPhone}
                        title={(whatsAppRecipient === 'PARENT' ? !detailModal.studentParentPhone : !detailModal.studentPhone) ? "Kayıtlı telefon numarası bulunmuyor" : ""}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-xl font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-orange-150"
                      >
                        <span>Devamsızlık Bildirimi Gönder</span>
                        <X className="w-4 h-4 text-orange-500" />
                      </button>

                      <button
                        onClick={() => handleWhatsAppAction('teacher_absent')}
                        disabled={whatsAppRecipient === 'PARENT' ? !detailModal.studentParentPhone : !detailModal.studentPhone}
                        title={(whatsAppRecipient === 'PARENT' ? !detailModal.studentParentPhone : !detailModal.studentPhone) ? "Kayıtlı telefon numarası bulunmuyor" : ""}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl font-bold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-purple-150"
                      >
                        <span>Öğretmen Mazeret Bildirimi</span>
                        <UserX className="w-4 h-4 text-purple-500" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-gray-400 text-center leading-relaxed">
                    Tıklandığında WhatsApp Web veya masaüstü uygulaması hedef numara ve hazır metin ile açılır.
                  </p>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {lessonToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Dersi Sil / İptal Et</h3>
              <p className="text-sm text-gray-500 text-center">
                Bu dersi kalıcı olarak kaldırmak istediğinize emin misiniz? 
                <br/><span className="text-xs font-semibold text-amber-600">(Mazeretli bir durum varsa, ders hakkı öğrenciye iade edilir)</span>
              </p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex gap-3 justify-end border-t border-gray-100">
              <button
                type="button"
                onClick={() => setLessonToDelete(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
                disabled={pending}
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={confirmDeleteLesson}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors disabled:opacity-50"
                disabled={pending}
              >
                {pending ? 'Siliniyor...' : 'Evet, Dersi Sil'}
              </button>
            </div>
          </div>
        </div>
      )}


      {scheduleModalTeacher && (
        <TeacherWeeklyScheduleModal
          teacherId={scheduleModalTeacher.id}
          teacherName={scheduleModalTeacher.name}
          orgSettings={orgSettings}
          onClose={() => setScheduleModalTeacher(null)}
          onAssignSlot={(assignDate, assignTime) => {
            const sTime = parse(assignTime, 'HH:mm', assignDate);
            setAssignModal({
              teacherId: scheduleModalTeacher.id,
              subjectId: scheduleModalTeacher.subjectId,
              startTime: sTime,
              isOneOff: false, // Changed from true so that it allows full package planning!
            });
            setScheduleModalTeacher(null);
          }}
        />
      )}
      {/* ERROR MODAL */}
      {errorModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setErrorModal(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200 p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">İşlem Başarısız</h3>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              {errorModal}
            </p>
            <button 
              onClick={() => setErrorModal(null)}
              className="w-full px-4 py-3 text-white bg-red-600 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm"
            >
              Tamam, Anladım
            </button>
          </div>
        </div>
      )}

    <div className="hidden print:block w-full bg-white print:p-8">
      <PrintableDailyTable 
        teachersBySubject={teachersBySubject}
        timeSlots={timeSlots}
        lessons={lessons}
        selectedDate={selectedDate}
        dayOfWeek={dayOfWeek}
      />
    </div>
    </>
  );
}
