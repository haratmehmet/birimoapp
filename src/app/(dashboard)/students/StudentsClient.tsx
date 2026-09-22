'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StudentForm } from './StudentForm';
import { ExcelImportModal } from './ExcelImportModal';
import { Plus, User, Search, Filter, ArrowUpDown, FileSpreadsheet, PackagePlus, Trash2, Archive } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils';
import { deleteStudentAction, addPackageAction } from './actions';

export function StudentsClient({ students, isTeacher = false }: { students: any[], isTeacher?: boolean }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [educationFilter, setEducationFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState('NONE');
  const [tableSort, setTableSort] = useState<{column: 'total'|'consumed', dir: 'asc'|'desc'} | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Sayfa yüklendiğinde (Client-side mount) LocalStorage'dan değerleri okuyoruz
  useEffect(() => {
    const savedSearch = localStorage.getItem('birimoapp_students_search');
    const savedFilter = localStorage.getItem('birimoapp_students_filter');
    const savedSort = localStorage.getItem('birimoapp_students_sort');
    
    if (savedSearch) setSearchQuery(savedSearch);
    if (savedFilter) setEducationFilter(savedFilter);
    if (savedSort) setSortOrder(savedSort);
    
    setIsMounted(true);
  }, []);

  // Filtreler değiştikçe LocalStorage'a kaydediyoruz (sadece mount olduktan sonra)
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('birimoapp_students_search', searchQuery);
    }
  }, [searchQuery, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('birimoapp_students_filter', educationFilter);
    }
  }, [educationFilter, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('birimoapp_students_sort', sortOrder);
    }
  }, [sortOrder, isMounted]);

  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [deleteStudentId, setDeleteStudentId] = useState<string | null>(null);
  const [addPackageStudentId, setAddPackageStudentId] = useState<string | null>(null);
  const [packageHoursInput, setPackageHoursInput] = useState('');
  const [packageHourlyRateInput, setPackageHourlyRateInput] = useState('');
  const [isPending, setIsPending] = useState(false);

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(query) ||
        (s.parentName && s.parentName.toLowerCase().includes(query)) ||
        (s.parentPhone && s.parentPhone.includes(query)) ||
        (s.phone && s.phone.includes(query))
      );
    }

    if (educationFilter !== 'ALL') {
      result = result.filter(s => s.educationLevel === educationFilter);
    }

    if (tableSort) {
      result.sort((a, b) => {
        const aVal = tableSort.column === 'total' ? (a.totalPackageMinutes || 0) : (a.consumedPackageMinutes || 0);
        const bVal = tableSort.column === 'total' ? (b.totalPackageMinutes || 0) : (b.consumedPackageMinutes || 0);
        return tableSort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      });
    } else if (sortOrder !== 'NONE') {
      result.sort((a, b) => {
        const aMins = (a.totalPackageMinutes || 0) - (a.consumedPackageMinutes || 0);
        const bMins = (b.totalPackageMinutes || 0) - (b.consumedPackageMinutes || 0);
        return sortOrder === 'ASC' ? aMins - bMins : bMins - aMins;
      });
    }

    return result;
  }, [students, searchQuery, educationFilter, sortOrder, tableSort]);

  const toggleSort = (column: 'total' | 'consumed') => {
    if (tableSort?.column === column) {
      if (tableSort.dir === 'asc') setTableSort({ column, dir: 'desc' });
      else setTableSort(null);
    } else {
      setTableSort({ column, dir: 'asc' });
    }
  };

  const handleDelete = async () => {
    if (!deleteStudentId) return;
    setIsPending(true);
    await deleteStudentAction(deleteStudentId);
    setIsPending(false);
    setDeleteStudentId(null);
  };

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addPackageStudentId || !packageHoursInput) return;
    setIsPending(true);
    await addPackageAction(addPackageStudentId, parseInt(packageHoursInput, 10), packageHourlyRateInput);
    setIsPending(false);
    setAddPackageStudentId(null);
    setPackageHoursInput('');
    setPackageHourlyRateInput('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#004aad] tracking-tight">
            {isTeacher ? 'Öğrencilerim' : 'Öğrenciler'}
          </h1>
          <p className="mt-1 md:mt-2 text-xs md:text-sm text-gray-500 font-medium">
            {isTeacher ? 'Ders verdiğiniz öğrencilerin listesi ve detayları.' : 'Kurumunuza kayıtlı öğrencileri yönetin.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          
          {/* Elegant Filter Buttons */}
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
                className={`flex-1 sm:flex-none px-3 py-1.5 md:px-4 md:py-1.5 text-[11px] md:text-xs font-extrabold tracking-wide rounded-lg transition-all duration-300 ${
                  educationFilter === filter.id 
                    ? 'bg-white text-primary shadow-md ring-1 ring-black/5 scale-100 md:scale-105' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {!isTeacher && (
            <div className="flex justify-end gap-2 mt-3 md:mt-0 w-full md:w-auto">
              <Link 
                href="/students/pool"
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all hover:shadow-sm"
              >
                <Archive className="w-3.5 h-3.5 text-indigo-600" />
                <span>Öğrenci Havuzu</span>
              </Link>
              <button 
                onClick={() => setIsExcelModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white text-primary border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all hover:shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 transition-all hover:shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Öğrenci</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
        {/* Filters Section */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Öğrenci adı ile ara..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
            </div>
            <div className="text-sm font-semibold text-gray-500 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm whitespace-nowrap">
              Toplam: <span className="text-primary font-bold">{filteredAndSortedStudents.length}</span> öğrenci
            </div>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* The education filter was moved to the top header as elegant segmented buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <ArrowUpDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="w-full sm:w-auto bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="NONE">Sıralama (Saat)</option>
                <option value="DESC">En Çok Saat (Azalan)</option>
                <option value="ASC">En Az Saat (Artan)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-0">
          {/* Mobile View: Cards */}
          <div className="md:hidden space-y-4 p-4">
            {filteredAndSortedStudents.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex flex-col items-center justify-center">
                  <User className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium text-lg">Kayıtlı öğrenci bulunmuyor.</p>
                </div>
              </div>
            ) : (
              filteredAndSortedStudents.map((s) => {
                const totalMins = s.totalPackageMinutes || 0;
                const consumedMins = s.consumedPackageMinutes || 0;
                const remainingMins = totalMins - consumedMins;
                const remainingHours = Math.floor(remainingMins / 60);
                const remainingMinsMod = remainingMins % 60;
                
                return (
                  <div key={s.id} onClick={() => router.push(`/students/${s.id}`)} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                    <div className="flex items-start justify-between mb-3 border-b border-gray-50 pb-3">
                      <div className="flex items-center gap-3">
                        <img src="/images/student.png" alt="Öğrenci" className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 shrink-0 object-contain p-1.5" />
                        <div>
                          <h4 className="font-bold text-gray-900">{s.firstName} {s.lastName}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{s.educationLevel || '-'} / Sınıf: {s.grade || '-'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        {s.status === 'ACTIVE' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">Aktif</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-50 text-gray-600 border border-gray-200">Pasif</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Kalan Birebir</p>
                        <p className={`font-black ${remainingMins > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {remainingHours}s {remainingMinsMod > 0 ? `${remainingMinsMod}dk` : ''}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Tüketim</p>
                        <p className="font-black text-gray-700">{consumedMins} dk</p>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                      <div className="text-xs font-medium text-gray-500">
                        <div>{s.phone ? formatPhoneNumber(s.phone) : '-'}</div>
                        {(s.parentName || s.parentPhone) && (
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Veli: {s.parentName || '-'} {s.parentPhone ? `(${formatPhoneNumber(s.parentPhone)})` : ''}
                          </div>
                        )}
                      </div>
                      {!isTeacher && (
                        <div className="flex gap-2 shrink-0">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setAddPackageStudentId(s.id); }}
                            className="p-2 text-indigo-600 bg-indigo-50 rounded-lg"
                          >
                            <PackagePlus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteStudentId(s.id); }}
                            title="Kurum Havuzuna Gönder"
                            className="p-2 text-rose-600 bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        {/* Desktop View: Table */}
        <div className="hidden md:block overflow-x-auto min-w-0 w-full pb-2">
          <table className="min-w-full text-sm align-middle">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Öğrenci Detayı</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Öğrenim / Sınıf</th>
                <th 
                  className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                  onClick={() => toggleSort('total')}
                >
                  <div className="flex items-center gap-1">
                    Birebir Paket Saati
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${tableSort?.column === 'total' ? 'text-primary' : 'text-gray-300 group-hover:text-gray-400'}`} />
                  </div>
                </th>
                <th 
                  className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs cursor-pointer hover:bg-gray-100 transition-colors group select-none"
                  onClick={() => toggleSort('consumed')}
                >
                  <div className="flex items-center gap-1">
                    Tüketim (Dk)
                    <ArrowUpDown className={`w-3 h-3 transition-colors ${tableSort?.column === 'consumed' ? 'text-primary' : 'text-gray-300 group-hover:text-gray-400'}`} />
                  </div>
                </th>
                <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">Durum</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">İletişim</th>
                {!isTeacher && <th className="px-6 py-4 text-right font-semibold text-gray-500 uppercase tracking-wider text-xs">İşlemler</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredAndSortedStudents.length === 0 ? (
                <tr>
                  <td colSpan={isTeacher ? 6 : 7} className="px-6 py-12 text-center text-sm text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <User className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-gray-500 font-medium text-lg">Kayıtlı öğrenci bulunmuyor.</p>
                      <p className="text-gray-400 mt-1">Öğrenci ekle butonuna tıklayarak yeni bir kayıt oluşturabilirsiniz.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedStudents.map((s) => {
                  const totalMins = s.totalPackageMinutes || 0;
                  const consumedMins = s.consumedPackageMinutes || 0;
                  const remainingMins = totalMins - consumedMins;
                  const remainingHours = Math.floor(remainingMins / 60);
                  const remainingMinsMod = remainingMins % 60;
                  
                  return (
                  <tr 
                    key={s.id} 
                    onClick={() => router.push(`/students/${s.id}`)}
                    className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img src="/images/student.png" alt="Öğrenci" className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 shrink-0 object-contain p-1.5" />
                        <div>
                          <div className="text-sm font-semibold text-gray-800">{s.firstName} {s.lastName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-800">{s.educationLevel || '-'}</div>
                      <div className="text-xs text-gray-500 mt-0.5">Sınıf: {s.grade || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold tracking-wide ${
                        remainingMins > 0 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {remainingHours}s {remainingMinsMod > 0 ? `${remainingMinsMod}dk` : ''} Kalan
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                      {consumedMins} dk
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {s.status === 'ACTIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                          Pasif
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="font-semibold text-gray-800">
                        {s.phone ? formatPhoneNumber(s.phone) : '-'}
                      </div>
                      {(s.parentName || s.parentPhone) && (
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <span className="text-[10px] uppercase font-bold text-gray-400">Veli:</span>
                          <span className="text-gray-700">{s.parentName || '-'}</span>
                          {s.parentPhone && <span className="text-gray-400">({formatPhoneNumber(s.parentPhone)})</span>}
                        </div>
                      )}
                    </td>
                    {!isTeacher && (
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setAddPackageStudentId(s.id); }}
                            title="Paket Yükle"
                            className="p-1.5 text-indigo-400 hover:text-indigo-700 hover:bg-indigo-50 rounded-md transition-colors"
                          >
                            <PackagePlus className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setDeleteStudentId(s.id); }}
                            title="Kurum Havuzuna Gönder"
                            className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      {/* Öğrenci Ekle Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Yeni Öğrenci Ekle</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">✕</button>
            </div>
            <div className="p-6">
              <StudentForm onSuccess={() => setIsModalOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Excel Yükle Modal */}
      {isExcelModalOpen && (
        <ExcelImportModal onClose={() => setIsExcelModalOpen(false)} />
      )}

      {/* Silme (Havuza Gönderme) Onay Modal */}
      {deleteStudentId && (() => {
        const studentToArchive = students.find(s => s.id === deleteStudentId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDeleteStudentId(null)} />
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200 p-6 text-center">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Archive className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Kurum Havuzuna Gönder</h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {studentToArchive && <span className="font-bold text-gray-900">{studentToArchive.firstName} {studentToArchive.lastName} </span>}
                isimli öğrenciyi Kurum Havuzuna (Arşiv) göndermek istediğinize emin misiniz? Öğrencinin geçmiş ders, paket ve yoklama kayıtları korunacaktır. Dilediğiniz zaman Öğrenci Havuzu&apos;ndan tekrar aktif edebilirsiniz.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteStudentId(null)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  disabled={isPending}
                >
                  İptal
                </button>
                <button 
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2.5 text-white bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                  disabled={isPending}
                >
                  {isPending ? 'Gönderiliyor...' : 'Evet, Gönder'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Paket Ekle Modal */}
      {addPackageStudentId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setAddPackageStudentId(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-primary" />
                Yeni Paket Yükle
              </h3>
              <button onClick={() => setAddPackageStudentId(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">✕</button>
            </div>
            <form onSubmit={handleAddPackage} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Eklenecek Birebir Ders Saati</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  placeholder="Örn: 10"
                  value={packageHoursInput}
                  onChange={(e) => setPackageHoursInput(e.target.value)}
                  className="w-full rounded-xl border-gray-300 p-3 border focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg" 
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Saatlik Ders Ücreti (TL) - Opsiyonel</label>
                <input 
                  type="number" 
                  min="0"
                  step="0.01"
                  placeholder="Örn: 1500"
                  value={packageHourlyRateInput}
                  onChange={(e) => setPackageHourlyRateInput(e.target.value)}
                  className="w-full rounded-xl border-gray-300 p-3 border focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg" 
                />
                <p className="mt-2 text-xs text-gray-500">Öğrencinin kalan saatine girilen saat eklenecektir. Saatlik ücret zorunlu değildir.</p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setAddPackageStudentId(null)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  disabled={isPending}
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  disabled={isPending || !packageHoursInput}
                  className="flex-1 px-4 py-2.5 text-white bg-primary rounded-xl font-bold hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isPending ? 'Ekleniyor...' : 'Paketi Tanımla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
