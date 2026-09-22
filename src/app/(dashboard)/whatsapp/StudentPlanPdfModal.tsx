'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { X, Printer, Calendar, Clock, BookOpen, User, Sparkles, CheckCircle2 } from 'lucide-react';
import { PlannedLesson } from './WhatsAppClient';

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

type ScopeFilter = 'THIS_WEEK' | 'NEXT_7_DAYS' | 'THIS_MONTH' | 'ALL';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  student: Contact;
  lessons: PlannedLesson[];
  scopeFilter: ScopeFilter;
}

export function StudentPlanPdfModal({ isOpen, onClose, student, lessons, scopeFilter }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  // 1. Kapsam Başlığı ve Tarih Aralığı
  const getScopeBadge = (scope: ScopeFilter) => {
    switch (scope) {
      case 'THIS_WEEK':
        return 'Bu Haftalık Ders Programı';
      case 'NEXT_7_DAYS':
        return '7 Günlük Ders Programı';
      case 'THIS_MONTH':
        return 'Bu Ayki Ders Programı';
      case 'ALL':
      default:
        return 'Tüm Planlanan Dersler';
    }
  };

  // 2. Günlere Göre Ders Gruplama
  const sortedLessons = [...lessons].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
  const groupedByDate: Record<string, { dateFormatted: string; lessons: PlannedLesson[] }> = {};
  let totalMinutes = 0;
  const uniqueSubjects = new Set<string>();
  const uniqueTeachers = new Set<string>();

  sortedLessons.forEach(l => {
    const sDate = new Date(l.startTime);
    const dateKey = format(sDate, 'yyyy-MM-dd');
    const dateFormatted = format(sDate, 'd MMMM yyyy, EEEE', { locale: tr });
    
    if (!groupedByDate[dateKey]) {
      groupedByDate[dateKey] = { dateFormatted, lessons: [] };
    }
    groupedByDate[dateKey].lessons.push(l);

    // Sistem kuralı: Mola süresi ne olursa olsun her ders oturumu 1 saat (60 dk) sayılır
    totalMinutes += 60;
    if (l.subjectName) uniqueSubjects.add(l.subjectName);
    if (l.teacherFirstName) uniqueTeachers.add(`${l.teacherFirstName} ${l.teacherLastName || ''}`);
  });

  const totalHours = sortedLessons.length;

  // Tarih aralığı metni
  let periodText = '';
  if (sortedLessons.length > 0) {
    const firstDate = format(new Date(sortedLessons[0].startTime), 'd MMMM', { locale: tr });
    const lastDate = format(new Date(sortedLessons[sortedLessons.length - 1].startTime), 'd MMMM yyyy', { locale: tr });
    periodText = firstDate === lastDate ? firstDate : `${firstDate} - ${lastDate}`;
  }

  // Yazdırma fonksiyonu
  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div 
      id="student-plan-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200"
    >
      
      {/* Yazdırma Esnasında Sadece Bu Belgeyi Gösteren ve Tabloların İkiye Bölünmesini Engelleyen Özel Stil */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media screen {
          .plan-day-card {
            overflow: hidden;
          }
        }

        @media print {
          @page {
            size: A4 portrait !important;
            margin: 10mm 12mm !important;
          }
          html, body {
            background: #ffffff !important;
            height: auto !important;
            min-height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Sayfadaki diğer tüm elementleri yazdırmada gizle */
          body > *:not(#student-plan-modal-overlay) {
            display: none !important;
          }
          .no-print, nav, header, aside {
            display: none !important;
          }
          #student-plan-modal-overlay {
            position: static !important;
            display: block !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            backdrop-filter: none !important;
          }
          .pdf-modal-container {
            position: static !important;
            display: block !important;
            background: transparent !important;
            max-width: 100% !important;
            max-height: none !important;
            width: 100% !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .pdf-modal-scroll-area {
            display: block !important;
            overflow: visible !important;
            height: auto !important;
            max-height: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #printable-student-plan {
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            min-height: 0 !important;
            height: auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          /* Günlük Ders Tablolarının Sayfa Ortasında İkiye Bölünmesini Kesin Olarak Önle */
          .plan-day-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            overflow: visible !important;
            margin-bottom: 16px !important;
            border: 1px solid #e2e8f0 !important;
            box-shadow: none !important;
          }
          .plan-day-header {
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          .plan-day-card table {
            width: 100% !important;
            border-collapse: collapse !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .plan-day-card thead {
            display: table-header-group !important;
          }
          .plan-day-card tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .plan-header-card,
          .plan-student-card,
          .plan-footer-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            box-shadow: none !important;
          }
        }
      `}} />

      {/* Modal Kutusu */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="pdf-modal-container bg-slate-100 rounded-3xl max-w-4xl w-full max-h-[88vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-white/60 relative z-10"
      >
        
        {/* Modal Üst Kontrol Çubuğu (Ekranda görünür, yazdırmada gizlenir) */}
        <div className="no-print p-4 sm:px-6 bg-white border-b border-gray-200 flex items-center justify-between gap-4 shrink-0 shadow-xs relative z-20">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-extrabold text-sm sm:text-base text-gray-900 truncate">
                {student.firstName} {student.lastName} • {getScopeBadge(scopeFilter)}
              </h2>
              <p className="text-xs text-gray-500 font-medium">
                {lessons.length} Ders • {totalHours} Saat • {periodText}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handlePrint}
              className="cursor-pointer px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
              title="PDF Olarak Kaydet veya Yazdır"
            >
              <Printer className="w-4 h-4" />
              <span>PDF İndir / Yazdır</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer p-2.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
              title="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Önizleme Alanı - A4 Kağıt Görünümü */}
        <div className="pdf-modal-scroll-area flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
          
          <div 
            id="printable-student-plan" 
            className="w-full max-w-[210mm] mx-auto bg-white rounded-2xl shadow-xl border border-gray-200/80 p-6 sm:p-10 font-sans text-gray-900 flex flex-col justify-between min-h-[750px] mb-12"
          >
            <div>
              {/* 1. Üst Kurumsal Başlık & Logo */}
              <div className="plan-header-card flex items-center justify-between pb-4 border-b-2 border-indigo-100 gap-4">
                <div className="flex items-center gap-3">
                  <img 
                    src="/images/Logo.png" 
                    alt="birimO" 
                    className="h-10 sm:h-12 w-auto object-contain"
                    onError={(e) => {
                      // Fallback logo text if image fails
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div>
                    <div className="font-black text-xl tracking-tight text-[#004aad]">birimO</div>
                    <div className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Birebir Eğitim Yönetim Sistemi</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-700 font-extrabold text-xs tracking-wide">
                    {getScopeBadge(scopeFilter)}
                  </div>
                  <div className="text-[11px] text-gray-500 font-semibold mt-1">
                    {periodText}
                  </div>
                </div>
              </div>

              {/* 2. Öğrenci, Veli ve Özet Kartı (Tatlı & Şık Tasarım) */}
              <div className="plan-student-card my-5 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50/60 border border-indigo-100/70 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Öğrenci Bilgisi */}
                <div className="flex flex-col justify-center">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Öğrenci</span>
                  <div className="font-black text-base text-gray-900 mt-0.5">
                    {student.firstName} {student.lastName}
                  </div>
                  <div className="text-xs text-gray-500 font-medium font-mono mt-0.5">
                    {student.phone ? `Tel: ${student.phone}` : 'Tel: Kayıtlı Değil'}
                  </div>
                </div>

                {/* Veli Bilgisi */}
                <div className="flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-indigo-100/80 pt-2 sm:pt-0 sm:pl-4">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600">Veli İletişim</span>
                  <div className="font-bold text-sm text-gray-900 mt-0.5 truncate">
                    {student.parentName || 'Kayıtlı Veli Yok'}
                  </div>
                  <div className="text-xs text-gray-500 font-medium font-mono mt-0.5">
                    {student.parentPhone ? `Tel: ${student.parentPhone}` : 'Veli Teli Yok'}
                  </div>
                </div>

                {/* Plan Özeti Metrikleri */}
                <div className="flex items-center justify-start sm:justify-end gap-3 border-t sm:border-t-0 sm:border-l border-indigo-100/80 pt-2 sm:pt-0 sm:pl-4">
                  <div className="text-center px-3 py-1.5 bg-white rounded-xl shadow-2xs border border-indigo-100/60">
                    <span className="block text-sm font-black text-indigo-700">{lessons.length}</span>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Ders</span>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-white rounded-xl shadow-2xs border border-indigo-100/60">
                    <span className="block text-sm font-black text-teal-700">{totalHours}</span>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Saat</span>
                  </div>
                  <div className="text-center px-3 py-1.5 bg-white rounded-xl shadow-2xs border border-indigo-100/60">
                    <span className="block text-sm font-black text-purple-700">{uniqueSubjects.size}</span>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase">Branş</span>
                  </div>
                </div>
              </div>

              {/* 3. Gün Gün Ders Tablosu */}
              <div className="space-y-4 my-4">
                {Object.keys(groupedByDate).length === 0 ? (
                  <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-xl">
                    Seçili aralıkta planlanmış ders bulunmamaktadır.
                  </div>
                ) : (
                  Object.entries(groupedByDate).map(([dateKey, group]) => (
                    <div key={dateKey} className="plan-day-card rounded-xl border border-gray-200 bg-white shadow-2xs break-inside-avoid">
                      {/* Gün Başlığı */}
                      <div className="plan-day-header px-4 py-2.5 bg-slate-50 border-b border-gray-200 flex items-center justify-between text-xs">
                        <div className="font-extrabold text-gray-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                          <span>{group.dateFormatted}</span>
                        </div>
                        <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {group.lessons.length} Ders Oturumu
                        </span>
                      </div>

                      {/* Ders Satırları */}
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase border-b border-gray-100">
                            <th className="py-2 px-4 w-28">Saat</th>
                            <th className="py-2 px-4">Branş / Ders</th>
                            <th className="py-2 px-4">Öğretmen</th>
                            <th className="py-2 px-4 text-right w-20">Süre</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {group.lessons.map(l => {
                            const sTime = format(new Date(l.startTime), 'HH:mm');
                            const eTime = format(new Date(l.endTime), 'HH:mm');
                            const teacherName = l.teacherFirstName ? `${l.teacherFirstName} ${l.teacherLastName || ''}` : 'Atanmamış';
                            const durationMin = Math.max(1, Math.round((new Date(l.endTime).getTime() - new Date(l.startTime).getTime()) / 60000)) || 60;

                            return (
                              <tr key={l.lessonId} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-gray-800 font-mono whitespace-nowrap">
                                  {sTime} - {eTime}
                                </td>
                                <td className="py-2.5 px-4 whitespace-nowrap">
                                  <span className="inline-block font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100/60">
                                    {l.subjectName}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 font-semibold text-gray-800 whitespace-nowrap">
                                  {teacherName}
                                </td>
                                <td className="py-2.5 px-4 text-right text-gray-600 font-bold whitespace-nowrap">
                                  1 Saat
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 4. Tatlı Motive Edici Alt Not & Footer */}
            <div className="plan-footer-card pt-6 mt-6 border-t border-gray-200">
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center mb-3">
                <p className="text-xs text-indigo-900 font-medium flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span>
                    Sevgili <strong>{student.firstName}</strong>, planlı ve düzenli çalışma hedeflerine giden en güçlü yoldur. Derslerinde üstün başarılar dileriz!
                  </span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-gray-400 font-medium">
                <span>birimO Birebir Eğitim Yönetim Platformu</span>
                <span>Belge Tarihi: {format(new Date(), 'dd.MM.yyyy HH:mm')}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>,
    document.body
  );
}
