'use client';

import { useState, useTransition, useActionState, useMemo } from 'react';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Upload, 
  Image as ImageIcon, 
  Globe, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  X, 
  Check, 
  AlertCircle,
  FileText,
  Users,
  LogIn,
  GraduationCap,
  LayoutGrid,
  Table as TableIcon,
  ShieldCheck,
  Sparkles,
  BookOpen,
  UserCheck,
  Calendar,
  Copy,
  Eye,
  Activity,
  TrendingUp,
  CheckCircle2,
  MessageCircle
} from 'lucide-react';
import { createOrganizationAction, updateOrganizationAction, deleteOrganizationAction } from './actions';
import { Button } from '@/components/ui/button';
import { ImpersonateModal, ImpersonateTargetOrg } from '@/components/admin/ImpersonateModal';
import { ModalPortal } from '@/components/ui/ModalPortal';

export interface StaffMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string;
  phone: string | null;
  role: string;
}

export interface AnnualStats {
  year: number;
  totalLessonsThisYear: number;
  completedLessonsThisYear: number;
  plannedLessonsThisYear: number;
  cancelledLessonsThisYear: number;
  allTimeCompletedLessons: number;
  activeStudents: number;
  archivedStudents: number;
  activeTeachers: number;
}

export interface OrgItem {
  id: string;
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  scheduleStartTime: string;
  scheduleEndTime: string;
  lessonDurationMinutes: string;
  breakDurationMinutes: string;
  createdAt: Date | string;
  studentCount?: number;
  teacherCount?: number;
  lessonCount?: number;
  adminName?: string;
  adminFirstName?: string | null;
  adminLastName?: string | null;
  adminEmail?: string | null;
  adminPhone?: string | null;
  staffMembers?: StaffMember[];
  annualStats?: AnnualStats;
}

interface OrganizationsClientProps {
  organizations: OrgItem[];
}

