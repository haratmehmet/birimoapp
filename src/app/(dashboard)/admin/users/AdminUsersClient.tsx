'use client';

import { useState, useTransition, useActionState, useMemo } from 'react';
import Link from 'next/link';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Key, 
  ShieldCheck, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  X, 
  AlertCircle, 
  Check, 
  UserCheck, 
  GraduationCap, 
  Shield, 
  Phone, 
  Mail, 
  Clock,
  Sparkles,
  Filter,
  ArrowUpDown,
  BookOpen,
  Calendar,
  CheckSquare,
  DollarSign,
  FileBarChart,
  MessageCircle,
  Bell,
  Settings,
  RotateCcw,
  Info,
  ArrowRight
} from 'lucide-react';
import { createAdminUserAction, updateAdminUserAction, resetUserPasswordAction, toggleUserStatusAction } from './actions';
import { toggleRoleModulePermissionAction, resetRolePermissionsAction } from './permissions/actions';
import { MODULE_DEFINITIONS, DEFAULT_ROLE_PERMISSIONS, ModuleDef } from '@/lib/permissions-constants';
import { Button } from '@/components/ui/button';
import { ModalPortal } from '@/components/ui/ModalPortal';

export interface AdminUserItem {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  organizationId: string | null;
  organizationName: string | null;
  orgLogoUrl?: string | null;
  role: string;
  roleDescription: string;
  isActive: boolean;
  createdAt: Date | string;
}

export interface SimpleOrg {
  id: string;
  name: string;
  logoUrl?: string | null;
}

export interface OverrideItem {
  id: string;
  organizationId: string;
  role: string;
  userId: string | null;
  moduleKey: string;
  isEnabled: boolean;
}

interface AdminUsersClientProps {
  users: AdminUserItem[];
  organizations: SimpleOrg[];
  overrides?: OverrideItem[];
}

