'use client';

import { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Archive, RotateCcw, Search, User, Phone, BookOpen, Clock } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils';
import { restoreStudentAction } from '../actions';

interface StudentPoolItem {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  gender: string | null;
  educationLevel: string | null;
  grade: string | null;
  status: string;
  createdAt: Date | null;
  parentName?: string | null;
  parentPhone?: string | null;
  totalPackageMinutes: number;
  consumedPackageMinutes: number;
}

export function PoolClient({ students }: { students: StudentPoolItem[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [educationFilter, setEducationFilter] = useState('ALL');
  const [selectedStudentForRestore, setSelectedStudentForRestore] = useState<StudentPoolItem | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      // Education Filter
      if (educationFilter !== 'ALL' && s.educationLevel !== educationFilter) {
        return false;
      }

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const fullName = `${s.firstName || ''} ${s.lastName || ''}`.toLowerCase();
      const phone = (s.phone || '').toLowerCase();
      const grade = (s.grade || '').toLowerCase();
      const edLevel = (s.educationLevel || '').toLowerCase();
      const parentName = (s.parentName || '').toLowerCase();
      const parentPhone = (s.parentPhone || '').toLowerCase();

      return fullName.includes(q) || phone.includes(q) || grade.includes(q) || edLevel.includes(q) || parentName.includes(q) || parentPhone.includes(q);
    });
  }, [students, searchQuery, educationFilter]);

  const handleConfirmRestore = () => {
    if (!selectedStudentForRestore) return;
    startTransition(async () => {
      const res = await restoreStudentAction(selectedStudentForRestore.id);
      if (res.error) {
        alert(res.error);
      }
      setSelectedStudentForRestore(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/students"
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-900"
              title="Öğrenciler Listesine Dön"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2.5 bg-indigo-100 rounded-xl">
              <Archive className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight">Öğrenci Havuzu</h1>
          </div>
          <p className="mt-1 text-gray-500 font-medium ml-12">
            Kurum havuzuna gönderilen (arşivlenen) öğrenciler burada listelenir. Dilediğiniz zaman tüm geçmiş kayıtlarıyla birlikte aktif listeye geri yükleyebilirsiniz.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center justify-between sm:justify-start bg-gray-100/80 p-1 rounded-xl shadow-inner border border-gray-200/50 backdrop-blur-sm overflow-x-auto custom-scrollbar">
          {[
            { id: 'ALL', label: 'TÜMÜ' },
            { id: 'LGS', label: 'LGS' },
            { id: 'YKS', label: 'YKS' },
            { id: 'MEZUN', label: 'MEZUN' },
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setEducationFilter(filter.id)}
              className={`px-3 py-1.5 md:px-4 md:py-1.5 text-[11px] md:text-xs font-extrabold tracking-wide rounded-lg transition-all duration-300 ${
                educationFilter === filter.id 
                  ? 'bg-white text-primary shadow-md ring-1 ring-black/5 scale-100 md:scale-105' 
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all sm:text-sm"
            placeholder="Öğrenci adı, telefon veya sınıf ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Students List */}
      {filteredStudents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Archive className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Öğrenci Havuzu Boş</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Henüz kurum havuzuna gönderilmiş öğrenci bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-0">
          {/* Mobile Card View */}
          <div className="md:hidden space-y-4 p-4">
            {filteredStudents.map(student => {
              const totalMins = student.totalPackageMinutes || 0;
              const consumedMins = student.consumedPackageMinutes || 0;
              const remainingMins = Math.max(0, totalMins - consumedMins);
              const remainingHours = Math.floor(remainingMins / 60);
              const remainingMinsMod = remainingMins % 60;

              return (
                <div 
                  key={student.id} 
                  onClick={() => router.push(`/students/${student.id}`)}
                  className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative overflow-hidden transition-colors cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between mb-3 border-b border-gray-50 pb-3">
                    <div className="flex items-center gap-3">
                      <img src="/images/student.png" alt="Öğrenci" className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 shrink-0 object-contain p-1.5" />
                      <div>
                        <h4 className="font-bold text-gray-900">{student.firstName} {student.lastName}</h4>
                        <p className="text-xs text-gray-500 mt-0.5">{student.educationLevel || '-'} / Sınıf: {student.grade || '-'}</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Havuzda
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Kalan Birebir</p>
                      <p className="font-black text-gray-700">
                        {remainingHours}s {remainingMinsMod > 0 ? `${remainingMinsMod}dk` : ''}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
                      <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">İletişim</p>
                      <p className="font-semibold text-gray-600 text-xs">
                        {student.phone ? formatPhoneNumber(student.phone) : '-'}
                      </p>
                      {(student.parentName || student.parentPhone) && (
                        <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                          Veli: {student.parentName || '-'} {student.parentPhone ? `(${formatPhoneNumber(student.parentPhone)})` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                    <span className="text-xs text-indigo-600 font-medium hover:underline">
                      Geçmiş Detayları &rarr;
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedStudentForRestore(student);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl transition-colors border border-emerald-200/50 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Geri Yükle
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto min-w-0 w-full pb-2">
            <table className="w-full text-sm align-middle">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Öğrenci Bilgisi</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Eğitim / Sınıf</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Paket Durumu</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">İletişim</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Durum</th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-500 uppercase tracking-wider text-[11px]">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filteredStudents.map(student => {
                  const totalMins = student.totalPackageMinutes || 0;
                  const consumedMins = student.consumedPackageMinutes || 0;
                  const remainingMins = Math.max(0, totalMins - consumedMins);
                  const remainingHours = Math.floor(remainingMins / 60);
                  const remainingMinsMod = remainingMins % 60;

                  return (
                    <tr 
                      key={student.id} 
                      onClick={() => router.push(`/students/${student.id}`)}
                      className="hover:bg-gray-50/80 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                            <img src="/images/student.png" alt="Öğrenci" className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 shrink-0 object-contain p-1.5" />
                          <div>
                            <div className="font-bold text-gray-900 group-hover:text-primary transition-colors">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-xs text-gray-400">ID: {student.id.slice(0, 8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800">{student.educationLevel || '-'}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Sınıf: {student.grade || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide bg-gray-100 text-gray-700 border border-gray-200">
                          {remainingHours}s {remainingMinsMod > 0 ? `${remainingMinsMod}dk` : ''} Kalan
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="font-semibold text-gray-800">
                          {student.phone ? formatPhoneNumber(student.phone) : '-'}
                        </div>
                        {(student.parentName || student.parentPhone) && (
                          <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                            <span className="text-[10px] uppercase font-bold text-gray-400">Veli:</span>
                            <span className="text-gray-700">{student.parentName || '-'}</span>
                            {student.parentPhone && <span className="text-gray-400">({formatPhoneNumber(student.parentPhone)})</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          Havuzda (Arşiv)
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStudentForRestore(student);
                          }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl transition-colors border border-emerald-200/50 text-xs"
                          title="Aktif Öğrenci Listesine Geri Yükle"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Geri Yükle
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {selectedStudentForRestore && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4" 
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" 
            onClick={() => setSelectedStudentForRestore(null)} 
          />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200 p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Öğrenciyi Geri Yükle</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">
              <span className="font-bold text-gray-900">
                {selectedStudentForRestore.firstName} {selectedStudentForRestore.lastName}
              </span>{' '}
              isimli öğrenciyi aktif öğrenci listesine geri yüklemek istediğinize emin misiniz? Öğrencinin geçmiş ders, paket ve yoklama kayıtları aynen korunarak aktif sisteme dönecektir.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedStudentForRestore(null)}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                disabled={isPending}
              >
                İptal
              </button>
              <button
                onClick={handleConfirmRestore}
                className="flex-1 px-4 py-2.5 text-white bg-emerald-600 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Yükleniyor...' : 'Evet, Geri Yükle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
