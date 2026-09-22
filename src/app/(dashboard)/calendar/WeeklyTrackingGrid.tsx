'use client';

import { useState } from 'react';
import { addDays, addMinutes, format, parse, setHours, setMinutes, isBefore, isAfter, isSameDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Search, CheckCircle2, XCircle, Clock, UserX, AlertCircle } from 'lucide-react';

type Props = {
  selectedDate: Date;
  weekStart: Date;
  weekEnd: Date;
  orgSettings: any;
  teachers: any[];
  lessons: any[];
};

export function WeeklyTrackingGrid({ selectedDate, weekStart, weekEnd, orgSettings, teachers, lessons }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  // Generate time slots based on org settings
  const generateTimeSlots = () => {
    const slots = [];
    const baseDate = new Date();
    
    let current = parse(orgSettings.start, 'HH:mm', baseDate);
    const end = parse(orgSettings.end, 'HH:mm', baseDate);
    const lunchStart = orgSettings.lunchBreakStart ? parse(orgSettings.lunchBreakStart, 'HH:mm', baseDate) : null;
    const lunchEnd = orgSettings.lunchBreakEnd ? parse(orgSettings.lunchBreakEnd, 'HH:mm', baseDate) : null;

    while (isBefore(current, end)) {
      const timeStr = format(current, 'HH:mm');
      
      let isLunchBreak = false;
      if (lunchStart && lunchEnd) {
        if ((isAfter(current, lunchStart) || current.getTime() === lunchStart.getTime()) && isBefore(current, lunchEnd)) {
          isLunchBreak = true;
        }
      }

      if (!isLunchBreak) {
        slots.push({
          start: timeStr,
          label: `${timeStr} - ${format(addMinutes(current, orgSettings.lessonDur), 'HH:mm')}`
        });
        current = addMinutes(current, orgSettings.lessonDur + (orgSettings.breakDur || 0));
      } else {
        current = addMinutes(current, 30); // Skip lunch break in 30min chunks
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Active days array mapping: "1,2,3" -> Sunday=0, Monday=1 etc...
  // In our DB, activeDays uses 1=Mon, 2=Tue... 7=Sun. date-fns getDay uses 0=Sun.
  const activeDaysConfig = orgSettings.activeDays ? orgSettings.activeDays.split(',').map(Number) : [1,2,3,4,5,6,7];
  
  // Create an array of active dates for this week
  const weekDates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(weekStart, i);
    // JS getDay(): 0=Sun, 1=Mon ... 6=Sat
    // MentorOS activeDays: 1=Mon ... 7=Sun
    let mentorDay = d.getDay();
    if (mentorDay === 0) mentorDay = 7;
    
    if (activeDaysConfig.includes(mentorDay)) {
      weekDates.push(d);
    }
  }

  // Filter lessons based on search
  const filteredLessons = lessons.filter(l => {
    if (!searchTerm) return true;
    const s = searchTerm.toLowerCase();
    const studentName = `${l.studentFirstName || ''} ${l.studentLastName || ''}`.toLowerCase();
    const teacher = teachers.find(t => t.teacherId === l.teacherId);
    const teacherName = teacher ? `${teacher.firstName} ${teacher.lastName}`.toLowerCase() : '';
    return studentName.includes(s) || teacherName.includes(s);
  });

  // Get lessons for a specific day and time
  const getLessonsForSlot = (date: Date, timeStr: string) => {
    return filteredLessons.filter(l => {
      const lessonDate = new Date(l.startTime);
      if (!isSameDay(lessonDate, date)) return false;
      const lessonTimeStr = format(lessonDate, 'HH:mm');
      return lessonTimeStr === timeStr;
    });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50/50 print:bg-white print:h-auto print:p-8">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { size: landscape; margin: 0; }
          body { 
            -webkit-print-color-adjust: exact; 
            print-color-adjust: exact; 
            background: white; 
          }
          /* Ensure the grid expands fully for print */
          .print-expand { height: auto !important; overflow: visible !important; }
        }
      `}} />
      
      {/* Search Header */}
      <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shrink-0 print:hidden">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Öğretmen veya Öğrenci ara..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-primary focus:border-primary shadow-sm"
          />
        </div>
        
        <button 
          onClick={() => window.print()}
          className="ml-4 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold text-sm transition-colors border border-indigo-200 shadow-sm whitespace-nowrap"
        >
          🖨️ Yazdır (PDF)
        </button>
      </div>

      {/* Print Header (Only visible during print) */}
      <div className="hidden print:flex flex-col items-center justify-center mb-6 pb-4 border-b-4 border-[#004aad]">
        <h1 className="text-2xl font-extrabold text-[#004aad] uppercase tracking-widest">Haftalık Ders Takibi</h1>
        <p className="text-lg font-bold text-gray-700 mt-2">
          {format(weekStart, 'd MMMM yyyy', { locale: tr })} - {format(weekEnd, 'd MMMM yyyy', { locale: tr })}
        </p>
      </div>

      {/* Grid Container (Desktop & Print) */}
      <div className="hidden md:block print:block flex-1 overflow-auto custom-scrollbar relative print-expand print:overflow-visible print:px-2">
        <table className="w-full border-collapse border border-gray-200 print:border-gray-300 min-w-[1000px] print:w-full print:min-w-0 print:table-fixed">
          <thead className="sticky top-0 z-20 bg-gray-50/95 backdrop-blur shadow-sm print:bg-gray-100">
            <tr>
              <th className="w-20 print:w-12 p-3 border border-gray-200 print:border-gray-300 text-xs font-bold text-gray-500 print:text-gray-900 uppercase tracking-wider bg-gray-100/50 print:bg-gray-200 text-center align-middle">
                <div className="flex items-center justify-center w-full h-full text-center">
                  Saat
                </div>
              </th>
              {weekDates.map(date => (
                <th key={date.toISOString()} className="p-3 border border-gray-200 print:border-gray-300 text-center min-w-[120px] print:min-w-0 print:w-auto">
                  <div className="font-bold text-gray-900 text-sm">
                    {format(date, 'EEEE', { locale: tr })}
                  </div>
                  <div className="text-xs text-gray-500 font-medium">
                    {format(date, 'd MMMM yyyy', { locale: tr })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, rowIndex) => (
              <tr key={slot.start} className="group print:break-inside-avoid">
                {/* Time Cell */}
                <td className="sticky left-0 z-10 w-24 p-0 border border-gray-200 print:border-gray-300 bg-gray-50/95 print:bg-gray-100 backdrop-blur group-hover:bg-gray-100 transition-colors h-full">
                  <div className="flex flex-col items-center justify-center h-full w-full py-2">
                    <span className="font-bold text-gray-700 print:text-gray-900 text-sm leading-none mb-0.5">{slot.start}</span>
                    <div className="text-[10px] text-gray-500 leading-none">{slot.label.split(' - ')[1]}</div>
                  </div>
                </td>
                
                {/* Days Cells */}
                {weekDates.map(date => {
                  const cellLessons = getLessonsForSlot(date, slot.start);
                  return (
                    <td key={date.toISOString()} className="p-1.5 border border-gray-200 print:border-gray-300 bg-white align-top transition-colors group-hover:bg-gray-50/50 min-h-[40px]">
                      <div className="flex flex-col gap-1.5">
                        {cellLessons.length === 0 ? (
                          <div className="h-full min-h-[30px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-gray-300 font-medium">-</span>
                          </div>
                        ) : (
                          cellLessons.map(lesson => {
                            const teacher = teachers.find(t => t.teacherId === lesson.teacherId);
                            const hexColor = lesson.subjectColor || teacher?.subjectColor || '#6366f1';
                            
                            return (
                              <div 
                                key={lesson.id} 
                                className="px-1.5 py-1 rounded-md shadow-sm print:shadow-none flex flex-col gap-0.5 leading-tight relative overflow-hidden"
                                style={{ 
                                  backgroundColor: `${hexColor}15`, 
                                  borderColor: `${hexColor}40`,
                                  borderWidth: '1px',
                                  color: hexColor
                                }}
                              >
                                {/* Status Indicator */}
                                <div className="absolute top-1.5 right-1.5">
                                  {lesson.status === 'COMPLETED' ? (
                                    <span title="Tamamlandı"><CheckCircle2 className="w-3 h-3 text-emerald-500" /></span>
                                  ) : lesson.status === 'CANCELLED' ? (
                                    <span title="İptal Edildi"><XCircle className="w-3 h-3 text-red-500" /></span>
                                  ) : lesson.status === 'TEACHER_ABSENT' ? (
                                    <span title="Öğretmen Katılmadı"><UserX className="w-3 h-3 text-purple-600" /></span>
                                  ) : lesson.status === 'UNEXCUSED' ? (
                                    <span title="Mazeretsiz Devamsızlık"><AlertCircle className="w-3 h-3 text-amber-500" /></span>
                                  ) : (
                                    <span title="Planlandı"><Clock className="w-3 h-3 opacity-50" /></span>
                                  )}
                                </div>
                                
                                {/* Header: Student Name + Status Icon */}
                                <div className="flex justify-between items-start gap-1">
                                  <span className="font-bold text-[11px] truncate w-full" style={{ color: '#1f2937' }}>
                                    {lesson.studentFirstName} {lesson.studentLastName}
                                  </span>
                                </div>
                                
                                {/* Details: Teacher & Subject */}
                                <div className="flex items-center justify-between text-[9px] font-bold opacity-90">
                                  <span className="truncate pr-1">
                                    {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Öğretmen'}
                                  </span>
                                  <span className={`shrink-0 ${lesson.status === 'CANCELLED' ? 'line-through opacity-50' : ''}`}>
                                    {lesson.subjectName || teacher?.subjectName || 'Ders'}
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View (Only Mobile) */}
      <div className="md:hidden print:hidden flex flex-col w-full bg-gray-50/30 gap-4 p-2 pb-6 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
        {weekDates.map(date => {
          // Find slots with lessons
          const slotsWithLessons = timeSlots.map(slot => ({
            ...slot,
            lessons: getLessonsForSlot(date, slot.start)
          })).filter(s => s.lessons.length > 0);

          if (slotsWithLessons.length === 0) return null;

          return (
            <div key={date.toISOString()} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10">
                <span className="font-bold text-gray-800 text-sm">{format(date, 'EEEE', { locale: tr })}</span>
                <span className="text-xs text-gray-500 font-medium">{format(date, 'd MMM', { locale: tr })}</span>
              </div>
              <div className="p-3 flex flex-col gap-3">
                {slotsWithLessons.map(slot => (
                  <div key={slot.start} className="flex gap-3 items-start">
                    <div className="w-16 shrink-0 bg-gray-50 rounded-lg p-2 text-center border border-gray-100 flex flex-col items-center justify-center">
                      <div className="font-bold text-gray-700 text-[11px] leading-none mb-1">{slot.start}</div>
                      <div className="text-[9px] text-gray-400 leading-none">{slot.label.split(' - ')[1]}</div>
                    </div>
                    <div className="flex-1 flex flex-col gap-2">
                      {slot.lessons.map(lesson => {
                        const teacher = teachers.find(t => t.teacherId === lesson.teacherId);
                        const hexColor = lesson.subjectColor || teacher?.subjectColor || '#6366f1';
                        
                        return (
                          <div 
                            key={lesson.id} 
                            className="px-2.5 py-2 rounded-lg shadow-sm flex flex-col gap-1 relative overflow-hidden"
                            style={{ 
                              backgroundColor: `${hexColor}15`, 
                              borderColor: `${hexColor}40`,
                              borderWidth: '1px',
                              color: hexColor
                            }}
                          >
                            <div className="absolute top-2 right-2">
                              {lesson.status === 'COMPLETED' ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              ) : lesson.status === 'CANCELLED' ? (
                                <XCircle className="w-3.5 h-3.5 text-red-500" />
                              ) : lesson.status === 'TEACHER_ABSENT' ? (
                                <UserX className="w-3.5 h-3.5 text-purple-600" />
                              ) : lesson.status === 'UNEXCUSED' ? (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 opacity-50" />
                              )}
                            </div>
                            
                            <span className="font-bold text-xs pr-6" style={{ color: '#1f2937' }}>
                              {lesson.studentFirstName} {lesson.studentLastName}
                            </span>
                            
                            <div className="flex items-center justify-between text-[10px] font-bold opacity-90">
                              <span className="truncate pr-2">
                                {teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Öğretmen'}
                              </span>
                              <span className={`shrink-0 ${lesson.status === 'CANCELLED' ? 'line-through opacity-50' : ''}`}>
                                {lesson.subjectName || teacher?.subjectName || 'Ders'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {/* Empty State */}
        {weekDates.every(date => timeSlots.every(slot => getLessonsForSlot(date, slot.start).length === 0)) && (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
            <p className="text-gray-500 text-sm font-medium">Bu hafta için planlanmış ders bulunmuyor.</p>
          </div>
        )}
      </div>
    </div>
  );
}