export function AdminUsersClient({ users, organizations, overrides = [] }: AdminUsersClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState<string>('ALL'); // 'ALL' | 'SYSTEM' | org.id
  const [selectedRoleTab, setSelectedRoleTab] = useState<string>('ALL'); // 'ALL' | 'ORG_ADMIN' | 'STAFF' | 'TEACHER' | 'SUPER_ADMIN'
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'ROLE' | 'NAME' | 'DATE'>('ROLE');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUserItem | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordResetSuccess, setPasswordResetSuccess] = useState<string | null>(null);
  const [passwordResetError, setPasswordResetError] = useState<string | null>(null);

  // User Permissions Modal State
  const [permissionUser, setPermissionUser] = useState<AdminUserItem | null>(null);
  const [userOverrides, setUserOverrides] = useState<OverrideItem[]>(overrides || []);
  const [permissionFeedback, setPermissionFeedback] = useState<string | null>(null);

  const getUserModuleStatus = (targetUser: AdminUserItem, moduleKey: string): boolean => {
    // 1. Check user-specific override
    const userOv = userOverrides.find(
      o => o.organizationId === targetUser.organizationId && o.userId === targetUser.id && o.moduleKey === moduleKey
    );
    if (userOv !== undefined) return userOv.isEnabled;

    // 2. Check role-level override
    const roleOv = userOverrides.find(
      o => o.organizationId === targetUser.organizationId && !o.userId && o.role === targetUser.role && o.moduleKey === moduleKey
    );
    if (roleOv !== undefined) return roleOv.isEnabled;

    // 3. Role default
    const roleDefaults = DEFAULT_ROLE_PERMISSIONS[targetUser.role] || {};
    return roleDefaults[moduleKey] ?? false;
  };

  const isModuleUserCustom = (targetUser: AdminUserItem, moduleKey: string): boolean => {
    return userOverrides.some(
      o => o.organizationId === targetUser.organizationId && o.userId === targetUser.id && o.moduleKey === moduleKey
    );
  };

  const handleToggleUserPermission = (targetUser: AdminUserItem, moduleKey: string, currentVal: boolean) => {
    if (!targetUser.organizationId) return;
    const newVal = !currentVal;

    // Optimistically update
    setUserOverrides(prev => {
      const filtered = prev.filter(
        o => !(o.organizationId === targetUser.organizationId && o.userId === targetUser.id && o.moduleKey === moduleKey)
      );
      return [
        ...filtered,
        {
          id: Math.random().toString(),
          organizationId: targetUser.organizationId!,
          role: targetUser.role,
          userId: targetUser.id,
          moduleKey,
          isEnabled: newVal,
        },
      ];
    });

    startTransition(async () => {
      const res = await toggleRoleModulePermissionAction({
        organizationId: targetUser.organizationId!,
        role: targetUser.role,
        userId: targetUser.id,
        moduleKey,
        isEnabled: newVal,
      });

      if (res.error) {
        setPermissionFeedback(res.error);
      } else {
        const mod = MODULE_DEFINITIONS.find(m => m.key === moduleKey);
        setPermissionFeedback(`"${mod?.name || moduleKey}" izni ${newVal ? 'açıldı' : 'kapatıldı'}.`);
        setTimeout(() => setPermissionFeedback(null), 3000);
      }
    });
  };

  const handleResetUserPermissions = (targetUser: AdminUserItem) => {
    if (!targetUser.organizationId) return;

    setUserOverrides(prev => 
      prev.filter(o => !(o.organizationId === targetUser.organizationId && o.userId === targetUser.id))
    );

    startTransition(async () => {
      await resetRolePermissionsAction({
        organizationId: targetUser.organizationId!,
        role: targetUser.role,
        userId: targetUser.id,
      });
      setPermissionFeedback('Özel izinler sıfırlandı, rol varsayılanına dönüldü.');
      setTimeout(() => setPermissionFeedback(null), 3000);
    });
  };

  const [isPending, startTransition] = useTransition();

  const [addState, addAction, isAddPending] = useActionState(createAdminUserAction, null);
  const [editState, editAction, isEditPending] = useActionState(updateAdminUserAction, null);

  const [addSelectedRole, setAddSelectedRole] = useState('ORG_ADMIN');
  const [editSelectedRole, setEditSelectedRole] = useState('');

  // Compute platform-wide & organization counts
  const stats = useMemo(() => {
    let superAdmins = 0;
    let orgManagers = 0;
    let staffCount = 0;
    let teachersCount = 0;
    let activeUsers = 0;

    const orgCounts: Record<string, { total: number; managers: number; teachers: number; staff: number }> = {};
    for (const org of organizations) {
      orgCounts[org.id] = { total: 0, managers: 0, teachers: 0, staff: 0 };
    }

    for (const u of users) {
      if (u.isActive) activeUsers++;

      if (u.role === 'SUPER_ADMIN') {
        superAdmins++;
      } else if (u.role === 'ORG_ADMIN') {
        orgManagers++;
      } else if (u.role === 'STAFF') {
        staffCount++;
      } else if (u.role === 'TEACHER') {
        teachersCount++;
      }

      if (u.organizationId && orgCounts[u.organizationId]) {
        orgCounts[u.organizationId].total++;
        if (u.role === 'ORG_ADMIN') orgCounts[u.organizationId].managers++;
        else if (u.role === 'TEACHER') orgCounts[u.organizationId].teachers++;
        else if (u.role === 'STAFF') orgCounts[u.organizationId].staff++;
      }
    }

    return {
      grandTotal: users.length,
      activeUsers,
      superAdmins,
      orgManagers,
      staffCount,
      teachersCount,
      orgCounts,
    };
  }, [users, organizations]);

  // Role hierarchy mapping for sorting
  const roleHierarchy: Record<string, number> = {
    'SUPER_ADMIN': 1,
    'ORG_ADMIN': 2,
    'STAFF': 3,
    'TEACHER': 4,
  };

  // Filtered and Sorted Users
  const filteredUsers = useMemo(() => {
    return users
      .filter(u => {
        const q = searchTerm.toLowerCase();
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const matchesSearch = fullName.includes(q) || u.username.toLowerCase().includes(q) || (u.phone && u.phone.includes(q));

        const matchesOrg = 
          selectedOrgId === 'ALL' ? true :
          selectedOrgId === 'SYSTEM' ? u.organizationId === null :
          u.organizationId === selectedOrgId;

        const matchesRole = 
          selectedRoleTab === 'ALL' ? true :
          u.role === selectedRoleTab;

        const matchesStatus = 
          selectedStatusFilter === 'ALL' ? true :
          selectedStatusFilter === 'ACTIVE' ? u.isActive :
          !u.isActive;

        return matchesSearch && matchesOrg && matchesRole && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === 'ROLE') {
          const rA = roleHierarchy[a.role] || 99;
          const rB = roleHierarchy[b.role] || 99;
          if (rA !== rB) return rA - rB;
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.username;
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.username;
          return nameA.localeCompare(nameB, 'tr');
        } else if (sortBy === 'NAME') {
          const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.username;
          const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.username;
          return nameA.localeCompare(nameB, 'tr');
        } else {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });
  }, [users, searchTerm, selectedOrgId, selectedRoleTab, selectedStatusFilter, sortBy]);

  const handleToggleStatus = (userId: string) => {
    startTransition(async () => {
      await toggleUserStatusAction(userId);
    });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPassword) return;
    setPasswordResetSuccess(null);
    setPasswordResetError(null);

    const res = await resetUserPasswordAction(resetPasswordUser.id, newPassword);
    if (res?.error) {
      setPasswordResetError(res.error);
    } else {
      setPasswordResetSuccess('Şifre başarıyla güncellendi!');
      setTimeout(() => {
        setResetPasswordUser(null);
        setNewPassword('');
        setPasswordResetSuccess(null);
      }, 1400);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-slate-900 text-white border border-slate-800 shadow-xs">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Süper Admin</span>
          </span>
        );
      case 'ORG_ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-blue-50 text-[#004aad] border border-blue-200/80 shadow-xs">
            <Building2 className="w-3.5 h-3.5 text-[#004aad]" />
            <span>Kurum Yöneticisi</span>
          </span>
        );
      case 'STAFF':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-xs">
            <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
            <span>Yetkili / Personel</span>
          </span>
        );
      case 'TEACHER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-xs">
            <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
            <span>Öğretmen</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">
            {role}
          </span>
        );
    }
  };

  const getModuleIcon = (key: string) => {
    switch (key) {
      case 'teachers': return <GraduationCap className="w-4 h-4 text-[#004aad]" />;
      case 'students': return <Users className="w-4 h-4 text-[#004aad]" />;
      case 'requests': return <BookOpen className="w-4 h-4 text-[#004aad]" />;
      case 'calendar': return <Calendar className="w-4 h-4 text-[#004aad]" />;
      case 'attendance': return <CheckSquare className="w-4 h-4 text-[#004aad]" />;
      case 'payouts': return <DollarSign className="w-4 h-4 text-[#004aad]" />;
      case 'reports': return <FileBarChart className="w-4 h-4 text-[#004aad]" />;
      case 'whatsapp': return <MessageCircle className="w-4 h-4 text-[#004aad]" />;
      case 'notifications': return <Bell className="w-4 h-4 text-[#004aad]" />;
      case 'settings': return <Settings className="w-4 h-4 text-[#004aad]" />;
      default: return <ShieldCheck className="w-4 h-4 text-[#004aad]" />;
    }
  };

  const activeOrgName = 
    selectedOrgId === 'ALL' ? 'Tüm Kurumlar' :
    selectedOrgId === 'SYSTEM' ? 'Süper Adminler (Bağımsız)' :
    organizations.find(o => o.id === selectedOrgId)?.name || 'Seçili Kurum';

  return (
    <div className="space-y-6">
      {/* 0. Top Level Navigation Tabs (Kullanıcı Listesi vs Yetkilendirme) */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-fit shadow-xs">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-[#004aad] text-white shadow-sm">
          <Users className="w-4 h-4" />
          <span>👥 Kullanıcı Listesi</span>
        </div>
        <Link
          href="/admin/users/permissions"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-[#004aad] hover:bg-white transition-all cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-[#004aad]" />
          <span>🛡️ Yetkilendirme &amp; Modül Yönetimi (Alt Bölüm)</span>
        </Link>
      </div>

      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 p-6 rounded-2xl border border-white/80 shadow-sm backdrop-blur-md">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#004aad] to-[#003882] text-white shadow-sm">
              <Users className="w-6 h-6" />
            </div>
            Kullanıcı Yönetimi
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed">
            Kurum yöneticileri, kurum personelleri, öğretmenler ve süper admin hesaplarını rol hiyerarşisine göre inceleyin, düzenleyin ve yönetin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/users/permissions"
            className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-[#004aad] rounded-xl border border-blue-100 font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Yetkilendirme &amp; İzinler</span>
          </Link>

          <Button
            onClick={() => {
              setIsAddModalOpen(true);
              setAddSelectedRole(selectedOrgId === 'SYSTEM' ? 'SUPER_ADMIN' : 'ORG_ADMIN');
            }}
            className="bg-gradient-to-r from-[#004aad] to-[#003882] hover:from-[#003882] hover:to-[#002b66] text-white shadow-md hover:shadow-lg transition-all rounded-xl px-5 py-2.5 flex items-center gap-2 text-sm font-bold active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Yeni Kullanıcı Ekle
          </Button>
        </div>
      </div>

      {/* 2. Platform KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Toplam Kullanıcı */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">Toplam Kullanıcı</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#004aad]">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{stats.grandTotal}</span>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
              {stats.activeUsers} Aktif
            </span>
          </div>
        </div>

        {/* Metric 2: Kurum Yöneticileri */}
        <div 
          onClick={() => setSelectedRoleTab('ORG_ADMIN')}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-blue-200 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider group-hover:text-[#004aad] transition-colors">
              Kurum Yöneticisi
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#004aad]">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#004aad]">{stats.orgManagers}</span>
            <span className="text-xs text-gray-400">Yönetici</span>
          </div>
        </div>

        {/* Metric 3: Öğretmenler */}
        <div 
          onClick={() => setSelectedRoleTab('TEACHER')}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              Öğretmenler
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{stats.teachersCount}</span>
            <span className="text-xs text-gray-400">Eğitmen</span>
          </div>
        </div>

        {/* Metric 4: Yetkililer & Personel */}
        <div 
          onClick={() => setSelectedRoleTab('STAFF')}
          className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider group-hover:text-indigo-700 transition-colors">
              Yetkili / Personel
            </span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">{stats.staffCount}</span>
            <span className="text-xs text-gray-400">Personel</span>
          </div>
        </div>
      </div>

      {/* 3. Executive Kurum Seçici (Modern Kurum Kartları) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#004aad]" />
            <span>Kurum Bazlı Kullanıcı Listesi</span>
          </h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Aktif Filtre:</span>
            <strong className="text-[#004aad] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              {activeOrgName}
            </strong>
          </div>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 custom-scrollbar">
          {/* Chip 1: Tüm Kurumlar */}
          <button
            type="button"
            onClick={() => setSelectedOrgId('ALL')}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all duration-150 flex items-center gap-2.5 cursor-pointer ${
              selectedOrgId === 'ALL'
                ? 'bg-[#004aad] text-white border-[#004aad] shadow-sm'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tüm Kurumlar</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              selectedOrgId === 'ALL' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {stats.grandTotal}
            </span>
          </button>

          {/* Chip 2: Süper Adminler */}
          <button
            type="button"
            onClick={() => setSelectedOrgId('SYSTEM')}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all duration-150 flex items-center gap-2.5 cursor-pointer ${
              selectedOrgId === 'SYSTEM'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
            }`}
          >
            <Shield className="w-4 h-4 text-blue-400" />
            <span>Süper Adminler</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
              selectedOrgId === 'SYSTEM' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {stats.superAdmins}
            </span>
          </button>

          {/* Kurumlar */}
          {organizations.map(org => {
            const isSelected = selectedOrgId === org.id;
            const orgStat = stats.orgCounts[org.id] || { total: 0, managers: 0, teachers: 0, staff: 0 };

            return (
              <button
                key={org.id}
                type="button"
                onClick={() => setSelectedOrgId(org.id)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl border font-bold text-xs transition-all duration-150 flex items-center gap-2.5 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 border-[#004aad] text-[#004aad] ring-2 ring-[#004aad]/20 shadow-xs'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <div className="w-6 h-6 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-0.5">
                  {org.logoUrl ? (
                    <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-gray-400" />
                  )}
                </div>
                <div className="text-left">
                  <div className="font-bold truncate max-w-[140px]">{org.name}</div>
                  <div className="text-[10px] text-gray-400 font-normal">
                    {orgStat.managers} Yön. • {orgStat.teachers} Öğr.
                  </div>
                </div>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ml-1 ${
                  isSelected ? 'bg-[#004aad] text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                  {orgStat.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Rol Sekmeleri & Filtreleme / Arama Paneli */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        {/* Rol Sekmeleri (Segmented Role Tabs) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedRoleTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedRoleTab === 'ALL'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Tümü ({users.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleTab('ORG_ADMIN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedRoleTab === 'ORG_ADMIN'
                  ? 'bg-blue-50 text-[#004aad] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Kurum Yöneticileri ({stats.orgManagers})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleTab('STAFF')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedRoleTab === 'STAFF'
                  ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Yetkililer ({stats.staffCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleTab('TEACHER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedRoleTab === 'TEACHER'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Öğretmenler ({stats.teachersCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleTab('SUPER_ADMIN')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedRoleTab === 'SUPER_ADMIN'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Süper Adminler ({stats.superAdmins})</span>
            </button>
          </div>

          {/* Sıralama Seçimi */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-400 font-medium">Sırala:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
            >
              <option value="ROLE">Hiyerarşi (Yönetici &gt; Yetkili &gt; Öğretmen)</option>
              <option value="NAME">İsme Göre (A-Z)</option>
              <option value="DATE">En Son Kaydolan</option>
            </select>
          </div>
        </div>

        {/* Arama ve Durum Filtresi */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Arama */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="İsim, kullanıcı adı (@username) veya telefon ile anında ara..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad] focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Durum Filtresi */}
          <div>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad] focus:bg-white"
            >
              <option value="ALL">Tüm Hesap Durumları</option>
              <option value="ACTIVE">Sadece Aktif Hesaplar</option>
              <option value="PASSIVE">Pasif Hesaplar (Giriş Engelli)</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Executive Kullanıcı Tablosu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <span>Kullanıcı Listesi</span>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#004aad] text-[11px] font-black border border-blue-100">
              {filteredUsers.length} Kişi
            </span>
          </div>
          {(selectedOrgId !== 'ALL' || selectedRoleTab !== 'ALL' || searchTerm) && (
            <button
              onClick={() => {
                setSelectedOrgId('ALL');
                setSelectedRoleTab('ALL');
                setSearchTerm('');
              }}
              className="text-xs text-[#004aad] hover:underline font-semibold"
            >
              Tüm Filtreleri Sıfırla
            </button>
          )}
        </div>

        <div className="overflow-x-auto min-w-0 w-full pb-2">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kullanıcı &amp; Profil</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bağlı Kurum</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol &amp; Görev</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hesap Durumu</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kayıt Tarihi</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-sm text-gray-400">
                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-2.5" />
                    <p className="font-semibold text-gray-600">Kullanıcı bulunamadı</p>
                    <p className="text-xs text-gray-400 mt-0.5">Seçtiğiniz kurum veya rol kriterlerine uyan kullanıcı bulunmuyor.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-blue-50/20 transition-colors">
                    {/* 1. Kullanıcı Profil */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#004aad]/10 to-[#004aad]/5 text-[#004aad] font-black flex items-center justify-center text-sm border border-blue-100/80 flex-shrink-0 shadow-xs">
                          {(u.firstName?.[0] || u.username[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-black text-gray-900 flex items-center gap-1.5">
                            {u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : u.username}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-gray-500 font-medium">@{u.username}</span>
                            {u.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gray-300" /> {u.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 2. Bağlı Kurum */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {u.organizationName ? (
                        <div className="inline-flex items-center gap-2 font-bold text-gray-800 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200">
                          {u.orgLogoUrl ? (
                            <img src={u.orgLogoUrl} alt={u.organizationName} className="w-4 h-4 object-contain" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          <span>{u.organizationName}</span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>Platform Genel (Bağımsız)</span>
                        </span>
                      )}
                    </td>

                    {/* 3. Rol & Görev */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(u.role)}
                    </td>

                    {/* 4. Hesap Durumu */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(u.id)}
                        disabled={isPending}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                          u.isActive 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                        }`}
                        title={u.isActive ? 'Hesabı dondur / pasife al' : 'Hesabı aktifleştir'}
                      >
                        <span className={`w-2 h-2 rounded-full ${u.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span>{u.isActive ? 'Aktif' : 'Pasif'}</span>
                      </button>
                    </td>

                    {/* 5. Kayıt Tarihi */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">
                      {new Date(u.createdAt).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    {/* 6. İşlemler */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.role !== 'SUPER_ADMIN' && (
                          <button
                            type="button"
                            onClick={() => {
                              setPermissionUser(u);
                              setPermissionFeedback(null);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#004aad] bg-blue-50 hover:bg-blue-100 rounded-xl transition-all border border-blue-200/80 shadow-xs cursor-pointer active:scale-95"
                            title="Bu kullanıcının hangi platform bölümlerine ulaşabileceğini düzenle"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-[#004aad]" />
                            <span>Yetkiler</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setResetPasswordUser(u);
                            setNewPassword('');
                            setPasswordResetSuccess(null);
                            setPasswordResetError(null);
                          }}
                          className="p-2 text-gray-500 hover:text-[#004aad] hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                          title="Şifreyi Sıfırla"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUser(u);
                            setEditSelectedRole(u.role);
                          }}
                          className="p-2 text-gray-500 hover:text-[#004aad] hover:bg-blue-50 rounded-xl transition-colors cursor-pointer"
                          title="Kullanıcıyı Düzenle"
                        >
                          <Edit className="w-4 h-4" />
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

      {/* YENİ KULLANICI EKLE MODAL */}
      {isAddModalOpen && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="h-2 bg-gradient-to-r from-[#002b66] via-[#004aad] to-blue-500 -mx-6 -mt-6 mb-5" />

            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#004aad]" />
                Yeni Kullanıcı Oluştur
              </h2>
              <button 
                type="button"
                onClick={() => setIsAddModalOpen(false)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action={addAction} className="space-y-4 pt-4">
              {/* Rol Seçimi */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Hesap Rolü &amp; Yetki Seviyesi *</label>
                <select
                  name="role"
                  value={addSelectedRole}
                  onChange={(e) => setAddSelectedRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad] bg-gray-50 focus:bg-white"
                >
                  <option value="ORG_ADMIN">Kurum Yöneticisi (Kurumun tüm yönetimi)</option>
                  <option value="STAFF">Yetkili / Personel (Sınırlı kurum yetkilisi)</option>
                  <option value="TEACHER">Öğretmen (Ders programı ve öğrenci)</option>
                  <option value="SUPER_ADMIN">Süper Admin (Platform genel yöneticisi)</option>
                </select>
              </div>

              {/* Kurum Seçimi */}
              {addSelectedRole !== 'SUPER_ADMIN' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bağlı Olduğu Kurum *</label>
                  <select
                    name="organizationId"
                    required
                    defaultValue={selectedOrgId !== 'ALL' && selectedOrgId !== 'SYSTEM' ? selectedOrgId : ''}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad] bg-gray-50 focus:bg-white"
                  >
                    <option value="">-- Kurum Seçin --</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ad *</label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    placeholder="Ad"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Soyad *</label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    placeholder="Soyad"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Kullanıcı Adı / Giriş E-postası *</label>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="kullanici@kurum.com"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Giriş Şifresi *</label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Telefon Numarası</label>
                <input
                  type="text"
                  name="phone"
                  placeholder="05xx xxx xx xx"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              {addState?.error && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {addState.error}
                </div>
              )}
              {addState?.success && (
                <div className="text-xs text-green-600 bg-green-50 p-3 rounded-xl border border-green-200 flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  {addState.success}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-xl text-sm cursor-pointer"
                >
                  Vazgeç
                </Button>
                <Button
                  type="submit"
                  disabled={isAddPending}
                  className="bg-gradient-to-r from-[#004aad] to-[#003882] text-white rounded-xl text-sm font-bold px-6 shadow-md cursor-pointer"
                >
                  {isAddPending ? 'Oluşturuluyor...' : 'Kullanıcıyı Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* KULLANICI DÜZENLE MODAL */}
      {editingUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="h-2 bg-gradient-to-r from-[#002b66] via-[#004aad] to-blue-500 -mx-6 -mt-6 mb-5" />

            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#004aad]" />
                Kullanıcıyı Düzenle
              </h2>
              <button 
                type="button"
                onClick={() => setEditingUser(null)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action={editAction} className="space-y-4 pt-4">
              <input type="hidden" name="id" value={editingUser.id} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ad *</label>
                  <input
                    type="text"
                    name="firstName"
                    required
                    defaultValue={editingUser.firstName || ''}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Soyad *</label>
                  <input
                    type="text"
                    name="lastName"
                    required
                    defaultValue={editingUser.lastName || ''}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Kullanıcı Adı *</label>
                <input
                  type="text"
                  name="username"
                  required
                  defaultValue={editingUser.username}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Telefon Numarası</label>
                <input
                  type="text"
                  name="phone"
                  defaultValue={editingUser.phone || ''}
                  placeholder="05xx xxx xx xx"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Hesap Rolü &amp; Yetki Seviyesi</label>
                <select
                  name="role"
                  value={editSelectedRole}
                  onChange={(e) => setEditSelectedRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  <option value="ORG_ADMIN">Kurum Yöneticisi</option>
                  <option value="STAFF">Yetkili / Personel</option>
                  <option value="TEACHER">Öğretmen</option>
                  <option value="SUPER_ADMIN">Süper Admin (Kurumsuz / Sistem)</option>
                </select>
              </div>

              {/* Kurum */}
              {editSelectedRole !== 'SUPER_ADMIN' && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bağlı Kurum</label>
                  <select
                    name="organizationId"
                    defaultValue={editingUser.organizationId || ''}
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-gray-50 focus:bg-white"
                  >
                    <option value="">-- Kurum Seçin --</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Aktiflik Durumu */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Hesap Durumu</label>
                <select
                  name="isActive"
                  defaultValue={editingUser.isActive ? 'true' : 'false'}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold bg-gray-50 focus:bg-white"
                >
                  <option value="true">Aktif (Sisteme Giriş Yapabilir)</option>
                  <option value="false">Pasif (Giriş Engellendi)</option>
                </select>
              </div>

              {editState?.error && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {editState.error}
                </div>
              )}
              {editState?.success && (
                <div className="text-xs text-green-600 bg-green-50 p-3 rounded-xl border border-green-200 flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  {editState.success}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl text-sm cursor-pointer"
                >
                  Kapat
                </Button>
                <Button
                  type="submit"
                  disabled={isEditPending}
                  className="bg-gradient-to-r from-[#004aad] to-[#003882] text-white rounded-xl text-sm font-bold px-6 shadow-md cursor-pointer"
                >
                  {isEditPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </Button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* ŞİFRE SIFIRLA MODAL */}
      {resetPasswordUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 overflow-hidden relative animate-in zoom-in-95 duration-200">
            <div className="h-2 bg-gradient-to-r from-[#002b66] via-[#004aad] to-blue-500 -mx-6 -mt-6 mb-5" />

            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <Key className="w-5 h-5 text-[#004aad]" />
                Şifre Sıfırla
              </h2>
              <button 
                type="button"
                onClick={() => setResetPasswordUser(null)} 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4 pt-4">
              <p className="text-xs text-gray-600 leading-relaxed bg-blue-50/60 p-3 rounded-xl border border-blue-100/80">
                <strong className="text-gray-900 font-bold">{resetPasswordUser.firstName} {resetPasswordUser.lastName}</strong> (@{resetPasswordUser.username}) kullanıcısının parolasını doğrudan sıfırlıyorsunuz.
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Yeni Şifre (En az 6 karakter) *</label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Yeni şifreyi yazın..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad]"
                />
              </div>

              {passwordResetError && (
                <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {passwordResetError}
                </div>
              )}
              {passwordResetSuccess && (
                <div className="text-xs text-green-600 bg-green-50 p-3 rounded-xl border border-green-200 flex items-center gap-2 font-medium">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  {passwordResetSuccess}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResetPasswordUser(null)}
                  className="rounded-xl text-sm cursor-pointer"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-[#004aad] to-[#003882] text-white rounded-xl text-sm font-bold px-6 shadow-md cursor-pointer"
                >
                  Şifreyi Güncelle
                </Button>
              </div>
            </form>
          </div>
        </div>
        </ModalPortal>
      )}

      {/* KULLANICI BÖLÜM YETKİLERİ DÜZENLEME MODALI */}
      {permissionUser && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 overflow-hidden relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="h-2 bg-gradient-to-r from-[#002b66] via-[#004aad] to-blue-500 -mx-8 -mt-8 mb-6" />

            {/* Header */}
            <div className="flex justify-between items-start pb-4 border-b border-gray-100">
              <div className="flex items-start gap-3">
                <div className="p-3 rounded-2xl bg-blue-50 text-[#004aad] border border-blue-100 shadow-xs">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">
                      Kullanıcı Bölüm &amp; Yetki Yönetimi
                    </h2>
                    {getRoleBadge(permissionUser.role)}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    <strong>{permissionUser.firstName} {permissionUser.lastName}</strong> ({permissionUser.username}) • {permissionUser.organizationName || 'Kurum'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setPermissionUser(null)} 
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification banner if updated */}
            {permissionFeedback && (
              <div className="mt-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#004aad] text-xs font-bold flex items-center justify-between animate-in fade-in">
                <span>{permissionFeedback}</span>
                <button onClick={() => setPermissionFeedback(null)} className="text-blue-400 hover:text-blue-700 cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Informative info banner */}
            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#004aad] flex-shrink-0" />
                <span>
                  Bu kullanıcının hangi platform bölümlerine ulaşıp hangilerine ulaşamayacağını aşağıdan Açık / Kapalı olarak belirleyin.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleResetUserPermissions(permissionUser)}
                disabled={isPending}
                className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 font-bold text-xs flex items-center gap-1.5 transition-colors flex-shrink-0 shadow-xs cursor-pointer"
                title="Kullanıcıya özel izinleri kaldırıp kurum rol varsayılanına döner"
              >
                <RotateCcw className="w-3.5 h-3.5 text-gray-500" />
                <span>Role Sıfırla</span>
              </button>
            </div>

            {/* Modules List */}
            <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2.5 custom-scrollbar">
              {MODULE_DEFINITIONS.map((mod) => {
                const isEnabled = getUserModuleStatus(permissionUser, mod.key);
                const isCustom = isModuleUserCustom(permissionUser, mod.key);

                return (
                  <div 
                    key={mod.key}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      isEnabled 
                        ? 'bg-blue-50/40 border-blue-200/80 hover:bg-blue-50/70' 
                        : 'bg-gray-50/80 border-gray-200/70 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-xl border flex-shrink-0 ${
                        isEnabled ? 'bg-white border-blue-200 text-[#004aad] shadow-xs' : 'bg-gray-100 border-gray-200 text-gray-400'
                      }`}>
                        {getModuleIcon(mod.key)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm font-bold truncate ${isEnabled ? 'text-gray-900' : 'text-gray-600'}`}>
                            {mod.name}
                          </h4>
                          {isCustom ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-200">
                              Özel İzin
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-gray-500">
                              Rol Standartı
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                          {mod.description}
                        </p>
                      </div>
                    </div>

                    {/* Switch Toggle */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-xs font-bold ${isEnabled ? 'text-[#004aad]' : 'text-gray-400'}`}>
                        {isEnabled ? 'Açık' : 'Kapalı'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleUserPermission(permissionUser, mod.key, isEnabled)}
                        disabled={isPending}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#004aad] focus:ring-offset-2 ${
                          isEnabled ? 'bg-[#004aad]' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
              <Link
                href="/admin/users/permissions"
                className="text-xs font-bold text-[#004aad] hover:underline flex items-center gap-1.5"
              >
                <span>Kurum Rol Yetki Matrisine Git</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Button
                type="button"
                onClick={() => setPermissionUser(null)}
                className="bg-[#004aad] hover:bg-[#003882] text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm cursor-pointer"
              >
                Tamamla &amp; Kapat
              </Button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