export function OrganizationsClient({ organizations }: OrganizationsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrgItem | null>(null);
  const [isPending, startTransition] = useTransition();
  const [impersonateOrg, setImpersonateOrg] = useState<ImpersonateTargetOrg | null>(null);
  const [selectedDetailOrg, setSelectedDetailOrg] = useState<OrgItem | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Form states
  const [addState, addAction, isAddPending] = useActionState(createOrganizationAction, null);
  const [editState, editAction, isEditPending] = useActionState(updateOrganizationAction, null);

  // Image previews
  const [addLogoPreview, setAddLogoPreview] = useState<string | null>(null);
  const [addFaviconPreview, setAddFaviconPreview] = useState<string | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);
  const [editFaviconPreview, setEditFaviconPreview] = useState<string | null>(null);

  // Compute platform-wide totals
  const totals = useMemo(() => {
    let students = 0;
    let teachers = 0;
    let lessons = 0;
    for (const org of organizations) {
      students += org.studentCount || 0;
      teachers += org.teacherCount || 0;
      lessons += org.lessonCount || 0;
    }
    return {
      orgCount: organizations.length,
      students,
      teachers,
      lessons,
    };
  }, [organizations]);

  const filteredOrgs = useMemo(() => {
    return organizations.filter(org => {
      const q = searchTerm.toLowerCase();
      return (
        org.name.toLowerCase().includes(q) ||
        (org.email && org.email.toLowerCase().includes(q)) ||
        (org.phone && org.phone.toLowerCase().includes(q)) ||
        (org.adminName && org.adminName.toLowerCase().includes(q)) ||
        (org.address && org.address.toLowerCase().includes(q))
      );
    });
  }, [organizations, searchTerm]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, setPreview: (val: string | null) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Görsel boyutu 2MB dan küçük olmalıdır.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const openEditModal = (org: OrgItem) => {
    setEditingOrg(org);
    setEditLogoPreview(org.logoUrl);
    setEditFaviconPreview(org.faviconUrl);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`"${name}" kurumunu ve bağlı tüm verilerini silmek istediğinize emin misiniz?`)) {
      startTransition(async () => {
        await deleteOrganizationAction(id);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 p-6 rounded-2xl border border-white/80 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#004aad] text-[11px] font-bold uppercase tracking-wide border border-blue-100">
              Platform Yönetimi
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5 mt-1.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#004aad] to-[#003882] text-white shadow-sm">
              <Building2 className="w-6 h-6" />
            </div>
            Kurum Yönetimi
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed">
            Platformdaki tüm eğitim kurumlarını, marka varlıklarını (Logo, Favicon), kurum yöneticilerini, öğrenci ve öğretmen sayılarını detaylı olarak yönetin.
          </p>
        </div>

        <Button
          onClick={() => {
            setIsAddModalOpen(true);
            setAddLogoPreview(null);
            setAddFaviconPreview(null);
          }}
          className="bg-gradient-to-r from-[#004aad] to-[#003882] hover:from-[#003882] hover:to-[#002b66] text-white shadow-md hover:shadow-lg transition-all rounded-xl px-5 py-2.5 flex items-center gap-2 text-sm font-bold active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Yeni Kurum Ekle
        </Button>
      </div>

      {/* 2. Platform KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Toplam Kurum */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Kayıtlı Kurum</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#004aad]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{totals.orgCount}</span>
            <span className="text-xs text-gray-400">aktif kurum</span>
          </div>
        </div>

        {/* Metric 2: Toplam Öğrenci */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Toplam Öğrenci</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{totals.students}</span>
            <span className="text-xs text-gray-400">kayıtlı öğrenci</span>
          </div>
        </div>

        {/* Metric 3: Toplam Öğretmen */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Toplam Öğretmen</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">{totals.teachers}</span>
            <span className="text-xs text-gray-400">görevli eğitmen</span>
          </div>
        </div>

        {/* Metric 4: Tamamlanan Ders */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Tamamlanan Ders</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-700">{totals.lessons}</span>
            <span className="text-xs text-gray-400">ders işlendi</span>
          </div>
        </div>
      </div>

      {/* 3. Search & View Mode Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Kurum adı, yönetici, telefon veya adres ile ara..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad] focus:bg-white transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-500 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200 whitespace-nowrap">
            {filteredOrgs.length} Kurum Listeleniyor
          </span>
        </div>
      </div>

      {/* 4. KURUM TABLOSU (TABLE VIEW) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto min-w-0 w-full pb-2">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kurum &amp; Logo</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kurum Sahibi / Yetkili</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Öğrenci &amp; Öğretmen</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ders &amp; Saat Ayarları</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">İletişim</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400">
                    <Building2 className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    Kayıtlı kurum bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr 
                    key={org.id} 
                    onClick={() => setSelectedDetailOrg(org)}
                    className="hover:bg-blue-50/40 transition-all cursor-pointer group"
                  >
                    {/* Kurum & Logo */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-1 shadow-2xs group-hover:border-[#004aad]/40 transition-colors">
                          {org.logoUrl ? (
                            <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="w-6 h-6 text-[#004aad]" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm group-hover:text-[#004aad] transition-colors">{org.name}</span>
                            {org.faviconUrl && (
                              <img src={org.faviconUrl} alt="favicon" className="w-3.5 h-3.5 object-contain" title="Özel Favicon" />
                            )}
                          </div>
                          <span className="text-[11px] text-gray-400 font-mono block">
                            {org.taxOffice ? `${org.taxOffice} V.D. - ${org.taxNumber || ''}` : 'Kayıtlı vergi no yok'}
                          </span>
                          <span className="text-[10px] text-blue-600 font-medium block mt-0.5">
                            Kayıt: {new Date(org.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Kurum Sahibi / Yetkili */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-100 to-indigo-100 text-[#004aad] font-black text-xs flex items-center justify-center flex-shrink-0 border border-blue-200 shadow-2xs">
                          {org.adminName?.[0] || 'Y'}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-black text-gray-900 block truncate group-hover:text-[#004aad] transition-colors">
                            {org.adminName || 'Yönetici Atanmadı'}
                          </span>
                          {org.adminPhone && (
                            <a 
                              href={`tel:${org.adminPhone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                              title="Kurum Sahibini Ara"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{org.adminPhone}</span>
                            </a>
                          )}
                          {org.adminEmail && (
                            <span className="text-[10px] text-gray-400 font-mono block truncate">
                              {org.adminEmail.startsWith('@') ? org.adminEmail : (org.adminEmail.includes('@') ? org.adminEmail : `@${org.adminEmail}`)}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                      {/* Öğrenci & Öğretmen */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            <Users className="w-3 h-3 text-emerald-600" />
                            {org.studentCount || 0} Öğrenci
                          </span>
                          <span className="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                            <GraduationCap className="w-3 h-3 text-purple-600" />
                            {org.teacherCount || 0} Öğretmen
                          </span>
                        </div>
                      </td>

                      {/* Ders & Saat */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        <div className="flex items-center gap-1.5 font-bold text-gray-900">
                          <Clock className="w-3.5 h-3.5 text-[#004aad]" />
                          <span>{org.scheduleStartTime} - {org.scheduleEndTime}</span>
                          <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 font-bold ml-1">
                            {org.lessonCount || 0} Ders
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {org.lessonDurationMinutes} dk ders / {org.breakDurationMinutes} dk mola
                        </div>
                      </td>

                      {/* İletişim */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        <div className="space-y-0.5">
                          {org.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <span>{org.phone}</span>
                            </div>
                          )}
                          {org.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              <span>{org.email}</span>
                            </div>
                          )}
                          {!org.phone && !org.email && <span className="text-gray-400">Belirtilmedi</span>}
                        </div>
                      </td>

                      {/* İşlemler */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedDetailOrg(org);
                            }}
                            className="p-1.5 text-[#004aad] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Detay ve Yıllık Takip İncele"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setImpersonateOrg({ id: org.id, name: org.name, logoUrl: org.logoUrl, adminName: org.adminName });
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#004aad] to-[#003882] hover:from-[#003882] hover:to-[#002250] text-white rounded-lg transition-all font-bold text-xs shadow-sm hover:shadow active:scale-95 cursor-pointer"
                            title="Kurumu Ziyaret Et (Kurum yetkilisi olarak sisteme bağlan ve yönet)"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Ziyaret Et</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(org);
                            }}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Kurum ve Logo Düzenle"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(org.id, org.name);
                            }}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Kurumu Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      {/* YENİ KURUM EKLE MODAL */}
      {isAddModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
            <div className="h-2 bg-gradient-to-r from-[#002b66] via-[#004aad] to-blue-500 -mx-6 -mt-6 mb-5" />

            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#004aad]" />
                Yeni Kurum Ekle
              </h2>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action={addAction} className="space-y-4 pt-4">
              {/* Kurum Adı & İletişim */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kurum Adı *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="Örn: Ankara Bilim Kurs Merkezi"
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kurumsal Telefon</label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="0850 123 45 67"
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kurumsal E-posta</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="bilgi@kurum.com"
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kurum Adresi</label>
                  <input
                    type="text"
                    name="address"
                    placeholder="Cadde, Mahalle, İlçe / İl"
                    className="w-full px-3.5 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                  />
                </div>
              </div>

              {/* Marka Görsel Varlıkları (Logo & Favicon) */}
              <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <ImageIcon className="w-4 h-4 text-[#004aad]" />
                  Kurumsal Görsel Kimlik (Logo &amp; Favicon)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Logo Yükleme */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Kurum Logosu (PNG / SVG)</label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                        {addLogoPreview ? (
                          <img src={addLogoPreview} alt="Logo Önizleme" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setAddLogoPreview)}
                        className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#004aad] hover:file:bg-blue-100 cursor-pointer"
                      />
                    </div>
                    <input type="hidden" name="logoUrl" value={addLogoPreview || ''} />
                  </div>

                  {/* Favicon Yükleme */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Özel Favicon (Tarayıcı İkonu - ICO / PNG)</label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-2">
                        {addFaviconPreview ? (
                          <img src={addFaviconPreview} alt="Favicon Önizleme" className="w-full h-full object-contain" />
                        ) : (
                          <Globe className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setAddFaviconPreview)}
                        className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#004aad] hover:file:bg-blue-100 cursor-pointer"
                      />
                    </div>
                    <input type="hidden" name="faviconUrl" value={addFaviconPreview || ''} />
                  </div>
                </div>
              </div>

              {/* Kurum Sahibi / Yetkili Bilgileri (Giriş Hesabı) */}
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-3">
                <div className="text-xs font-black text-[#004aad] flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>👑 Kurum Sahibi / Yetkili Bilgileri (İlk Giriş Hesabı)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Kurum Sahibi Adı *</label>
                    <input
                      type="text"
                      name="adminFirstName"
                      required
                      placeholder="Ad"
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Kurum Sahibi Soyadı *</label>
                    <input
                      type="text"
                      name="adminLastName"
                      required
                      placeholder="Soyad"
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Kurum Sahibi Telefon Numarası</label>
                    <input
                      type="tel"
                      name="adminPhone"
                      placeholder="05XX XXX XX XX"
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Kullanıcı Adı / Giriş E-postası *</label>
                    <input
                      type="text"
                      name="adminEmail"
                      required
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Örn: onurbeyit veya sahip@kurum.com"
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Giriş için kullanıcı adı veya e-posta adresi yazabilirsiniz.</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Giriş Şifresi *</label>
                    <input
                      type="password"
                      name="adminPassword"
                      required
                      placeholder="••••••••"
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                    />
                  </div>
                </div>
              </div>

              {/* Vergi & Fatura Bilgileri */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    name="taxOffice"
                    placeholder="Örn: Çankaya V.D."
                    className="w-full px-3 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vergi Numarası</label>
                  <input
                    type="text"
                    name="taxNumber"
                    placeholder="10 haneli vergi no"
                    className="w-full px-3 py-1.5 border rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Ders & Zaman Çizelgesi Ayarları */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Açılış Saati</label>
                  <input
                    type="text"
                    name="scheduleStartTime"
                    defaultValue="08:00"
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Kapanış Saati</label>
                  <input
                    type="text"
                    name="scheduleEndTime"
                    defaultValue="18:00"
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Ders Süresi (dk)</label>
                  <input
                    type="text"
                    name="lessonDurationMinutes"
                    defaultValue="50"
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Mola Süresi (dk)</label>
                  <input
                    type="text"
                    name="breakDurationMinutes"
                    defaultValue="10"
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                  />
                </div>
              </div>

              {addState?.error && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {addState.error}
                </div>
              )}
              {addState?.success && (
                <div className="text-xs text-green-600 bg-green-50 p-2.5 rounded-xl border border-green-200 flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  {addState.success}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl text-sm"
                >
                  Vazgeç
                </Button>
                <Button
                  type="submit"
                  disabled={isAddPending}
                  className="bg-gradient-to-r from-[#004aad] to-[#003882] text-white rounded-xl text-sm font-bold px-6 shadow-md"
                >
                  {isAddPending ? 'Kaydediliyor...' : 'Kurumu Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* KURUM DÜZENLE MODAL */}
      {editingOrg && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
            <div className="h-2 bg-gradient-to-r from-[#002b66] via-[#004aad] to-blue-500 -mx-6 -mt-6 mb-5" />

            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#004aad]" />
                Kurum Bilgilerini Düzenle: {editingOrg.name}
              </h2>
              <button 
                type="button"
                onClick={() => setEditingOrg(null)} 
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action={editAction} className="space-y-4 pt-4">
              <input type="hidden" name="id" value={editingOrg.id} />

              {/* Kurum Adı & İletişim */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kurum Adı *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    defaultValue={editingOrg.name}
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kurumsal Telefon</label>
                  <input
                    type="text"
                    name="phone"
                    defaultValue={editingOrg.phone || ''}
                    placeholder="0850 123 45 67"
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kurumsal E-posta</label>
                  <input
                    type="email"
                    name="email"
                    defaultValue={editingOrg.email || ''}
                    placeholder="bilgi@kurum.com"
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Kurum Adresi</label>
                  <input
                    type="text"
                    name="address"
                    defaultValue={editingOrg.address || ''}
                    placeholder="Cadde, Mahalle, İlçe / İl"
                    className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                  />
                </div>
              </div>

              {/* Kurum Sahibi / Yetkili Bilgilerini Düzenleme */}
              <div className="p-4 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-3">
                <div className="text-xs font-black text-[#004aad] flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  <span>👑 Kurum Sahibi / Yetkili Bilgileri</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Kurum Sahibi Adı</label>
                    <input
                      type="text"
                      name="adminFirstName"
                      defaultValue={editingOrg.adminFirstName || ''}
                      placeholder="Ad"
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Kurum Sahibi Soyadı</label>
                    <input
                      type="text"
                      name="adminLastName"
                      defaultValue={editingOrg.adminLastName || ''}
                      placeholder="Soyad"
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Kurum Sahibi Telefon Numarası</label>
                    <input
                      type="tel"
                      name="adminPhone"
                      defaultValue={editingOrg.adminPhone || ''}
                      placeholder="05XX XXX XX XX"
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Kurum Sahibi Kullanıcı Adı / Giriş E-postası</label>
                    <input
                      type="text"
                      name="adminEmail"
                      defaultValue={editingOrg.adminEmail || ''}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Örn: onurbeyit veya sahip@kurum.com"
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Kullanıcı adı veya e-posta adresi yazabilirsiniz.</p>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Parolayı Değiştir (İsteğe Bağlı)</label>
                    <input
                      type="password"
                      name="adminPassword"
                      placeholder="Değiştirmek istemiyorsanız boş bırakın"
                      className="w-full px-3 py-2 border rounded-xl text-xs bg-white font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                    />
                  </div>
                </div>
              </div>

              {/* Marka Görsel Varlıkları (Logo & Favicon) Düzenleme */}
              <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <ImageIcon className="w-4 h-4 text-[#004aad]" />
                  Kurumsal Görsel Kimlik (Logo &amp; Favicon)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Logo Yükleme */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Kurum Logosu</label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                        {editLogoPreview ? (
                          <img src={editLogoPreview} alt="Logo Önizleme" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="w-6 h-6 text-gray-300" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setEditLogoPreview)}
                        className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#004aad] hover:file:bg-blue-100 cursor-pointer"
                      />
                    </div>
                    <input type="hidden" name="logoUrl" value={editLogoPreview || ''} />
                  </div>

                  {/* Favicon Yükleme */}
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Özel Favicon</label>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-2">
                        {editFaviconPreview ? (
                          <img src={editFaviconPreview} alt="Favicon Önizleme" className="w-full h-full object-contain" />
                        ) : (
                          <Globe className="w-5 h-5 text-gray-300" />
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, setEditFaviconPreview)}
                        className="text-xs text-gray-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#004aad] hover:file:bg-blue-100 cursor-pointer"
                      />
                    </div>
                    <input type="hidden" name="faviconUrl" value={editFaviconPreview || ''} />
                  </div>
                </div>
              </div>

              {/* Vergi & Fatura Bilgileri */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vergi Dairesi</label>
                  <input
                    type="text"
                    name="taxOffice"
                    defaultValue={editingOrg.taxOffice || ''}
                    placeholder="Örn: Çankaya V.D."
                    className="w-full px-3 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vergi Numarası</label>
                  <input
                    type="text"
                    name="taxNumber"
                    defaultValue={editingOrg.taxNumber || ''}
                    placeholder="10 haneli vergi no"
                    className="w-full px-3 py-1.5 border rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Ders & Zaman Çizelgesi Ayarları */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Açılış Saati</label>
                  <input
                    type="text"
                    name="scheduleStartTime"
                    defaultValue={editingOrg.scheduleStartTime}
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Kapanış Saati</label>
                  <input
                    type="text"
                    name="scheduleEndTime"
                    defaultValue={editingOrg.scheduleEndTime}
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Ders Süresi (dk)</label>
                  <input
                    type="text"
                    name="lessonDurationMinutes"
                    defaultValue={editingOrg.lessonDurationMinutes}
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Mola Süresi (dk)</label>
                  <input
                    type="text"
                    name="breakDurationMinutes"
                    defaultValue={editingOrg.breakDurationMinutes}
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs"
                  />
                </div>
              </div>

              {editState?.error && (
                <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {editState.error}
                </div>
              )}
              {editState?.success && (
                <div className="text-xs text-green-600 bg-green-50 p-2.5 rounded-xl border border-green-200 flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  {editState.success}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingOrg(null)}
                  className="rounded-xl text-sm"
                >
                  Kapat
                </Button>
                <Button
                  type="submit"
                  disabled={isEditPending}
                  className="bg-gradient-to-r from-[#004aad] to-[#003882] text-white rounded-xl text-sm font-bold px-6 shadow-md"
                >
                  {isEditPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* Impersonation Confirmation & Progress Modal */}
      <ImpersonateModal
        isOpen={Boolean(impersonateOrg)}
        onClose={() => setImpersonateOrg(null)}
        org={impersonateOrg}
      />

      {/* 6. KURUM DETAY & YILLIK TAKİP MODALI */}
      {selectedDetailOrg && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 overflow-hidden relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            {/* Üst Dekoratif Renk Şeridi */}
            <div className="h-2 bg-gradient-to-r from-[#002b66] via-[#004aad] to-blue-500 -mx-6 sm:-mx-7 -mt-6 sm:-mt-7 mb-5" />

            {/* Modal Üst Başlık & Marka */}
            <div className="flex items-start justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-1.5 shadow-sm">
                  {selectedDetailOrg.logoUrl ? (
                    <img src={selectedDetailOrg.logoUrl} alt={selectedDetailOrg.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-8 h-8 text-[#004aad]" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">
                      {selectedDetailOrg.name}
                    </h2>
                    {selectedDetailOrg.faviconUrl && (
                      <img src={selectedDetailOrg.faviconUrl} alt="favicon" className="w-4 h-4 object-contain" title="Özel Favicon" />
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {/* Hangi Tarihte Eklenmiş (Kayıt Tarihi) */}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-[#004aad] border border-blue-200/80 shadow-2xs">
                      <Calendar className="w-3.5 h-3.5 text-[#004aad]" />
                      <span>
                        Eklenme Tarihi: {new Date(selectedDetailOrg.createdAt).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })} • {new Date(selectedDetailOrg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </span>
                    {selectedDetailOrg.taxOffice && (
                      <span className="text-xs text-gray-400 font-mono">
                        {selectedDetailOrg.taxOffice} V.D. - {selectedDetailOrg.taxNumber || ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailOrg(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Kaydırılabilir İçerik Gövdesi */}
            <div className="overflow-y-auto flex-1 py-4 space-y-6 custom-scrollbar pr-1">
              
              {/* BÖLÜM A: Yıllık Takip ve Akademik Performans */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#004aad]" />
                  <span>Yıllık Takip &amp; Akademik İstatistikler ({selectedDetailOrg.annualStats?.year || new Date().getFullYear()})</span>
                </h3>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* KPI 1: Tamamlanan Dersler */}
                  <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5 text-center">
                    <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                      Yıllık Tamamlanan Ders
                    </span>
                    <div className="text-2xl font-black text-emerald-800 mt-1">
                      {selectedDetailOrg.annualStats?.completedLessonsThisYear || selectedDetailOrg.lessonCount || 0}
                    </div>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">
                      Toplam: {selectedDetailOrg.annualStats?.allTimeCompletedLessons || selectedDetailOrg.lessonCount || 0} ders
                    </span>
                  </div>

                  {/* KPI 2: Planlanan / Aktif Ders */}
                  <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 text-center">
                    <span className="text-[10px] font-extrabold text-[#004aad] uppercase tracking-wider block">
                      Planlanan Ders
                    </span>
                    <div className="text-2xl font-black text-[#004aad] mt-1">
                      {selectedDetailOrg.annualStats?.plannedLessonsThisYear || 0}
                    </div>
                    <span className="text-[10px] text-blue-600 block mt-0.5">
                      İptal: {selectedDetailOrg.annualStats?.cancelledLessonsThisYear || 0} ders
                    </span>
                  </div>

                  {/* KPI 3: Aktif Öğrenci */}
                  <div className="bg-purple-50/70 border border-purple-200/80 rounded-2xl p-3.5 text-center">
                    <span className="text-[10px] font-extrabold text-purple-700 uppercase tracking-wider block">
                      Öğrenci Portföyü
                    </span>
                    <div className="text-2xl font-black text-purple-800 mt-1">
                      {selectedDetailOrg.studentCount || 0}
                    </div>
                    <span className="text-[10px] text-purple-600 block mt-0.5">
                      +{selectedDetailOrg.annualStats?.archivedStudents || 0} Mezun/Arşiv
                    </span>
                  </div>

                  {/* KPI 4: Öğretmen Kadrosu */}
                  <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 text-center">
                    <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">
                      Öğretmen Kadrosu
                    </span>
                    <div className="text-2xl font-black text-indigo-800 mt-1">
                      {selectedDetailOrg.teacherCount || 0}
                    </div>
                    <span className="text-[10px] text-indigo-600 block mt-0.5">
                      Kayıtlı Eğitmen
                    </span>
                  </div>
                </div>

                {/* Ders ve Çalışma Standartları Çubuğu */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-gray-700 font-semibold">
                    <Clock className="w-4 h-4 text-[#004aad]" />
                    <span>Ders Standardı:</span>
                    <span className="bg-white px-2 py-0.5 rounded-lg border border-gray-200 font-bold text-gray-900">
                      {selectedDetailOrg.lessonDurationMinutes} dk Ders
                    </span>
                    <span>+</span>
                    <span className="bg-white px-2 py-0.5 rounded-lg border border-gray-200 font-bold text-gray-900">
                      {selectedDetailOrg.breakDurationMinutes} dk Teneffüs
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <span className="font-semibold">Mesai Saatleri:</span>
                    <span className="bg-white px-2 py-0.5 rounded-lg border border-gray-200 font-bold text-gray-900">
                      {selectedDetailOrg.scheduleStartTime} - {selectedDetailOrg.scheduleEndTime}
                    </span>
                  </div>
                </div>
              </div>

              {/* ÖNE ÇIKARILAN KURUM SAHİBİ KARTI */}
              <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/90 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-[#004aad] uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      👑 Kurum Sahibi / Yetkili
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const org = selectedDetailOrg;
                      setSelectedDetailOrg(null);
                      openEditModal(org);
                    }}
                    className="px-3 py-1 bg-white hover:bg-blue-50 text-[#004aad] border border-blue-200 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Sahip Bilgilerini Düzenle</span>
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-blue-100/80 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#004aad] to-[#003882] text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                      {selectedDetailOrg.adminName?.[0] || 'S'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900">
                          {selectedDetailOrg.adminName || 'Yönetici / Sahip Atanmadı'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                          Kurum Sahibi
                        </span>
                      </div>
                      {selectedDetailOrg.adminEmail && (
                        <span className="text-xs text-gray-500 font-mono block">
                          {selectedDetailOrg.adminEmail.startsWith('@') ? selectedDetailOrg.adminEmail : (selectedDetailOrg.adminEmail.includes('@') ? selectedDetailOrg.adminEmail : `@${selectedDetailOrg.adminEmail}`)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {selectedDetailOrg.adminPhone ? (
                      <>
                        <a
                          href={`tel:${selectedDetailOrg.adminPhone}`}
                          className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5 transition-colors"
                          title="Telefonla Ara"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{selectedDetailOrg.adminPhone}</span>
                        </a>
                        <a
                          href={`https://wa.me/${selectedDetailOrg.adminPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-green-50 hover:bg-green-100 text-green-800 text-xs font-bold border border-green-200 flex items-center gap-1.5 transition-colors"
                          title="WhatsApp Sohbeti Başlat"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                          <span>WhatsApp</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedDetailOrg.adminPhone || '');
                            setCopiedPhone('admin-owner');
                            setTimeout(() => setCopiedPhone(null), 1500);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                          title="Numarayı Kopyala"
                        >
                          {copiedPhone === 'admin-owner' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Telefon bilgisi girilmemiş</span>
                    )}
                  </div>
                </div>
              </div>

              {/* BÖLÜM B: Kurum Yetkilileri ve İletişim Numaraları Rehberi */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#004aad]" />
                    <span>Kurum Yetkilileri &amp; İletişim Numaraları ({selectedDetailOrg.staffMembers?.length || 0})</span>
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Telefon ve e-posta rehberi
                  </span>
                </div>

                {(!selectedDetailOrg.staffMembers || selectedDetailOrg.staffMembers.length === 0) ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center text-xs text-gray-500">
                    Bu kurumda kayıtlı yönetici veya personel bulunmuyor.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedDetailOrg.staffMembers.map(staff => (
                      <div 
                        key={staff.id}
                        className="bg-white border border-gray-200 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-[#004aad]/30 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <img src="/images/admin.png" alt="Yönetici" className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 shrink-0 object-contain p-1 shadow-sm" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-gray-900">
                                {staff.firstName} {staff.lastName}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                staff.role.includes('Yönetici') 
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {staff.role}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-400 font-mono">
                              @{staff.username}
                            </span>
                          </div>
                        </div>

                        {/* Telefon ve Aksiyonlar */}
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          {staff.phone ? (
                            <>
                              <a
                                href={`tel:${staff.phone}`}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center gap-1.5 transition-colors"
                                title="Telefonla Ara"
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{staff.phone}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(staff.phone || '');
                                  setCopiedPhone(staff.id);
                                  setTimeout(() => setCopiedPhone(null), 1500);
                                }}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                title="Numarayı Kopyala"
                              >
                                {copiedPhone === staff.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Telefon girilmemiş</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* BÖLÜM C: Kurum İletişim Bilgileri */}
              <div className="bg-gray-50/70 border border-gray-200/80 rounded-2xl p-4 space-y-2.5 text-xs">
                <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 block">
                  Kurumsal İletişim &amp; Adres
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-700">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>Kurum Santral: <strong>{selectedDetailOrg.phone || 'Belirtilmemiş'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    <span>Kurum E-posta: <strong>{selectedDetailOrg.email || 'Belirtilmemiş'}</strong></span>
                  </div>
                </div>
                {selectedDetailOrg.address && (
                  <div className="flex items-start gap-2 pt-1 border-t border-gray-200/60 text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{selectedDetailOrg.address}</span>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Alt Aksiyon Çubuğu */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 mt-2">
              <button
                type="button"
                onClick={() => setSelectedDetailOrg(null)}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
              >
                Kapat
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const o = selectedDetailOrg;
                    setSelectedDetailOrg(null);
                    setEditingOrg(o);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-gray-700 hover:text-[#004aad] bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Kurumu Düzenle</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const o = selectedDetailOrg;
                    setSelectedDetailOrg(null);
                    setImpersonateOrg({ id: o.id, name: o.name, logoUrl: o.logoUrl, adminName: o.adminName });
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#004aad] to-[#003882] hover:from-[#003882] hover:to-[#002250] rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Kurumu Ziyaret Et</span>
                </button>
              </div>
            </div>

          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
