'use client';

import { useState, useMemo, useEffect, useActionState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TeacherForm } from './TeacherForm';
import { Plus, Search, Filter, BookOpen, User, ChevronDown, ChevronUp, Trash2, Edit, MoreHorizontal, Eye, Lock, Mail, CreditCard, Layers, Phone, Archive } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils';
import { deleteTeacherAction, editTeacherAction } from './actions';

export function TeachersClient({ teachers, subjects }: { teachers: any[], subjects: any[] }) {
  const router = useRouter();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  useEffect(() => {
    const savedSearch = localStorage.getItem('birimoapp_teachers_search');
    const savedFilter = localStorage.getItem('birimoapp_teachers_filter');
    const savedCollapsed = localStorage.getItem('birimoapp_teachers_collapsed');
    
    if (savedSearch) setSearchQuery(savedSearch);
    if (savedFilter) setSubjectFilter(savedFilter);
    if (savedCollapsed) {
      try {
        setCollapsedGroups(JSON.parse(savedCollapsed));
      } catch (e) {
        console.error('Failed to parse collapsed groups');
      }
    }
    
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('birimoapp_teachers_search', searchQuery);
    }
  }, [searchQuery, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('birimoapp_teachers_filter', subjectFilter);
    }
  }, [subjectFilter, isMounted]);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('birimoapp_teachers_collapsed', JSON.stringify(collapsedGroups));
    }
  }, [collapsedGroups, isMounted]);

  const filteredTeachers = useMemo(() => {
    let result = [...teachers];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q)
      );
    }

    if (subjectFilter !== 'ALL') {
      result = result.filter(t => t.subjectId === subjectFilter);
    }

    return result;
  }, [teachers, searchQuery, subjectFilter]);

  const { grouped, unassigned } = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const unassigned: any[] = [];

    filteredTeachers.forEach(t => {
      if (t.subjectName) {
        if (!grouped[t.subjectName]) {
          grouped[t.subjectName] = [];
        }
        grouped[t.subjectName].push(t);
      } else {
        unassigned.push(t);
      }
    });

    return { grouped, unassigned };
  }, [filteredTeachers]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight">Öğretmen Kadrosu</h1>
          <p className="mt-2 text-gray-500 font-medium">
            Kurumunuzdaki eğitmenleri yönetin ve atamalarını takip edin.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            href="/teachers/pool"
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors border border-gray-200 shadow-sm"
          >
            <Archive className="w-5 h-5" />
            Eğitimci Havuzu
          </Link>
          <TeacherForm subjects={subjects} />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all sm:text-sm"
            placeholder="İsim, soyisim veya kullanıcı adı ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              className="block w-full pl-10 pr-10 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all sm:text-sm appearance-none cursor-pointer font-medium"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="ALL">Tüm Branşlar</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grouped Tables */}
      <div className="space-y-10">
        {filteredTeachers.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <User className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium text-base">Arama kriterlerine uygun öğretmen bulunamadı.</p>
          </div>
        ) : (
          <>
            {Object.entries(grouped).map(([subjectName, tList]) => (
              <div key={subjectName} className="space-y-4">
                <div 
                  className="flex items-center justify-between border-b border-gray-200 pb-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleGroup(subjectName)}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl shadow-sm" style={{ backgroundColor: `${tList[0].subjectColor}20`, color: tList[0].subjectColor || '#6366f1' }}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <h2 className="text-lg font-extrabold uppercase tracking-wide" style={{ color: tList[0].subjectColor || '#374151' }}>
                      {subjectName}
                    </h2>
                    <span className="ml-2 bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full text-xs font-semibold">
                      {tList.length}
                    </span>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-2 rounded-lg transition-colors">
                    {collapsedGroups[subjectName] ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </button>
                </div>
                
                {!collapsedGroups[subjectName] && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-0">
                    <div className="md:hidden space-y-4 p-4">
                      {tList.map(teacher => <TeacherCard key={"card-"+teacher.id} teacher={teacher} subjects={subjects} router={router} />)}
                    </div>
                    <div className="hidden md:block overflow-x-auto min-w-0 w-full pb-2">
                      <table className="w-full text-sm align-middle">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100">
                            <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Öğretmen Bilgisi</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">İletişim</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Branş</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Tamamlanan Ders</th>
                            <th className="px-6 py-4 text-right font-semibold text-gray-500 uppercase tracking-wider text-[11px]">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                          {tList.map(teacher => <TeacherRow key={teacher.id} teacher={teacher} subjects={subjects} router={router} />)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            ))}

            {unassigned.length > 0 && (
              <div className="space-y-4 opacity-75">
                <div 
                  className="flex items-center justify-between border-b border-gray-200 pb-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => toggleGroup('unassigned')}
                >
                  <h2 className="text-lg font-bold text-gray-500">Branşı Belirtilmemiş Öğretmenler</h2>
                  <button className="text-gray-400 hover:text-gray-600 bg-gray-50 hover:bg-gray-100 p-1.5 rounded-lg transition-colors">
                    {collapsedGroups['unassigned'] ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                  </button>
                </div>
                
                {!collapsedGroups['unassigned'] && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-0">
                    <div className="md:hidden space-y-4 p-4">
                      {unassigned.map(teacher => <TeacherCard key={"card-"+teacher.id} teacher={teacher} subjects={subjects} router={router} />)}
                    </div>
                    <div className="hidden md:block overflow-x-auto min-w-0 w-full pb-2">
                      <table className="w-full text-sm align-middle">
                        <thead>
                          <tr className="bg-gray-50/80 border-b border-gray-100">
                            <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Öğretmen Bilgisi</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">İletişim</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Branş</th>
                            <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Tamamlanan Ders</th>
                            <th className="px-6 py-4 text-right font-semibold text-gray-500 uppercase tracking-wider text-[11px]">İşlem</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                          {unassigned.map(teacher => <TeacherRow key={teacher.id} teacher={teacher} subjects={subjects} router={router} />)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

            )}
          </>
        )}
      </div>
    </div>
  );
}

function TeacherRow({ teacher, subjects, router }: { teacher: any, subjects: any[], router: any }) {
  const [isPending, startTransition] = useTransition();
  const [isMounted, setIsMounted] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editState, editFormAction, isEditPending] = useActionState(editTeacherAction, null);
  const [compModel, setCompModel] = useState(teacher.compensationModel || '');
  const [phoneInput, setPhoneInput] = useState(formatPhoneNumber(teacher.phone) || '');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const res = await deleteTeacherAction(teacher.userId);
      if (res.error) {
        alert(res.error);
        setIsDeleteModalOpen(false);
      }
    });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditModalOpen(true);
  };

  const isFemale = teacher.gender === 'FEMALE';
  const isMale = teacher.gender === 'MALE';
  const badgeColorClass = isFemale
    ? 'bg-pink-100 text-pink-700'
    : isMale
      ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-700';

  useEffect(() => {
    if (editState?.success) {
      setIsEditModalOpen(false);
    }
  }, [editState]);
  const isExternal = teacher.compensationModel === 'EXTERNAL_HOURLY';

  return (
    <>
      <tr 
        onClick={() => router.push(`/teachers/${teacher.id}`)}
        className={`transition-colors cursor-pointer group ${isExternal ? 'bg-orange-50/40 hover:bg-orange-100/50' : 'hover:bg-gray-50/50'} ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-white ${isExternal ? 'bg-orange-200 text-orange-800' : badgeColorClass}`}>
              {teacher.firstName?.[0]}{teacher.lastName?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className={`font-bold transition-colors ${isExternal ? 'text-orange-950 group-hover:text-orange-700' : 'text-gray-900 group-hover:text-primary'}`}>
                  {teacher.firstName} {teacher.lastName}
                </p>
                {isExternal && (
                  <span className="text-[9px] font-bold bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded uppercase">Kurum Dışı</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex flex-col">
            <span className="text-gray-900 font-medium">{teacher.phone ? formatPhoneNumber(teacher.phone) : '-'}</span>
            <span className="text-gray-500 text-xs">@{teacher.email}</span>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700">
            {teacher.subjectName || 'Belirtilmemiş'}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className="font-bold text-gray-900">{teacher.completedLessonsCount} Saat</span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex justify-end gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); router.push(`/teachers/${teacher.id}`); }}
              className="text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 p-2 rounded-lg transition-colors"
              title="İncele"
            >
              <Eye className="w-4 h-4" />
            </button>
            <button 
              onClick={handleEdit}
              className="text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 p-2 rounded-lg transition-colors"
              title="Düzenle"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button 
              onClick={handleDeleteClick}
              disabled={isPending}
              className="text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 rounded-lg transition-colors"
              title="Sil"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>

      {/* Delete Modal */}
      {isMounted && isDeleteModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200 p-6 text-center">
            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Kurum Havuzuna Gönder</h3>
            <p className="text-sm text-gray-500 mb-6">
              <span className="font-bold">{teacher.firstName} {teacher.lastName}</span> adlı öğretmeni Kurum Havuzuna (Arşiv) göndermek istediğinize emin misiniz? Öğretmenin geçmiş yoklama ve finansal kayıtları korunacaktır.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                disabled={isPending}
              >
                İptal
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 text-white bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Gönderiliyor...' : 'Evet, Gönder'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Modal */}
      {isMounted && isEditModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsEditModalOpen(false)}
          />
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">Öğretmen Bilgilerini Düzenle</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              <form action={editFormAction} className="space-y-6">
                <input type="hidden" name="teacherId" value={teacher.id} />
                <input type="hidden" name="userId" value={teacher.userId} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Ad & Soyad */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ad</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <User className="w-5 h-5" />
                      </div>
                      <input type="text" name="firstName" defaultValue={teacher.firstName} required className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Soyad</label>
                    <input type="text" name="lastName" defaultValue={teacher.lastName} required className="w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" />
                  </div>

                  {/* Cinsiyet & Branş */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cinsiyet</label>
                    <select name="gender" defaultValue={teacher.gender} required className="w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm">
                      <option value="">Seçiniz</option>
                      <option value="MALE">Erkek</option>
                      <option value="FEMALE">Kadın</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Branş</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Layers className="w-5 h-5" />
                      </div>
                      <select name="subjectId" defaultValue={teacher.subjectId} required className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm">
                        <option value="">Seçiniz</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* E-posta & Şifre */}
                  <div className="md:col-span-2">
                    <div className="w-full h-px bg-gray-100 my-2" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Kullanıcı Adı</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input type="text" name="username" defaultValue={teacher.email} required className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Şifre (Değiştirmek için doldurun)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input type="text" name="password" className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" placeholder="Yeni şifre (isteğe bağlı)" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefon Numarası</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Phone className="w-5 h-5" />
                      </div>
                      <input 
                        type="tel" 
                        name="phone" 
                        value={phoneInput} 
                        onChange={(e) => setPhoneInput(formatPhoneNumber(e.target.value))}
                        className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
                        placeholder="0 545 999 00 00"
                      />
                    </div>
                  </div>

                  {/* Maaş Tipi & Ücret */}
                  <div className="md:col-span-2">
                    <div className="w-full h-px bg-gray-100 my-2" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Anlaşma Modeli</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <select 
                        name="compensationModel" 
                        required 
                        value={compModel}
                        onChange={(e) => setCompModel(e.target.value)}
                        className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                      >
                        <option value="">Seçiniz</option>
                        <option value="INTERNAL_HOURLY">Kurum İçi Saatlik Ücret</option>
                        <option value="INTERNAL_FIXED">Kurum İçi Sabit Maaş</option>
                        <option value="EXTERNAL_HOURLY">Kurum Dışı Saatlik Ücret</option>
                      </select>
                    </div>
                  </div>
                  
                  {compModel !== 'INTERNAL_FIXED' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ücret Tutarı (₺)</label>
                      <input type="number" name="compensationRate" defaultValue={teacher.compensationRate} required className="w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" />
                    </div>
                  )}
                </div>

                {editState?.error && <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-2"><span className="font-bold">Hata:</span> {editState.error}</div>}
                {editState?.success && <div className="text-sm text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-2"><span className="font-bold">Başarılı:</span> {editState.success}</div>}

                <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
                  <button 
                    type="button" 
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-6 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
                  >
                    İptal
                  </button>
                  <button 
                    type="submit" 
                    disabled={isEditPending} 
                    className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isEditPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

function TeacherCard({ teacher, subjects, router }: { teacher: any, subjects: any[], router: any }) {
  const [isPending, startTransition] = require('react').useTransition();
  const [isMounted, setIsMounted] = require('react').useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = require('react').useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = require('react').useState(false);
  const [editState, editFormAction, isEditPending] = require('react').useActionState(require('./actions').editTeacherAction, null);
  const [compModel, setCompModel] = require('react').useState(teacher.compensationModel || '');
  const [phoneInput, setPhoneInput] = require('react').useState(require('@/lib/utils').formatPhoneNumber(teacher.phone) || '');

  require('react').useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    startTransition(async () => {
      const res = await require('./actions').deleteTeacherAction(teacher.userId);
      if (res.error) {
        alert(res.error);
        setIsDeleteModalOpen(false);
      }
    });
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditModalOpen(true);
  };

  const isFemale = teacher.gender === 'FEMALE';
  const isMale = teacher.gender === 'MALE';
  const badgeColorClass = isFemale
    ? 'bg-pink-100 text-pink-700'
    : isMale
      ? 'bg-blue-100 text-blue-700'
      : 'bg-gray-100 text-gray-700';

  require('react').useEffect(() => {
    if (editState?.success) {
      setIsEditModalOpen(false);
    }
  }, [editState]);
  const isExternal = teacher.compensationModel === 'EXTERNAL_HOURLY';
  
  const Eye = require('lucide-react').Eye;
  const Edit = require('lucide-react').Edit;
  const Trash2 = require('lucide-react').Trash2;

  return (
    <>
      <div 
        onClick={() => router.push(`/teachers/${teacher.id}`)}
        className={`bg-white border ${isExternal ? 'border-orange-200 bg-orange-50/20' : 'border-gray-100'} rounded-2xl p-4 shadow-sm relative overflow-hidden transition-colors cursor-pointer active:scale-[0.99] ${isPending ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <div className="flex items-start justify-between mb-3 border-b border-gray-50 pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-white ${isExternal ? 'bg-orange-200 text-orange-800' : badgeColorClass}`}>
              {teacher.firstName?.[0]}{teacher.lastName?.[0]}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className={`font-bold ${isExternal ? 'text-orange-950' : 'text-gray-900'}`}>
                  {teacher.firstName} {teacher.lastName}
                </h4>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {teacher.phone ? require('@/lib/utils').formatPhoneNumber(teacher.phone) : '-'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            {isExternal && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-200 text-orange-800 uppercase">
                Kurum Dışı
              </span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
              {teacher.subjectName || 'Belirtilmemiş'}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Tamamlanan Ders</p>
            <p className="font-black text-gray-900">{teacher.completedLessonsCount} Saat</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">E-posta</p>
            <p className="font-semibold text-gray-600 text-xs truncate max-w-[120px]" title={teacher.email}>@{teacher.email.split('@')[0]}</p>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-3 border-t border-gray-50">
          <button 
            onClick={(e) => { e.stopPropagation(); router.push(`/teachers/${teacher.id}`); }}
            className="p-2 text-primary bg-primary/5 hover:bg-primary/10 rounded-lg transition-colors"
            title="İncele"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button 
            onClick={handleEdit}
            className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            title="Düzenle"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={handleDeleteClick}
            className="p-2 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
            title="Sil"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-200">
            <div className="sticky top-0 z-10 px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-md">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-500" />
                Öğretmen Düzenle
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">✕</button>
            </div>
            
            <div className="p-6">
              {editState?.error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <span className="text-red-600 font-bold">!</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-red-800">Hata</h4>
                    <p className="text-sm text-red-600 mt-0.5">{editState.error}</p>
                  </div>
                </div>
              )}
              
              <form action={editFormAction} className="space-y-6">
                <input type="hidden" name="teacherId" value={teacher.id} />
                <input type="hidden" name="userId" value={teacher.userId} />
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Ad</label>
                    <input type="text" name="firstName" defaultValue={teacher.firstName} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Soyad</label>
                    <input type="text" name="lastName" defaultValue={teacher.lastName} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">E-posta</label>
                    <input type="email" name="email" defaultValue={teacher.email} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Telefon</label>
                    <input type="tel" name="phone" value={phoneInput} onChange={(e) => setPhoneInput(require('@/lib/utils').formatPhoneNumber(e.target.value))} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Cinsiyet</label>
                    <select name="gender" defaultValue={teacher.gender || "MALE"} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                      <option value="MALE">Erkek</option>
                      <option value="FEMALE">Kadın</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Branş</label>
                    <select name="subjectId" defaultValue={teacher.subjectId || ""} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                      <option value="">Branş Seçiniz</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Hakediş (Maaş) Modeli</label>
                  <select name="compensationModel" value={compModel} onChange={(e) => setCompModel(e.target.value)} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all">
                    <option value="MONTHLY_SALARY">Aylık Sabit Maaş</option>
                    <option value="HOURLY_RATE">Saatlik Ücret (Kurum İçi)</option>
                    <option value="EXTERNAL_HOURLY">Saatlik Ücret (Kurum Dışı - Freelance)</option>
                    <option value="PERCENTAGE">Cirodan Yüzde (%)</option>
                  </select>
                </div>

                {compModel !== 'MONTHLY_SALARY' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {compModel === 'PERCENTAGE' ? 'Yüzde Oranı (%)' : 'Saatlik Ücret (TL)'}
                    </label>
                    <input type="number" step="0.01" min="0" name="compensationAmount" defaultValue={teacher.compensationAmount || 0} required className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" />
                  </div>
                )}
                
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsEditModalOpen(false)} disabled={isEditPending} className="flex-1 px-4 py-3 text-gray-700 bg-white border border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                    İptal
                  </button>
                  <button type="submit" disabled={isEditPending} className="flex-1 px-4 py-3 text-white bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">
                    {isEditPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
              <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Öğretmeni Sil
              </h3>
              <button onClick={() => setIsDeleteModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">✕</button>
            </div>
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 mb-2">Emin misiniz?</h4>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">
                <span className="font-bold text-gray-900">{teacher.firstName} {teacher.lastName}</span> isimli öğretmeni silmek üzeresiniz. Bu işlem geri alınamaz ve öğretmenin tüm ders geçmişi, finansal verileri silinir.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setIsDeleteModalOpen(false)} disabled={isPending} className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition-colors">
                  İptal
                </button>
                <button onClick={confirmDelete} disabled={isPending} className="flex-1 px-4 py-2.5 text-white bg-red-600 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex justify-center items-center">
                  {isPending ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Evet, Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
