'use client';

import { useState } from 'react';
import { Search, User, Briefcase, GraduationCap, Clock, DollarSign, Wallet, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

type SortField = 'name' | 'completedHours' | 'uniqueStudents' | 'totalTeacherFee' | 'institutionEarnings';
type SortDirection = 'asc' | 'desc';

export function TeacherFinanceTable({ teachers, isTeacher = false }: { teachers: any[]; isTeacher?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modelFilter, setModelFilter] = useState('ALL');
  const [sortField, setSortField] = useState<SortField>('completedHours');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'name' ? 'asc' : 'desc');
    }
  };

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = `${t.firstName} ${t.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = modelFilter === 'ALL' || t.compensationModel === modelFilter;
    return matchesSearch && matchesFilter;
  });

  const sortedTeachers = [...filteredTeachers].sort((a, b) => {
    if (sortField === 'name') {
      const aName = `${a.firstName || ''} ${a.lastName || ''}`.toLocaleLowerCase('tr-TR');
      const bName = `${b.firstName || ''} ${b.lastName || ''}`.toLocaleLowerCase('tr-TR');
      return sortDirection === 'asc' ? aName.localeCompare(bName, 'tr') : bName.localeCompare(aName, 'tr');
    }

    const aVal = Number(a[sortField]) || 0;
    const bVal = Number(b[sortField]) || 0;
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:h-full lg:overflow-hidden h-auto">
      <div className="flex-none p-5 border-b border-gray-100 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {isTeacher ? 'Ders ve Hakediş Tablom' : 'Öğretmen Finansal Performans Tablosu'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {isTeacher 
              ? 'Verdiğiniz dersler ve hakediş dökümünüz.' 
              : 'Öğretmenlerin hakedişlerini ve kuruma sağladıkları kazançları takip edin.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {/* Anlaşma Modeli Filtresi - Sadece Kurum Yöneticisi */}
          {!isTeacher && (
            <div className="flex items-center bg-gray-100/80 p-1 rounded-xl shadow-inner border border-gray-200/50 backdrop-blur-sm overflow-x-auto">
              {[
                { id: 'ALL', label: 'TÜMÜ' },
                { id: 'EXTERNAL_HOURLY', label: 'KURUM DIŞI' },
                { id: 'INTERNAL_HOURLY', label: 'İÇİ SAATLİK' },
                { id: 'INTERNAL_FIXED', label: 'İÇİ SABİT' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setModelFilter(filter.id)}
                  className={`px-3 py-1.5 text-[10px] sm:text-xs font-extrabold tracking-wide rounded-lg transition-all duration-300 whitespace-nowrap ${
                    modelFilter === filter.id 
                      ? 'bg-white text-primary shadow-md ring-1 ring-black/5 scale-105' 
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          )}

          {/* Arama Kutusu */}
          {!isTeacher && (
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Öğretmen ara..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 w-36 sm:w-56"
              />
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 lg:overflow-y-auto custom-scrollbar min-w-0">
        <div className="hidden lg:block overflow-x-auto min-w-0 w-full pb-2">
          <table className="min-w-full text-sm align-middle relative">
            <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-200 bg-gray-50/95 backdrop-blur select-none">
              <th 
                onClick={() => handleSort('name')}
                title="Öğretmen adına göre A-Z / Z-A sıralamak için tıklayın"
                className={`px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs cursor-pointer hover:bg-gray-100 transition-colors group ${
                  sortField === 'name' ? 'text-primary bg-primary/5 font-bold' : 'text-gray-500'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>Öğretmen Adı</span>
                  {sortField === 'name' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
              <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-xs">
                Anlaşma Modeli
              </th>
              <th 
                onClick={() => handleSort('completedHours')}
                title="Tamamlanan ders saatine göre artan/azalan sıralamak için tıklayın"
                className={`px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs cursor-pointer hover:bg-gray-100 transition-colors group ${
                  sortField === 'completedHours' ? 'text-primary bg-primary/5 font-bold' : 'text-gray-500'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>Tamamlanan Ders Saati</span>
                  {sortField === 'completedHours' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('uniqueStudents')}
                title="Eğitim verdiği öğrenci sayısına göre artan/azalan sıralamak için tıklayın"
                className={`px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs cursor-pointer hover:bg-gray-100 transition-colors group ${
                  sortField === 'uniqueStudents' ? 'text-primary bg-primary/5 font-bold' : 'text-gray-500'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>Eğitim Verdiği Öğrenci</span>
                  {sortField === 'uniqueStudents' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
              <th 
                onClick={() => handleSort('totalTeacherFee')}
                title="Öğretmen hakedişine göre artan/azalan sıralamak için tıklayın"
                className={`px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs cursor-pointer hover:bg-gray-100 transition-colors group ${
                  sortField === 'totalTeacherFee' ? 'text-primary bg-primary/5 font-bold' : 'text-gray-500'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>Öğretmen Hakedişi</span>
                  {sortField === 'totalTeacherFee' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
              {!isTeacher && (
                <th 
                  onClick={() => handleSort('institutionEarnings')}
                  title="Kurum hakedişine göre artan/azalan sıralamak için tıklayın"
                  className={`px-6 py-4 text-left font-semibold uppercase tracking-wider text-xs cursor-pointer hover:bg-gray-100 transition-colors group ${
                    sortField === 'institutionEarnings' ? 'text-primary bg-primary/5 font-bold' : 'text-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>Kurum Hakedişi</span>
                    {sortField === 'institutionEarnings' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary" /> : <ArrowDown className="w-3.5 h-3.5 text-primary" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sortedTeachers.length === 0 ? (
              <tr>
                <td colSpan={isTeacher ? 5 : 6} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-400">
                    <User className="w-10 h-10 mb-3 text-gray-300" />
                    <p className="text-sm font-medium text-gray-500">Öğretmen bulunamadı.</p>
                  </div>
                </td>
              </tr>
            ) : (
              sortedTeachers.map((t) => {
                const isFixedSalary = t.compensationModel === 'INTERNAL_FIXED';
                const isExternal = t.compensationModel === 'EXTERNAL_HOURLY';
                
                const isFemale = t.gender === 'FEMALE';
                const isMale = t.gender === 'MALE';
                const badgeColorClass = isFemale
                  ? 'bg-pink-100 text-pink-700'
                  : isMale
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-700';

                return (
                  <tr key={t.id} className={`transition-colors group ${isExternal ? 'bg-orange-50/40 hover:bg-orange-100/50' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-white ${isExternal ? 'bg-orange-200 text-orange-800' : badgeColorClass}`}>
                          {t.firstName?.charAt(0)}{t.lastName?.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <p className={`font-bold transition-colors ${isExternal ? 'text-orange-950 group-hover:text-orange-700' : 'text-gray-900 group-hover:text-primary'}`}>
                              {t.firstName} {t.lastName}
                            </p>
                            {isExternal && (
                              <span className="text-[9px] font-bold bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded uppercase">Kurum Dışı</span>
                            )}
                          </div>
                          <span className={`text-[11px] font-medium mt-0.5 ${isExternal ? 'text-orange-700/70' : 'text-gray-500'}`}>
                            {t.subjectName || 'Branş Belirtilmemiş'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
                        <Briefcase className="w-3.5 h-3.5" />
                        {isFixedSalary ? 'Sabit Maaş' : `Saatlik (${t.compensationRate} ₺)`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <Clock className="w-4 h-4 text-gray-400" />
                        {t.completedHours} Saat
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-gray-600 font-medium">
                        <GraduationCap className="w-4 h-4 text-gray-400" />
                        {t.uniqueStudents} Öğrenci
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 font-bold text-indigo-600">
                        <Wallet className="w-4 h-4" />
                        {t.totalTeacherFee.toLocaleString('tr-TR')} ₺
                      </div>
                    </td>
                    {!isTeacher && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 font-bold text-emerald-600">
                          <DollarSign className="w-4 h-4" />
                          {t.institutionEarnings.toLocaleString('tr-TR')} ₺
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
        
        {/* Mobile Card View */}
        <div className="lg:hidden flex flex-col">
          {/* Mobil Sıralama Kontrolleri */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50/90 border-b border-gray-100 text-xs">
            <span className="font-semibold text-gray-500">Sıralama:</span>
            <div className="flex items-center gap-2">
              <select
                value={sortField}
                onChange={(e) => {
                  const newField = e.target.value as SortField;
                  setSortField(newField);
                  if (newField === 'name' && sortField !== 'name') {
                    setSortDirection('asc');
                  }
                }}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 outline-none shadow-xs"
              >
                <option value="completedHours">Ders Saati</option>
                <option value="totalTeacherFee">Öğretmen Hakedişi</option>
                {!isTeacher && <option value="institutionEarnings">Kurum Hakedişi</option>}
                <option value="uniqueStudents">Öğrenci Sayısı</option>
                <option value="name">Öğretmen Adı</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                className="flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 shadow-xs"
              >
                {sortDirection === 'asc' ? (
                  <>
                    <ArrowUp className="w-3 h-3 text-primary" />
                    <span>Artan</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-3 h-3 text-primary" />
                    <span>Azalan</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {sortedTeachers.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
              <User className="w-10 h-10 mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Öğretmen bulunamadı.</p>
            </div>
          ) : (
            sortedTeachers.map((t) => {
              const isFixedSalary = t.compensationModel === 'INTERNAL_FIXED';
              const isExternal = t.compensationModel === 'EXTERNAL_HOURLY';
              
              const isFemale = t.gender === 'FEMALE';
              const isMale = t.gender === 'MALE';
              const badgeColorClass = isFemale
                ? 'bg-pink-100 text-pink-700'
                : isMale
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-700';

              return (
                <div key={t.id} className={`p-4 border-b border-gray-100 last:border-0 transition-colors ${isExternal ? 'bg-orange-50/40' : 'hover:bg-gray-50/50'}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-white ${isExternal ? 'bg-orange-200 text-orange-800' : badgeColorClass}`}>
                      {t.firstName?.charAt(0)}{t.lastName?.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className={`font-bold ${isExternal ? 'text-orange-950' : 'text-gray-900'}`}>
                          {t.firstName} {t.lastName}
                        </h4>
                        {isExternal && (
                          <span className="text-[9px] font-bold bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded uppercase">Kurum Dışı</span>
                        )}
                      </div>
                      <span className={`text-[11px] font-medium mt-0.5 block ${isExternal ? 'text-orange-700/70' : 'text-gray-500'}`}>
                        {t.subjectName || 'Branş Belirtilmemiş'} • {isFixedSalary ? 'Sabit Maaş' : `Saatlik (${t.compensationRate} ₺)`}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col">
                      <span className="text-[10px] text-gray-400 font-semibold mb-1 uppercase tracking-wider">Verilen Eğitim</span>
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {t.completedHours} Saat
                      </div>
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-700 mt-1">
                        <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                        {t.uniqueStudents} Öğrenci
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-gray-400 font-semibold mb-0.5 uppercase tracking-wider block">Öğr. Hakediş</span>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600">
                          <Wallet className="w-3.5 h-3.5" />
                          {t.totalTeacherFee.toLocaleString('tr-TR')} ₺
                        </div>
                      </div>
                      {!isTeacher && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <span className="text-[10px] text-gray-400 font-semibold mb-0.5 uppercase tracking-wider block">Kurum Hakediş</span>
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                            <DollarSign className="w-3.5 h-3.5" />
                            {t.institutionEarnings.toLocaleString('tr-TR')} ₺
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
