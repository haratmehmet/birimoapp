import React from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface Props {
  teachersBySubject: Record<string, any[]>;
  timeSlots: { start: Date; end: Date; label: string }[];
  lessons: any[];
  selectedDate: string;
  dayOfWeek?: string;
}

export function PrintableDailyTable({ teachersBySubject, timeSlots, lessons, selectedDate, dayOfWeek }: Props) {
  const displayDate = format(new Date(selectedDate), 'dd MMMM yyyy EEEE', { locale: tr });
  
  return (
    <div className="w-full text-black font-sans">
      <div className="border-b-4 border-[#004aad] pb-4 mb-6 text-center">
        <h1 className="text-2xl font-extrabold uppercase tracking-widest text-[#004aad]">Günlük Ders Programı</h1>
        <p className="text-lg text-gray-700 font-bold mt-2">{displayDate}</p>
      </div>

      <table className="w-full border-collapse border border-gray-400 text-[10px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 p-2 text-left font-bold w-32 uppercase">ÖĞRETMEN</th>
            {timeSlots.map((slot, i) => (
              <th key={i} className="border border-gray-400 p-1 text-center font-bold">
                {slot.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.entries(teachersBySubject).map(([subject, subjectTeachers]) => (
            <React.Fragment key={subject}>
              <tr className="bg-gray-200/60">
                <td colSpan={timeSlots.length + 1} className="border border-gray-400 p-1.5 font-bold uppercase text-xs tracking-wider">
                  {subject}
                </td>
              </tr>
              {subjectTeachers.map(teacher => (
                <tr key={teacher.teacherId} className="even:bg-gray-50/50">
                  <td className="border border-gray-400 p-1.5 font-bold whitespace-nowrap">
                    {teacher.firstName} {teacher.lastName}
                  </td>
                  {timeSlots.map((slot, i) => {
                    // Find if there is a lesson in this slot
                    const slotStart = slot.start.getTime();
                    const slotEnd = slot.end.getTime();
                    const slotLessons = lessons.filter(l => {
                      if (l.teacherId !== teacher.teacherId || l.status === 'CANCELLED') return false;
                      const lStart = new Date(l.startTime).getTime();
                      const lEnd = new Date(l.endTime).getTime();
                      return (lStart < slotEnd && lEnd > slotStart);
                    });

                    if (slotLessons.length === 0) {
                      return <td key={i} className="border border-gray-400 p-1 text-center text-gray-300">-</td>;
                    }

                    return (
                      <td key={i} className="border border-gray-400 p-1 text-center font-semibold bg-blue-50/30">
                        {slotLessons.map((lesson, idx) => (
                          <div key={idx} className="leading-tight">
                            {lesson.studentFirstName} {lesson.studentLastName}
                          </div>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
