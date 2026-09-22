// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { getTeacherWeeklyScheduleAction, cancelLessonAction } from '../requests/actions';
import { format, parse, addDays, addMinutes, setHours, setMinutes, isBefore, isEqual, isAfter } from 'date-fns';
import { tr } from 'date-fns/locale';

type Props = {
  teacherId: string;
  teacherName: string;
  orgSettings: any;
  onClose: () => void;
  onAssignSlot?: (date: Date, timeStr: string) => void;
};

export function TeacherWeeklyScheduleModal({ teacherId, teacherName, orgSettings, onClose, onAssignSlot }: Props) {
  const [scheduleData, setScheduleData] = useState<any>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCancelLesson, setSelectedCancelLesson] = useState<any>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchSchedule = () => {
    setIsLoading(true);
    const baseDateStr = addDays(new Date(), weekOffset * 7).toISOString();
    getTeacherWeeklyScheduleAction(teacherId, baseDateStr).then(res => {
      if (res.data) setScheduleData(res.data);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    fetchSchedule();
  }, [teacherId, weekOffset]);

  const handleCancelLesson = async (cancelSeries: boolean) => {
    if (!selectedCancelLesson) return;
    setIsCancelling(true);
    const res = await cancelLessonAction(selectedCancelLesson.id, cancelSeries);
    setIsCancelling(false);
    if (res.error) {
      alert(res.error);
    } else {
      setSelectedCancelLesson(null);
      fetchSchedule(); // refresh UI
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    const baseDate = new Date();
    let current = parse(orgSettings?.start || '09:00', 'HH:mm', baseDate);
    const end = parse(orgSettings?.end || '18:00', 'HH:mm', baseDate);
    const lessonDur = orgSettings?.lessonDur || 60;
    const breakDur = orgSettings?.breakDur || 0;

    let lunchStart: Date | null = null;
    let lunchEnd: Date | null = null;
    if (orgSettings?.lunchBreakStart && orgSettings?.lunchBreakEnd) {
      lunchStart = parse(orgSettings.lunchBreakStart, 'HH:mm', baseDate);
      lunchEnd = parse(orgSettings.lunchBreakEnd, 'HH:mm', baseDate);
    }

    while (isBefore(current, end)) {
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
  const activeDaysArr = orgSettings?.activeDays ? orgSettings.activeDays.split(',').map(Number) : [1,2,3,4,5,6,7];
  
  // Transform activeDaysArr (1=Mon..7=Sun) to date-fns offsets from weekStart (Monday=0..Sunday=6)
  const activeOffsets = activeDaysArr.map((d: number) => d === 7 ? 6 : d - 1).sort((a: number, b: number) => a - b);

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

    const isOccupied = scheduleData.upcomingLessons.find((l: any) => {
      const lStart = new Date(l.startTime);
      return lStart.getTime() === slotStart.getTime();
    });

    if (isOccupied) return { status: 'OCCUPIED', lesson: isOccupied };

    return { status: 'AVAILABLE' };
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 lg:pl-[17rem] print:p-0 print:m-0 print:block">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 0; }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            background: white !important; 
          }
          /* Hide everything in body */
          body * {
            visibility: hidden;
          }
          /* But show the modal and its children */
          #modal-print-area, #modal-print-area * {
            visibility: visible;
          }
          #modal-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            background: white !important;
            padding: 10mm !important;
            z-index: 999999 !important;
            margin: 0 !important;
            box-sizing: border-box !important;
          }
          #modal-print-area .print-hidden, #modal-print-area .print-hidden * { 
            visibility: hidden !important; 
            display: none !important; 
          }
        }
      `}} />
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm print:hidden" onClick={onClose} />
      <div 
        id="modal-print-area"
        className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col print:rounded-none print:shadow-none print:overflow-visible print:h-auto"
        style={{ 
          maxHeight: 'calc(100vh - 2rem)',
          width: '100%',
          maxWidth: 'min(64rem, 100%)',
        }}
      >
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 print:border-b-4 print:border-[#004aad] print:pb-4 print:mb-6 print:flex-col print:justify-center print:items-center print:text-center">
          <div className="min-w-0 flex-1 mr-4 print:mr-0 print:mb-2">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate print:whitespace-normal print:text-2xl print:font-extrabold print:uppercase print:tracking-widest print:text-[#004aad]">{teacherName} - Haftalık Müsaitlik</h3>
            <p className="text-xs text-gray-500 truncate print:whitespace-normal print:text-lg print:font-bold print:text-gray-700 print:mt-2">Öğretmenin seçili haftaya ait çalışma saatleri ve dolu olduğu dersler.</p>
          </div>
          <div className="flex items-center gap-2 print-hidden">
            <button 
              onClick={() => window.print()}
              className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold text-sm transition-colors border border-indigo-200"
            >
              🖨️ Yazdır
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors shrink-0">✕</button>
          </div>
        </div>
        
        <div className="overflow-auto flex-1 min-h-0 print:overflow-visible print:h-auto">
          <div className="p-3 sm:p-4 print:p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : scheduleData && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm print:border-none print:shadow-none print:overflow-visible">
              <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between bg-gray-50 gap-2 sm:gap-3 shrink-0 print:hidden">
                <h3 className="font-bold text-gray-800 flex items-center gap-2 text-sm sm:text-base">
                  Haftalık Durum Tablosu
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  <button 
                    onClick={() => setWeekOffset(o => o - 1)}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    &larr; Önceki Hafta
                  </button>
                  <div className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg">
                    {format(scheduleData.weekStart, 'dd MMM', { locale: tr })} - {format(addDays(scheduleData.weekStart, 6), 'dd MMM', { locale: tr })}
                  </div>
                  <button 
                    onClick={() => setWeekOffset(o => o + 1)}
                    className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Sonraki Hafta &rarr;
                  </button>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block print:flex print:justify-center overflow-x-auto print:overflow-visible print:w-full print:mx-auto">
                <table className="w-full text-[11px] border-collapse border border-gray-200 print:border-gray-300 print:mx-auto">
                  <thead className="print:bg-gray-50">
                    <tr>
                      <th className="p-1.5 border border-gray-200 print:border-gray-300 bg-gray-50 text-[11px] whitespace-nowrap align-middle">
                        <div className="flex items-center justify-center w-full h-full text-center print:text-gray-900">Saat</div>
                      </th>
                      {activeOffsets.map(offset => {
                        const d = addDays(scheduleData.weekStart, offset);
                        return (
                          <th key={offset} className="p-1.5 border border-gray-200 print:border-gray-300 font-medium text-gray-600 print:text-gray-900 text-[11px] text-center bg-white print:bg-gray-50">
                            {format(d, 'EEE', { locale: tr })}<br/>
                            <span className="text-[10px] text-gray-400 print:text-gray-500">{format(d, 'dd MMM')}</span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {timeSlots.map(timeObj => (
                      <tr key={timeObj.start} className="print:break-inside-avoid">
                        <td className="p-1.5 border border-gray-200 print:border-gray-300 bg-gray-50 text-center font-medium text-gray-500 print:text-gray-900 whitespace-nowrap text-[11px]">{timeObj.label}</td>
                        {activeOffsets.map(offset => {
                          const d = addDays(scheduleData.weekStart, offset);
                          const statusObj = getSlotStatus(d, timeObj.start);

                          return (
                            <td 
                              key={offset} 
                              className={`p-1 border border-gray-200 print:border-gray-300 text-center transition-all ${
                                statusObj.status === 'UNAVAILABLE' ? 'bg-gray-100 opacity-50 print:bg-gray-50/50 print:opacity-100' :
                                statusObj.status === 'OCCUPIED' ? 'bg-red-50' : 'bg-green-50/50 hover:bg-green-100/80 cursor-pointer'
                              }`}
                              onClick={() => {
                                if (statusObj.status === 'AVAILABLE' && onAssignSlot) {
                                  onAssignSlot(d, timeObj.start);
                                } else if (statusObj.status === 'OCCUPIED') {
                                  setSelectedCancelLesson(statusObj.lesson);
                                }
                              }}
                            >
                              {statusObj.status === 'UNAVAILABLE' ? (
                                <span className="block w-full py-1.5 bg-gray-200 print:bg-transparent text-gray-500 rounded font-bold text-[10px]">-</span>
                              ) : statusObj.status === 'OCCUPIED' ? (
                                <span className="block w-full py-1 bg-red-100 print:border print:border-red-200 text-red-700 rounded font-bold text-[10px] truncate px-1">
                                  {statusObj.lesson.studentFirstName} {statusObj.lesson.studentLastName}
                                </span>
                              ) : (
                                <span className="block w-full py-1.5 bg-white print:bg-green-50 text-green-600 border border-green-200 rounded font-bold text-[10px] hover:bg-green-50">Boş</span>
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
              <div className="md:hidden print:hidden flex flex-col w-full bg-gray-50/30">
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
                        {daySlots.map(slot => (
                            <div 
                              key={slot.start}
                              onClick={() => {
                                if (slot.statusObj.status === 'AVAILABLE' && onAssignSlot) {
                                  onAssignSlot(d, slot.start);
                                } else if (slot.statusObj.status === 'OCCUPIED') {
                                  setSelectedCancelLesson(slot.statusObj.lesson);
                                }
                              }}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                slot.statusObj.status === 'OCCUPIED' ? 'bg-red-50 border-red-100' : 'bg-white hover:bg-green-50 border-green-200 cursor-pointer shadow-sm'
                              }`}
                            >
                              <span className="text-xs font-bold text-gray-500 mb-1">{slot.label}</span>
                              {slot.statusObj.status === 'OCCUPIED' ? (
                                <span className="text-[11px] font-bold text-red-700 text-center leading-tight truncate w-full px-1">
                                  {slot.statusObj.lesson.studentFirstName} {slot.statusObj.lesson.studentLastName}
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-green-600">Boş</span>
                              )}
                            </div>
                        ))}
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
          </div>
        </div>
      </div>

      {selectedCancelLesson && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm" onClick={() => setSelectedCancelLesson(null)}>
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Ders İptali</h3>
            <p className="text-sm text-gray-600 mb-6">
              <span className="font-semibold text-gray-800">{selectedCancelLesson.studentFirstName} {selectedCancelLesson.studentLastName}</span> isimli öğrencinin dersini iptal etmek üzeresiniz. Bu işlem geçmiş dersleri etkilemez, slotu boşa çıkarır.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleCancelLesson(false)}
                disabled={isCancelling}
                className="w-full flex items-center justify-center py-2.5 px-4 bg-orange-50 text-orange-700 hover:bg-orange-100 rounded-xl font-bold transition-colors disabled:opacity-50"
              >
                Sadece Bu Dersi İptal Et
              </button>
              
              {selectedCancelLesson.seriesId && (
                <button
                  onClick={() => handleCancelLesson(true)}
                  disabled={isCancelling}
                  className="w-full flex items-center justify-center py-2.5 px-4 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  Bundan Sonraki Tüm Dersleri İptal Et
                </button>
              )}

              <button
                onClick={() => setSelectedCancelLesson(null)}
                disabled={isCancelling}
                className="w-full flex items-center justify-center py-2.5 px-4 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl font-bold transition-colors mt-2"
              >
                Vazgeç
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
