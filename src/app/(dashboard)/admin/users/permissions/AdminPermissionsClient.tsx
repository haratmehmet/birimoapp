'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  DollarSign, 
  FileBarChart, 
  MessageCircle, 
  Bell, 
  Settings, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Sparkles,
  Info,
  Check,
  UserCheck,
  Shield,
  ArrowRight
} from 'lucide-react';
import { MODULE_DEFINITIONS, DEFAULT_ROLE_PERMISSIONS, ModuleDef } from '@/lib/permissions-constants';
import { toggleRoleModulePermissionAction, resetRolePermissionsAction } from './actions';

interface OrgItem {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface UserItem {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string;
  role: string;
  organizationId: string | null;
}

interface OverrideItem {
  id: string;
  organizationId: string;
  role: string;
  userId: string | null;
  moduleKey: string;
  isEnabled: boolean;
}

interface AdminPermissionsClientProps {
  organizations: OrgItem[];
  users: UserItem[];
  overrides: OverrideItem[];
}

export function AdminPermissionsClient({
  organizations,
  users,
  overrides: initialOverrides,
}: AdminPermissionsClientProps) {
  const [selectedOrgId, setSelectedOrgId] = useState<string>(organizations[0]?.id || '');
  const [selectedRole, setSelectedRole] = useState<'STAFF' | 'TEACHER' | 'ORG_ADMIN'>('STAFF');
  const [selectedUserId, setSelectedUserId] = useState<string>(''); // '' means role-level
  const [overrides, setOverrides] = useState<OverrideItem[]>(initialOverrides);
  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const activeOrg = organizations.find(o => o.id === selectedOrgId);
  const orgUsers = users.filter(u => u.organizationId === selectedOrgId);

  // Compute effective permissions for current selection
  const getModuleStatus = (moduleKey: string): boolean => {
    // 1. If user is selected, check user-level override
    if (selectedUserId) {
      const userOv = overrides.find(
        o => o.organizationId === selectedOrgId && o.userId === selectedUserId && o.moduleKey === moduleKey
      );
      if (userOv !== undefined) return userOv.isEnabled;
    }

    // 2. Check role-level override for this organization
    const roleOv = overrides.find(
      o => o.organizationId === selectedOrgId && !o.userId && o.role === selectedRole && o.moduleKey === moduleKey
    );
    if (roleOv !== undefined) return roleOv.isEnabled;

    // 3. Fallback to default
    const roleDefaults = DEFAULT_ROLE_PERMISSIONS[selectedRole] || {};
    return roleDefaults[moduleKey] ?? false;
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleToggle = (moduleKey: string, currentVal: boolean) => {
    const newVal = !currentVal;

    // Optimistic UI update
    setOverrides(prev => {
      const filtered = prev.filter(
        o => !(o.organizationId === selectedOrgId && 
               o.moduleKey === moduleKey && 
               (selectedUserId ? o.userId === selectedUserId : (!o.userId && o.role === selectedRole)))
      );
      return [
        ...filtered,
        {
          id: Math.random().toString(),
          organizationId: selectedOrgId,
          role: selectedRole,
          userId: selectedUserId || null,
          moduleKey,
          isEnabled: newVal,
        },
      ];
    });

    startTransition(async () => {
      const res = await toggleRoleModulePermissionAction({
        organizationId: selectedOrgId,
        role: selectedRole,
        userId: selectedUserId || null,
        moduleKey,
        isEnabled: newVal,
      });

      if (res.error) {
        showFeedback('error', res.error);
      } else {
        const mod = MODULE_DEFINITIONS.find(m => m.key === moduleKey);
        showFeedback('success', `"${mod?.name || moduleKey}" modülü ${newVal ? 'ETKİNLEŞTİRİLDİ' : 'DEVRE DIŞI BIRAKILDI'}.`);
      }
    });
  };

  const handleResetDefaults = () => {
    if (!confirm('Bu rolün tüm izinlerini varsayılan fabrika ayarlarına sıfırlamak istediğinize emin misiniz?')) {
      return;
    }

    // Remove local overrides
    setOverrides(prev => 
      prev.filter(
        o => !(o.organizationId === selectedOrgId && 
               (selectedUserId ? o.userId === selectedUserId : (!o.userId && o.role === selectedRole)))
      )
    );

    startTransition(async () => {
      const res = await resetRolePermissionsAction({
        organizationId: selectedOrgId,
        role: selectedRole,
        userId: selectedUserId || null,
      });

      if (res.error) {
        showFeedback('error', res.error);
      } else {
        showFeedback('success', 'İzinler varsayılan ayarlara başarıyla sıfırlandı.');
      }
    });
  };

  const getModuleIcon = (key: string) => {
    switch (key) {
      case 'teachers': return <GraduationCap className="w-5 h-5 text-[#004aad]" />;
      case 'students': return <Users className="w-5 h-5 text-[#004aad]" />;
      case 'requests': return <BookOpen className="w-5 h-5 text-[#004aad]" />;
      case 'calendar': return <Calendar className="w-5 h-5 text-[#004aad]" />;
      case 'attendance': return <CheckSquare className="w-5 h-5 text-[#004aad]" />;
      case 'payouts': return <DollarSign className="w-5 h-5 text-[#004aad]" />;
      case 'reports': return <FileBarChart className="w-5 h-5 text-[#004aad]" />;
      case 'whatsapp': return <MessageCircle className="w-5 h-5 text-[#004aad]" />;
      case 'notifications': return <Bell className="w-5 h-5 text-[#004aad]" />;
      case 'settings': return <Settings className="w-5 h-5 text-[#004aad]" />;
      default: return <Shield className="w-5 h-5 text-[#004aad]" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 p-6 rounded-2xl border border-white/80 shadow-sm backdrop-blur-md">
        <div>
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-2.5">
            <Link
              href="/admin/users"
              className="px-3.5 py-1.5 rounded-xl font-bold text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Kullanıcı Listesi</span>
            </Link>
            <span className="text-gray-300">/</span>
            <span className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-[#004aad] text-white shadow-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Yetkilendirme &amp; Modül Yönetimi</span>
            </span>
          </div>

          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#004aad] to-[#003882] text-white shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            Yetkilendirme &amp; Modül Erişim Yönetimi
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed">
            Hangi kurumun hangi yetkilisine veya öğretmenine hangi bölümlerin (Finans, Öğrenciler, Takvim vb.) açık olacağını buradan yönetin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={isPending}
            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Varsayılana Sıfırla</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast Notification */}
      {feedbackMessage && (
        <div className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* 2. Kurum Seçici (Interactive Institution Cards Strip) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#004aad]" />
            <span>Yetkilendirilecek Kurumu Seçin</span>
          </h2>
          <div className="text-xs text-gray-500">
            Aktif Kurum: <strong className="text-[#004aad] bg-blue-50 px-2 py-0.5 rounded-md font-bold">{activeOrg?.name || 'Seçilmedi'}</strong>
          </div>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 custom-scrollbar">
          {organizations.map(org => {
            const isSelected = selectedOrgId === org.id;
            return (
              <button
                key={org.id}
                type="button"
                onClick={() => {
                  setSelectedOrgId(org.id);
                  setSelectedUserId('');
                }}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all duration-150 flex items-center gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/90 border-[#004aad] text-[#004aad] ring-2 ring-[#004aad]/20 shadow-xs'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-0.5">
                  {org.logoUrl ? (
                    <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-[#004aad]" />
                  )}
                </div>
                <div className="text-left font-bold truncate max-w-[160px]">
                  {org.name}
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-[#004aad] ml-1 flex-shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Hedef Rol ve Kullanıcı Seçimi */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-gray-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Hedef Rol / Kullanıcı Seviyesi
            </span>
            <p className="text-[11px] text-gray-400 mt-0.5">
              İzinleri tüm role mi yoksa spesifik bir kişiye mi tanımlamak istiyorsunuz?
            </p>
          </div>

          {/* User selector dropdown (Optional Override) */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Kişiye Özel:</span>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
            >
              <option value="">Role Göre Genel Yetki (Kişi Seçilmedi)</option>
              {orgUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.firstName} {u.lastName} ({u.role === 'STAFF' ? 'Yetkili' : (u.role === 'TEACHER' ? 'Öğretmen' : 'Yönetici')})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Role Segmented Buttons (Disabled if individual user is selected) */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={Boolean(selectedUserId)}
            onClick={() => setSelectedRole('STAFF')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              selectedRole === 'STAFF' && !selectedUserId
                ? 'bg-[#004aad] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Yetkili / Personel (STAFF)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/20">Varsayılan İzinleri</span>
          </button>

          <button
            type="button"
            disabled={Boolean(selectedUserId)}
            onClick={() => setSelectedRole('TEACHER')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              selectedRole === 'TEACHER' && !selectedUserId
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-50'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>Öğretmen (TEACHER)</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-white/20">Varsayılan İzinleri</span>
          </button>

          <button
            type="button"
            disabled={Boolean(selectedUserId)}
            onClick={() => setSelectedRole('ORG_ADMIN')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              selectedRole === 'ORG_ADMIN' && !selectedUserId
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 disabled:opacity-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Kurum Yöneticisi (ORG_ADMIN)</span>
          </button>
        </div>
      </div>

      {/* 4. Modül İzinleri Listesi (Interactive Cards Grid) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#004aad]" />
            <span>Modüller ve Menü Bölümleri (Açık / Kapalı İzinleri)</span>
          </h3>
          <span className="text-xs text-gray-400">
            Değişiklikler anında kaydedilir ve kullanıcının oturumunda geçerli olur.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {MODULE_DEFINITIONS.map(mod => {
            const isEnabled = getModuleStatus(mod.key);

            return (
              <div
                key={mod.key}
                className={`p-4 rounded-2xl border transition-all flex items-start justify-between gap-4 bg-white ${
                  isEnabled
                    ? 'border-gray-200 shadow-xs hover:border-[#004aad]/40'
                    : 'border-gray-100 bg-gray-50/50 opacity-80'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className={`p-2.5 rounded-xl border flex-shrink-0 ${
                    isEnabled
                      ? 'bg-blue-50/80 border-blue-100 text-[#004aad]'
                      : 'bg-gray-100 border-gray-200 text-gray-400'
                  }`}>
                    {getModuleIcon(mod.key)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className={`text-sm font-bold ${isEnabled ? 'text-gray-900' : 'text-gray-500'}`}>
                        {mod.name}
                      </h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-gray-100 text-gray-500">
                        {mod.href}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 leading-relaxed max-w-sm">
                      {mod.description}
                    </p>

                    <div className="pt-1">
                      {isEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Menüde Görünür &amp; Yetkili
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                          <XCircle className="w-3 h-3 text-gray-400" />
                          Erişime Kapalı &amp; Gizli
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Switch Toggle */}
                <div className="flex items-center flex-shrink-0 pt-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isEnabled}
                    onClick={() => handleToggle(mod.key, isEnabled)}
                    disabled={isPending}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#004aad] focus:ring-offset-2 ${
                      isEnabled ? 'bg-[#004aad]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Rehber / Yardım Bilgisi */}
      <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 text-xs text-[#004aad] flex items-start gap-3">
        <Info className="w-5 h-5 flex-shrink-0 text-[#004aad] mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold">Yetkilendirme Nasıl Çalışır?</strong>
          <p className="text-gray-600 leading-relaxed">
            Burada bir rol veya kullanıcı için kapattığınız bölümler, o kullanıcının sol navigasyon menüsünden anında gizlenir. 
            Örneğin bir kurumdaki <strong>Yetkili (STAFF)</strong> personellerinin <strong>Finans (Hakedişler)</strong> bölümünü görmesini istemiyorsanız, yukarıdaki switch düğmesini kapatmanız yeterlidir.
          </p>
        </div>
      </div>
    </div>
  );
}
