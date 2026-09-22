'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { CheckCircle2, Clock, XCircle, AlertCircle, Search, UserX } from 'lucide-react';

type Lesson = {
  id: string;
  startTime: Date;
  endTime: Date;
  durationMinutes: string;
  status: string;
  studentName: string | null;
  studentLastName: string | null;
  teacherName: string | null;
  teacherLastName: string | null;
  subjectName: string | null;
  classroomName: string | null;
};

export function AttendanceTable({ lessons }: { lessons: Lesson[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLessons = lessons.filter(lesson => {
    if (!searchQuery) return true;
    const fullName = `${lesson.studentName || ''} ${lesson.studentLastName || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/50 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Derse Katıldı</span>
          </div>
        );
      case 'CANCELLED':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/50 w-fit">
            <XCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Mazeretli (İptal)</span>
          </div>
        );
      case 'UNEXCUSED':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/50 w-fit">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Mazeretsiz</span>
          </div>
        );
      case 'TEACHER_ABSENT':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/50 w-fit">
            <UserX className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">Öğretmen Katılmadı</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200 w-fit">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">Bekliyor</span>
          </div>
        );
    }
  };

  if (lessons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Clock className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-1">Ders Bulunamadı</h3>
        <p className="text-sm text-gray-500 max-w-sm">
          Seçilen tarih aralığında gösterilecek herhangi bir ders kaydı bulunmamaktadır.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Öğrenci Adı Soyadı ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-w-0">
        
        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col">
          {filteredLessons.length > 0 ? (
            filteredLessons.map((lesson) => (
              <div key={lesson.id} className="p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50/50 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-gray-900">{lesson.studentName} {lesson.studentLastName}</h4>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{format(new Date(lesson.startTime), 'd MMM yyyy', { locale: tr })}</span>
                      <span>•</span>
                      <span className="font-medium text-gray-700">{format(new Date(lesson.startTime), 'HH:mm')} - {format(new Date(lesson.endTime), 'HH:mm')}</span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {getStatusBadge(lesson.status)}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-50 bg-gray-50/30 rounded-lg p-2">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-0.5">Öğretmen</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-[8px] font-bold">
                          {lesson.teacherName?.charAt(0) || 'Ö'}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-gray-700 truncate">{lesson.teacherName} {lesson.teacherLastName}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold block mb-0.5">Branş & Lokasyon</span>
                    <span className="text-xs font-medium text-gray-700 block truncate">{lesson.subjectName}</span>
                    <span className="text-[10px] text-gray-500 truncate block">{lesson.classroomName || 'Birebir Eğitim'}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 text-sm">
              Aradığınız kritere uygun öğrenci bulunamadı.
            </div>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto min-w-0 w-full pb-2">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
              <th className="px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Tarih / Saat</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Öğrenci</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Öğretmen</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Branş & Lokasyon</th>
              <th className="px-5 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider text-right">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredLessons.length > 0 ? (
              filteredLessons.map((lesson) => (
                <tr 
                  key={lesson.id} 
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-900">
                        {format(new Date(lesson.startTime), 'd MMMM yyyy', { locale: tr })}
                      </span>
                      <span className="text-gray-500 text-xs font-medium mt-0.5">
                        {format(new Date(lesson.startTime), 'HH:mm')} - {format(new Date(lesson.endTime), 'HH:mm')}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-semibold text-gray-900">
                      {lesson.studentName} {lesson.studentLastName}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-[10px] font-bold">
                          {lesson.teacherName?.charAt(0) || 'Ö'}
                        </span>
                      </div>
                      <span className="font-medium text-gray-700">{lesson.teacherName} {lesson.teacherLastName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{lesson.subjectName}</span>
                      <span className="text-gray-500 text-xs font-medium mt-0.5">
                        {lesson.classroomName || 'Birebir Eğitim'}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end">
                      {getStatusBadge(lesson.status)}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                  Aradığınız kritere uygun öğrenci bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
  );
}
