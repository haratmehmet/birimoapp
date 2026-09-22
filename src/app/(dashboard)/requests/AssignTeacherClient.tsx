// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { getTeachersForSubjectAction, getTeacherWeeklyScheduleAction, assignRequestTeacherAction, getStudentRemainingHoursAction } from './actions';
import { Button } from '@/components/ui/button';
import { format, setHours, setMinutes, addDays, startOfWeek, parse, addMinutes, isBefore, isEqual } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Clock, AlertCircle } from 'lucide-react';

export function AssignTeacherClient({ request, allSubjects, orgSettings }: { request: any, allSubjects: any[], orgSettings: any }) {
  // Find full subject objects for the requested subjects (by name mapping)
  const requestedSubjectObjects = allSubjects.filter(sub => request.subjects.includes(sub.name));
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    requestedSubjectObjects.length === 1 ? requestedSubjectObjects[0].id : ''
  );
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date, startTimeStr: string } | null>(null);
  
  const [isPending, setIsPending] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [remainingHours, setRemainingHours] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [totalHours, setTotalHours] = useState(1);
  const [isUnlimited, setIsUnlimited] = useState(false);

  const activeDaysArr = orgSettings?.activeDays ? orgSettings.activeDays.split(',') : ['1','2','3','4','5','6','7'];
  const activeOffsets = [0, 1, 2, 3, 4, 5, 6].filter(offset => activeDaysArr.includes(String(offset + 1)));

  // Fetch remaining hours
  useEffect(() => {
    if (request?.studentId) {
      getStudentRemainingHoursAction(request.studentId).then(res => {
        if (res && res.hours !== undefined) setRemainingHours(res.hours);
      });
    }
  }, [request?.studentId]);

  // Fetch teachers when subject changes
  useEffect(() => {
    if (selectedSubjectId) {
      getTeachersForSubjectAction(selectedSubjectId).then(res => {
        if (res.data) setTeachers(res.data);
      });
      setSelectedTeacherId('');
      setScheduleData(null);
      setSelectedSlot(null);
    }
  }, [selectedSubjectId]);

  // Fetch schedule when teacher or weekOffset changes
  useEffect(() => {
    if (selectedTeacherId) {
      const baseDateStr = addDays(new Date(), weekOffset * 7).toISOString();
      getTeacherWeeklyScheduleAction(selectedTeacherId, baseDateStr).then(res => {
        if (res.data) setScheduleData(res.data);
      });
      setSelectedSlot(null);
    }
  }, [selectedTeacherId, weekOffset]);

  const handleAssign = async () => {
    if (!selectedSlot || !selectedTeacherId || !selectedSubjectId) return;
    
    setIsPending(true);
    setErrorModal(null);

    const [hours, minutes] = selectedSlot.startTimeStr.split(':').map(Number);
    const startTimeDate = setMinutes(setHours(selectedSlot.date, hours), minutes);

    const lessonDur = parseInt(orgSettings?.lessonDurationMinutes || '60');

    if (remainingHours != null) {
      if (!isUnlimited && totalHours > remainingHours) {
        setErrorModal(`Paket bakiyesi yetersiz! Öğrencinin paketinde ${remainingHours} saat kalmış. ${totalHours} saat planlayamazsınız.`);
        setIsPending(false);
        return;
      }
    }

    const res = await assignRequestTeacherAction({
      requestId: request.id,
      studentId: request.studentId,
      teacherId: selectedTeacherId,
      subjectId: selectedSubjectId,
      startTime: startTimeDate,
      durationMinutes: lessonDur,
      totalLessons: isUnlimited ? -1 : totalHours,
    });

    setIsPending(false);
    if (res.error) {
      setErrorModal(res.error);
    } else {
      // Handled by revalidatePath in server actions or page refresh
      window.location.reload();
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    const baseDate = new Date();
    let current = parse(orgSettings?.startHour || '09:00', 'HH:mm', baseDate);
    const end = parse(orgSettings?.endHour || '18:00', 'HH:mm', baseDate);
    const lessonDur = parseInt(orgSettings?.lessonDurationMinutes || '60');
    const breakDur = parseInt(orgSettings?.breakDurationMinutes || '0');

    let lunchStart: Date | null = null;
    let lunchEnd: Date | null = null;
    if (orgSettings?.lunchBreakStartTime && orgSettings?.lunchBreakEndTime) {
      lunchStart = parse(orgSettings.lunchBreakStartTime, 'HH:mm', baseDate);
      lunchEnd = parse(orgSettings.lunchBreakEndTime, 'HH:mm', baseDate);
    }

    while (isBefore(current, end) || isEqual(current, end)) {
      const slotEnd = addMinutes(current, lessonDur);
      
      const isOverlapWithLunch = lunchStart && lunchEnd && (
        (isBefore(current, lunchEnd) && isBefore(lunchStart, slotEnd))
      );

      if (isOverlapWithLunch) {
        current = lunchEnd!;
        continue;
      }

      if (isBefore(slotEnd, end) || isEqual(slotEnd, end)) {
        slots.push({
          start: format(current, 'HH:mm'),
          end: format(slotEnd, 'HH:mm'),
          label: `${format(current, 'HH:mm')} - ${format(slotEnd, 'HH:mm')}`
        });
      }
      current = addMinutes(slotEnd, breakDur);
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const getSlotStatus = (date: Date, timeStr: string) => {
    if (!scheduleData) return { status: 'UNKNOWN' };
    
    const [h, m] = timeStr.split(':').map(Number);
    const slotStart = setMinutes(setHours(date, h), m);
    
    // Check teacher's base availability from teacherAvailability array
    const dayOfWeekEn = format(date, 'EEEE').toUpperCase(); 
    const isAvailableBase = scheduleData.availability.some((av: any) => {
      if (av.dayOfWeek.toUpperCase() !== dayOfWeekEn) return false;
      
      const [startH, startM] = av.startTime.split(':').map(Number);
      const [endH, endM] = av.endTime.split(':').map(Number);
      
      const avStart = setMinutes(setHours(date, startH), startM);
      const avEnd = setMinutes(setHours(date, endH), endM);
      
      return slotStart.getTime() >= avStart.getTime() && slotStart.getTime() < avEnd.getTime();
    });

    if (!isAvailableBase) return { status: 'UNAVAILABLE' };

    // Check lessons (Occupied)
    const isOccupied = scheduleData.upcomingLessons.find((l: any) => {
      const lStart = new Date(l.startTime);
      return lStart.getTime() === slotStart.getTime();
    });

    if (isOccupied) return { status: 'OCCUPIED', lesson: isOccupied };

    return { status: 'AVAILABLE' };
  };

  return (
    <div className="space-y-6">
      {/* 1. Subject Selection & Remaining Hours */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-semibold text-gray-700">Talep Edilen Branş</label>
          {remainingHours !== null && (
            <div className="flex items-center gap-1.5 text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg border border-indigo-100">
              <Clock className="w-3.5 h-3.5" />
              Kalan Ders: {remainingHours} Saat
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {requestedSubjectObjects.map(sub => (
            <button
              key={sub.id}
              onClick={() => setSelectedSubjectId(sub.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                selectedSubjectId === sub.id
                  ? 'bg-primary text-white border-primary shadow-md scale-105'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {sub.name}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Teacher Selection */}
      {selectedSubjectId && (
        <div className="animate-in fade-in slide-in-from-top-2">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Müsait Öğretmenler</label>
          <div className="flex flex-wrap gap-2">
            {teachers.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Bu branşta öğretmen bulunamadı.</p>
            ) : (
              teachers.map(teacher => (
                <button
                  key={teacher.id}
                  onClick={() => setSelectedTeacherId(teacher.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    selectedTeacherId === teacher.id
                      ? 'bg-amber-500 text-white border-amber-500 shadow-md scale-105'
                      : 'bg-white text-gray-600 border-gray-200 hover:bg-amber-50'
                  }`}
                >
                  {teacher.firstName} {teacher.lastName}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* 3. Schedule Grid */}
      {scheduleData && (
        <div className="animate-in fade-in slide-in-from-top-2 border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 p-3 border-b flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="font-semibold text-gray-700">Haftalık Müsaitlik Durumu</div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button 
                onClick={() => setWeekOffset(o => o - 1)}
                className="px-2 py-1 text-xs font-medium border border-gray-200 rounded-lg hover:bg-white transition-colors"
              >
                &larr; Önceki Hafta
              </button>
              <span className="text-xs font-semibold text-gray-600">
                {format(new Date(scheduleData.weekStart), 'dd MMM', { locale: tr })} - {format(addDays(new Date(scheduleData.weekStart), 6), 'dd MMM', { locale: tr })}
              </span>
              <button 
                onClick={() => setWeekOffset(o => o + 1)}
                className="px-2 py-1 text-xs font-medium border border-gray-200 rounded-lg hover:bg-white transition-colors"
              >
                Sonraki Hafta &rarr;
              </button>
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto min-w-0 w-full pb-2">
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th className="p-2 border-b border-r bg-gray-50 w-20">Saat</th>
                  {activeOffsets.map(offset => {
                    const d = addDays(scheduleData.weekStart, offset);
                    return (
                      <th key={offset} className="p-2 border-b font-medium text-gray-600">
                        {format(d, 'EEEE', { locale: tr })}<br/>
                        <span className="text-[10px] text-gray-400">{format(d, 'dd MMM')}</span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map(timeObj => (
                  <tr key={timeObj.start}>
                    <td className="p-2 border-r border-b bg-gray-50 text-center font-medium text-gray-500 whitespace-nowrap">{timeObj.label}</td>
                    {activeOffsets.map(offset => {
                      const d = addDays(scheduleData.weekStart, offset);
                      const statusObj = getSlotStatus(d, timeObj.start);
                      const isSelected = selectedSlot?.date.getTime() === d.getTime() && selectedSlot?.startTimeStr === timeObj.start;

                      return (
                        <td 
                          key={offset} 
                          className={`p-1 border-b text-center transition-all ${
                            statusObj.status === 'UNAVAILABLE' ? 'bg-gray-100 opacity-50' :
                            statusObj.status === 'OCCUPIED' ? 'bg-red-50' : 'hover:bg-primary/5 cursor-pointer'
                          } ${isSelected ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''}`}
                          onClick={() => {
                            if (statusObj.status === 'AVAILABLE') {
                              if (isSelected) {
                                setSelectedSlot(null);
                              } else {
                                setSelectedSlot({ date: d, startTimeStr: timeObj.start });
                              }
                            }
                          }}
                        >
                          {statusObj.status === 'UNAVAILABLE' ? (
                            <span className="block w-full py-2 bg-gray-200 text-gray-500 rounded font-bold text-[10px]">-</span>
                          ) : statusObj.status === 'OCCUPIED' ? (
                            <span className="block w-full py-1.5 bg-red-100 text-red-700 rounded font-bold text-[10px] truncate px-1">
                              {statusObj.lesson.studentFirstName} {statusObj.lesson.studentLastName}
                            </span>
                          ) : (
                            <span className={`block w-full py-2 rounded font-bold text-[10px] ${isSelected ? 'bg-primary text-white shadow-sm' : 'bg-green-50 text-green-600'}`}>
                              {isSelected ? 'Seçildi' : 'Boş'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col w-full bg-gray-50/30">
            {activeOffsets.map(offset => {
              const d = addDays(scheduleData.weekStart, offset);
              const daySlots = timeSlots.map(timeObj => ({ ...timeObj, statusObj: getSlotStatus(d, timeObj.start) }))
                .filter(s => s.statusObj.status !== 'UNAVAILABLE');
              
              if (daySlots.length === 0) return null;

              return (
                <div key={offset} className="border-b border-gray-100 last:border-0">
                  <div className="bg-white px-4 py-3 sticky top-0 z-10 shadow-sm border-b border-gray-100 flex items-center justify-between">
                    <span className="font-bold text-gray-800 text-sm">{format(d, 'EEEE', { locale: tr })}</span>
                    <span className="text-xs text-gray-500 font-medium">{format(d, 'dd MMM')}</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-3">
                    {daySlots.map(slot => {
                      const isSelected = selectedSlot?.date.getTime() === d.getTime() && selectedSlot?.startTimeStr === slot.start;
                      return (
                        <div 
                          key={slot.start}
                          onClick={() => {
                            if (slot.statusObj.status === 'AVAILABLE') {
                              if (isSelected) {
                                setSelectedSlot(null);
                              } else {
                                setSelectedSlot({ date: d, startTimeStr: slot.start });
                              }
                            }
                          }}
                          className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                            slot.statusObj.status === 'OCCUPIED' ? 'bg-red-50 border-red-100' : 'bg-white hover:bg-green-50 border-green-200 cursor-pointer shadow-sm'
                          } ${isSelected ? 'ring-2 ring-primary ring-inset bg-primary/10 border-primary' : ''}`}
                        >
                          <span className="text-xs font-bold text-gray-500 mb-1">{slot.label}</span>
                          {slot.statusObj.status === 'OCCUPIED' ? (
                            <span className="text-[11px] font-bold text-red-700 text-center leading-tight truncate w-full px-1">
                              {slot.statusObj.lesson.studentFirstName} {slot.statusObj.lesson.studentLastName}
                            </span>
                          ) : (
                            <span className={`text-[11px] font-bold ${isSelected ? 'text-primary' : 'text-green-600'}`}>
                              {isSelected ? 'Seçildi' : 'Boş'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {activeOffsets.every(offset => {
              const d = addDays(scheduleData.weekStart, offset);
              return timeSlots.every(timeObj => getSlotStatus(d, timeObj.start).status === 'UNAVAILABLE');
            }) && (
              <div className="p-8 text-center text-sm font-medium text-gray-500">
                Bu hafta için uygun veya planlı ders saati bulunmuyor.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Assignment Modal */}
      {selectedSlot && (
        <div className="fixed inset-0 z-[50] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedSlot(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Eğitim Planla</h3>
              <button onClick={() => setSelectedSlot(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">✕</button>
            </div>
            
            <div className="p-6 flex flex-col gap-5">
              <div className="text-sm text-gray-600 bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                <span className="font-bold text-gray-900">{format(selectedSlot.date, 'dd MMMM EEEE', { locale: tr })}</span> günü saat <span className="font-bold text-primary">{selectedSlot.startTimeStr}</span> için atanacak.
              </div>
              
              <div className="space-y-4">
                <label className="text-sm font-semibold text-gray-700">Toplam Ders Saati</label>
                
                {/* Plansız / Paket Bitene Kadar Checkbox */}
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="unlimited_assign" 
                    checked={isUnlimited}
                    onChange={(e) => setIsUnlimited(e.target.checked)}
                    className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary"
                  />
                  <label htmlFor="unlimited_assign" className="text-sm font-semibold text-gray-700 cursor-pointer">
                    Süresiz Planla (Paket bitene kadar devam etsin)
                  </label>
                </div>

                {!isUnlimited && (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setTotalHours(Math.max(1, totalHours - 1))}
                      className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center transition-colors shadow-sm"
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
                      className="w-20 text-center text-lg font-bold border border-gray-200 rounded-xl py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setTotalHours(totalHours + 1)}
                      className="w-10 h-10 rounded-xl border border-gray-200 bg-white hover:bg-gray-100 text-gray-700 font-bold text-lg flex items-center justify-center transition-colors shadow-sm"
                    >
                      +
                    </button>
                    <span className="text-sm text-gray-500 font-medium">saat</span>
                  </div>
                )}

                {/* Kalan Paket Bakiyesi */}
                {remainingHours != null && (
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <span>Paket bakiyesi:</span>
                    <span className="font-bold text-gray-900">
                      {remainingHours} saat kaldı
                    </span>
                  </div>
                )}

                {/* Bakiye Yetersizliği Uyarısı */}
                {!isUnlimited && remainingHours != null && totalHours > remainingHours && (
                  <div className="p-3 bg-red-50 rounded-xl border border-red-200/60 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-red-700">Paket bakiyesi yetersiz!</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        Öğrencinin paketinde <strong>{remainingHours} saat</strong> kalmış.
                        {' '}{totalHours} saat planlayamazsınız.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button 
                  onClick={handleAssign} 
                  disabled={isPending || (!isUnlimited && remainingHours != null && totalHours > remainingHours)}
                  className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-6 shadow-md hover:-translate-y-0.5 transition-all rounded-xl"
                >
                  {isPending ? 'Atanıyor...' : 'Dersi Ata ve Onayla'}
                </Button>
              </div>
            </div>
          </div>
        </div>
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
    </div>
  );
}
