'use client';

import { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Building2, 
  User, 
  Lock, 
  Settings, 
  Clock, 
  Calendar,
  Eye, 
  X, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Globe, 
  Laptop, 
  Smartphone,
  ChevronRight,
  Shield,
  LayoutDashboard,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Activity,
  ArrowUpDown,
  Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ModalPortal } from '@/components/ui/ModalPortal';

export interface LogItem {
  id: string;
  organizationId: string | null;
  organizationName: string | null;
  orgLogoUrl?: string | null;
  userId: string | null;
  userName: string | null;
  action: string;
  category: string;
  panel: string | null;
  status: string; // 'SUCCESS' | 'ERROR' | 'WARNING'
  details: string | null;
  errorDetails: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date | string;
}

export interface OrgItem {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface AdminLogsClientProps {
  logs: LogItem[];
  organizations?: OrgItem[];
}

export function AdminLogsClient({ logs, organizations = [] }: AdminLogsClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL'); // 'ALL' | 'ERROR' | 'SUCCESS' | 'WARNING'
  const [selectedPanelFilter, setSelectedPanelFilter] = useState('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Merge organizations from props and from logs
  const allOrgsList = useMemo(() => {
    const orgMap = new Map<string, { id: string; name: string; logoUrl?: string | null }>();
    
    // First from organizations prop
    for (const org of organizations) {
      orgMap.set(org.id, { id: org.id, name: org.name, logoUrl: org.logoUrl });
    }
    
    // Then from logs if any missing
    for (const l of logs) {
      if (l.organizationId && l.organizationName && !orgMap.has(l.organizationId)) {
        orgMap.set(l.organizationId, {
          id: l.organizationId,
          name: l.organizationName,
          logoUrl: l.orgLogoUrl,
        });
      }
    }
    
    return Array.from(orgMap.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [organizations, logs]);

  // Per-organization log counts and system counts
  const { orgStatsMap, systemLogsCount, systemErrorCount } = useMemo(() => {
    const map: Record<string, { total: number; errors: number; successes: number; warnings: number }> = {};
    let sysTotal = 0;
    let sysErrors = 0;

    for (const org of allOrgsList) {
      map[org.id] = { total: 0, errors: 0, successes: 0, warnings: 0 };
    }

    for (const l of logs) {
      if (!l.organizationId) {
        sysTotal++;
        if (l.status === 'ERROR') sysErrors++;
      } else {
        if (!map[l.organizationId]) {
          map[l.organizationId] = { total: 0, errors: 0, successes: 0, warnings: 0 };
        }
        map[l.organizationId].total++;
        if (l.status === 'ERROR') map[l.organizationId].errors++;
        else if (l.status === 'SUCCESS') map[l.organizationId].successes++;
        else if (l.status === 'WARNING') map[l.organizationId].warnings++;
      }
    }

    return { orgStatsMap: map, systemLogsCount: sysTotal, systemErrorCount: sysErrors };
  }, [allOrgsList, logs]);

  const activeOrgName = useMemo(() => {
    if (selectedOrgFilter === 'ALL') return 'Tüm Kurumlar';
    if (selectedOrgFilter === 'SYSTEM') return 'Sistem Genel (Kurumsuz)';
    const found = allOrgsList.find(o => o.id === selectedOrgFilter);
    return found ? found.name : 'Seçili Kurum';
  }, [selectedOrgFilter, allOrgsList]);

  // Statistics calculation based on active organization filter
  const stats = useMemo(() => {
    let targetLogs = logs;
    if (selectedOrgFilter === 'SYSTEM') {
      targetLogs = logs.filter(l => l.organizationId === null);
    } else if (selectedOrgFilter !== 'ALL') {
      targetLogs = logs.filter(l => l.organizationId === selectedOrgFilter);
    }

    let errorCount = 0;
    let successCount = 0;
    let authCount = 0;
    let orgOpsCount = 0;

    for (const l of targetLogs) {
      if (l.status === 'ERROR') errorCount++;
      else if (l.status === 'SUCCESS') successCount++;

      if (l.category === 'AUTH') authCount++;
      else if (l.category === 'ORGANIZATION') orgOpsCount++;
    }

    return {
      total: targetLogs.length,
      errorCount,
      successCount,
      authCount,
      orgOpsCount,
      globalTotal: logs.length,
    };
  }, [logs, selectedOrgFilter]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const q = searchTerm.toLowerCase();
      const matchesSearch = 
        !searchTerm ||
        (log.userName && log.userName.toLowerCase().includes(q)) ||
        log.action.toLowerCase().includes(q) ||
        (log.details && log.details.toLowerCase().includes(q)) ||
        (log.errorDetails && log.errorDetails.toLowerCase().includes(q)) ||
        (log.organizationName && log.organizationName.toLowerCase().includes(q)) ||
        (log.panel && log.panel.toLowerCase().includes(q)) ||
        (log.ipAddress && log.ipAddress.includes(q));

      const matchesStatus = 
        selectedStatusFilter === 'ALL' ? true :
        log.status === selectedStatusFilter;

      const matchesPanel = 
        selectedPanelFilter === 'ALL' ? true :
        log.panel === selectedPanelFilter;

      const matchesCategory = 
        selectedCategoryFilter === 'ALL' ? true :
        log.category.toUpperCase() === selectedCategoryFilter;

      const matchesOrg = 
        selectedOrgFilter === 'ALL' ? true :
        selectedOrgFilter === 'SYSTEM' ? log.organizationId === null :
        log.organizationId === selectedOrgFilter;

      return matchesSearch && matchesStatus && matchesPanel && matchesCategory && matchesOrg;
    });
  }, [logs, searchTerm, selectedStatusFilter, selectedPanelFilter, selectedCategoryFilter, selectedOrgFilter]);

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-red-50 text-red-700 border border-red-200/80 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
            <XCircle className="w-3.5 h-3.5 text-red-600" />
            <span>Hata</span>
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-amber-50 text-amber-800 border border-amber-200 shadow-xs">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>Uyarı</span>
          </span>
        );
      case 'SUCCESS':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Başarılı</span>
          </span>
        );
    }
  };

  const getPanelBadge = (panel: string | null) => {
    if (!panel) return <span className="text-gray-400 text-xs font-medium">-</span>;
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-[#004aad] border border-blue-100">
        <LayoutDashboard className="w-3.5 h-3.5 text-[#004aad]" />
        <span>{panel}</span>
      </span>
    );
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setSelectedStatusFilter('ALL');
    setSelectedPanelFilter('ALL');
    setSelectedCategoryFilter('ALL');
    setSelectedOrgFilter('ALL');
  };

  const isFiltered = searchTerm || selectedStatusFilter !== 'ALL' || selectedPanelFilter !== 'ALL' || selectedCategoryFilter !== 'ALL' || selectedOrgFilter !== 'ALL';

  return (
    <div className="space-y-6">
      {/* 1. Executive Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/70 p-6 rounded-2xl border border-white/80 shadow-sm backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-[#004aad] text-[11px] font-bold uppercase tracking-wide border border-blue-100">
              Sistem Denetimi &amp; Güvenlik
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2.5 mt-1.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-[#004aad] to-[#003882] text-white shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>
            Sistem ve Güvenlik Logları (Audit Log)
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-gray-500 max-w-2xl leading-relaxed">
            Hangi kurumdan, hangi saatte, kimin hangi panele girdiği ve sistemde ne tarz sorun/hata yaşandığına dair ayrıntılı güvenlik denetim günlüğü.
          </p>
        </div>

        {isFiltered && (
          <Button
            variant="outline"
            onClick={resetAllFilters}
            className="rounded-xl text-xs font-bold flex items-center gap-1.5 border-gray-200 text-gray-700 hover:bg-gray-50 shadow-xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Filtreleri Temizle
          </Button>
        )}
      </div>

      {/* 2. Executive KPI Metric Strip (Interactive Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Toplam Log */}
        <div
          onClick={() => {
            setSelectedStatusFilter('ALL');
            setSelectedCategoryFilter('ALL');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group bg-white shadow-sm hover:shadow-md ${
            selectedStatusFilter === 'ALL' && selectedCategoryFilter === 'ALL'
              ? 'border-[#004aad] ring-2 ring-[#004aad]/20'
              : 'border-gray-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider group-hover:text-[#004aad] transition-colors">
              Toplam Olay
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#004aad]">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{stats.total}</span>
            <span className="text-xs text-gray-400">kayıtlı olay</span>
          </div>
        </div>

        {/* Card 2: Hatalar & Sorunlar */}
        <div
          onClick={() => setSelectedStatusFilter('ERROR')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group bg-white shadow-sm hover:shadow-md ${
            selectedStatusFilter === 'ERROR'
              ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/20'
              : 'border-gray-100 hover:border-red-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-red-500 uppercase tracking-wider">
              Hatalar &amp; Sorunlar
            </span>
            <div className="p-2 rounded-xl bg-red-50 text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-600">{stats.errorCount}</span>
            <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-md">
              Müdahale Gerekebilir
            </span>
          </div>
        </div>

        {/* Card 3: Başarılı İşlemler */}
        <div
          onClick={() => setSelectedStatusFilter('SUCCESS')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group bg-white shadow-sm hover:shadow-md ${
            selectedStatusFilter === 'SUCCESS'
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
              : 'border-gray-100 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider group-hover:text-emerald-700 transition-colors">
              Başarılı İşlemler
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{stats.successCount}</span>
            <span className="text-xs text-gray-400">sorunsuz akış</span>
          </div>
        </div>

        {/* Card 4: Giriş & Güvenlik Olayları */}
        <div
          onClick={() => setSelectedCategoryFilter('AUTH')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer group bg-white shadow-sm hover:shadow-md ${
            selectedCategoryFilter === 'AUTH'
              ? 'border-[#004aad] ring-2 ring-[#004aad]/20 bg-blue-50/30'
              : 'border-gray-100 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider group-hover:text-[#004aad] transition-colors">
              Giriş &amp; Güvenlik
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#004aad]">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#004aad]">{stats.authCount}</span>
            <span className="text-xs text-gray-400">oturum hareketi</span>
          </div>
        </div>
      </div>

      {/* 3. Executive Kurum Seçici (Kurum Kutuları / Institution Cards Strip) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#004aad]" />
              <span>Kurum Bazlı Sistem &amp; Güvenlik Logları</span>
            </h2>
            <p className="text-[11px] text-gray-400 mt-0.5">
              İstediğiniz kuruma tıklayarak sadece o kurumda yaşanan oturum açma, hata ve sistem hareketlerini inceleyin.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Seçili Kurum:</span>
            <strong className="text-[#004aad] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 flex items-center gap-1.5 font-bold">
              {activeOrgName}
              {selectedOrgFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedOrgFilter('ALL')}
                  className="hover:text-red-600 transition-colors ml-1 p-0.5 rounded-full hover:bg-red-50 cursor-pointer"
                  title="Kurum Filtresini Temizle"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </strong>
          </div>
        </div>

        {/* Kurum Kutuları Şeridi (Interactive Cards) */}
        <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 custom-scrollbar">
          {/* Kutu 1: Tüm Kurumlar */}
          <button
            type="button"
            onClick={() => setSelectedOrgFilter('ALL')}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all duration-150 flex items-center gap-3 cursor-pointer ${
              selectedOrgFilter === 'ALL'
                ? 'bg-[#004aad] text-white border-[#004aad] shadow-sm ring-2 ring-[#004aad]/20'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${selectedOrgFilter === 'ALL' ? 'bg-white/20' : 'bg-white border border-gray-200 text-[#004aad]'}`}>
              <Users className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-bold">Tüm Kurumlar</div>
              <div className={`text-[10px] ${selectedOrgFilter === 'ALL' ? 'text-white/80' : 'text-gray-400'}`}>
                Platform Geneli
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ml-1 ${
              selectedOrgFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {logs.length}
            </span>
          </button>

          {/* Kutu 2: Sistem Genel (Kurumsuz) */}
          <button
            type="button"
            onClick={() => setSelectedOrgFilter('SYSTEM')}
            className={`flex-shrink-0 px-4 py-2.5 rounded-xl border font-bold text-xs transition-all duration-150 flex items-center gap-3 cursor-pointer ${
              selectedOrgFilter === 'SYSTEM'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm ring-2 ring-slate-900/20'
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
            }`}
          >
            <div className={`p-1.5 rounded-lg ${selectedOrgFilter === 'SYSTEM' ? 'bg-white/20' : 'bg-white border border-gray-200 text-slate-700'}`}>
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="font-bold">Sistem Genel</div>
              <div className={`text-[10px] ${selectedOrgFilter === 'SYSTEM' ? 'text-white/80' : 'text-gray-400'}`}>
                Süper Admin &amp; Çekirdek
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ml-1 ${
              selectedOrgFilter === 'SYSTEM' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              {systemLogsCount}
            </span>
          </button>

          {/* Kurum Kutuları */}
          {allOrgsList.map(org => {
            const isSelected = selectedOrgFilter === org.id;
            const orgLogStat = orgStatsMap[org.id] || { total: 0, errors: 0, successes: 0, warnings: 0 };

            return (
              <button
                key={org.id}
                type="button"
                onClick={() => setSelectedOrgFilter(org.id)}
                className={`flex-shrink-0 px-3.5 py-2 rounded-xl border font-bold text-xs transition-all duration-150 flex items-center gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/80 border-[#004aad] text-[#004aad] ring-2 ring-[#004aad]/20 shadow-xs'
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
                <div className="text-left">
                  <div className="font-bold truncate max-w-[150px]">{org.name}</div>
                  <div className="flex items-center gap-1.5 text-[10px] font-normal mt-0.5">
                    {orgLogStat.errors > 0 ? (
                      <span className="text-red-600 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping inline-block" />
                        {orgLogStat.errors} Hata
                      </span>
                    ) : (
                      <span className="text-emerald-600 font-medium">0 Hata</span>
                    )}
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-400">{orgLogStat.total} Olay</span>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ml-1 ${
                  isSelected ? 'bg-[#004aad] text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                  {orgLogStat.total}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Filtreler & Segmented Tabs Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        {/* Segmented Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100">
          <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatusFilter === 'ALL'
                  ? 'bg-white text-gray-900 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Tüm Durumlar ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('ERROR')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatusFilter === 'ERROR'
                  ? 'bg-red-50 text-red-700 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              <span>Sadece Hatalar ({stats.errorCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedStatusFilter('SUCCESS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatusFilter === 'SUCCESS'
                  ? 'bg-emerald-50 text-emerald-800 shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sadece Başarılılar ({stats.successCount})</span>
            </button>
          </div>

          <div className="text-xs text-gray-400 font-medium flex items-center gap-2">
            <span>Listelenen:</span>
            <strong className="text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md font-bold">
              {filteredLogs.length} Olay
            </strong>
          </div>
        </div>

        {/* Search & Secondary Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Arama Input */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Kullanıcı, kurum, hata mesajı veya IP ara..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad] focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Panel Filtresi */}
          <div>
            <select
              value={selectedPanelFilter}
              onChange={(e) => setSelectedPanelFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad] focus:bg-white"
            >
              <option value="ALL">Tüm Paneller</option>
              <option value="Giriş Ekranı">Giriş Ekranı (Login)</option>
              <option value="Kurum Paneli">Kurum Paneli</option>
              <option value="Öğretmen Paneli">Öğretmen Paneli</option>
              <option value="Süper Admin Paneli">Süper Admin Paneli</option>
            </select>
          </div>

          {/* Kurum Filtresi (Dropdown) */}
          <div>
            <select
              value={selectedOrgFilter}
              onChange={(e) => setSelectedOrgFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#004aad]/20 focus:border-[#004aad] focus:bg-white"
            >
              <option value="ALL">Tüm Kurumlar ({logs.length})</option>
              <option value="SYSTEM">Sistem Genel ({systemLogsCount})</option>
              {allOrgsList.map(org => {
                const count = orgStatsMap[org.id]?.total || 0;
                return (
                  <option key={org.id} value={org.id}>
                    {org.name} ({count} olay)
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Aktif Kurum Bildirim Şeridi */}
      {selectedOrgFilter !== 'ALL' && (
        <div className="flex items-center justify-between bg-blue-50/70 border border-blue-200/80 px-4 py-3 rounded-2xl text-xs shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-[#004aad] font-medium">
            <Building2 className="w-4 h-4 text-[#004aad] flex-shrink-0" />
            <span>
              Şu anda <strong>&quot;{activeOrgName}&quot;</strong> kurumuna ait sistem logları listeleniyor (Toplam <strong>{filteredLogs.length}</strong> olay).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedOrgFilter('ALL')}
            className="text-xs font-bold text-[#004aad] hover:text-[#003882] hover:underline flex items-center gap-1.5 cursor-pointer ml-3 flex-shrink-0"
          >
            <span>Tüm Kurumları Göster</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 4. Executive Denetim Tablosu */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto min-w-0 w-full pb-2">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hangi Saatte (Zaman)</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hangi Kurum</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kim Girmiş / Kullanıcı</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Hangi Panel</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Olay &amp; Yaşanan Sorun</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-sm text-gray-400">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-2.5" />
                    <p className="font-semibold text-gray-600">Sistem logu bulunamadı</p>
                    <p className="text-xs text-gray-400 mt-0.5">Seçtiğiniz arama veya filtre kriterlerine uyan kayıt bulunmuyor.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateObj = new Date(log.createdAt);
                  const timeStr = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
                  const isError = log.status === 'ERROR';

                  return (
                    <tr 
                      key={log.id} 
                      className={`hover:bg-blue-50/20 transition-colors cursor-pointer ${isError ? 'bg-red-50/15' : ''}`}
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Zaman */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        <div className="font-black text-gray-900 flex items-center gap-1.5 font-mono">
                          <Clock className="w-3.5 h-3.5 text-[#004aad]" />
                          {timeStr}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{dateStr}</div>
                      </td>

                      {/* Kurum */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {log.organizationName ? (
                          <div className="inline-flex items-center gap-2 font-bold text-gray-800 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200">
                            {log.orgLogoUrl ? (
                              <img src={log.orgLogoUrl} alt={log.organizationName} className="w-4 h-4 object-contain" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            )}
                            <span className="truncate max-w-[130px]">{log.organizationName}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
                            <Shield className="w-3.5 h-3.5 text-blue-600" />
                            <span>Sistem Genel</span>
                          </span>
                        )}
                      </td>

                      {/* Kullanıcı */}
                      <td className="px-6 py-4 whitespace-nowrap text-xs">
                        {log.userName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#004aad] font-black flex items-center justify-center text-xs border border-blue-100">
                              {log.userName[0]?.toUpperCase() || 'U'}
                            </div>
                            <span className="font-bold text-gray-900">{log.userName}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Anonim Girişim</span>
                        )}
                      </td>

                      {/* Panel */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getPanelBadge(log.panel)}
                      </td>

                      {/* Durum */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(log.status)}
                      </td>

                      {/* Olay & Yaşanan Sorun */}
                      <td className="px-6 py-4 text-xs max-w-sm">
                        <div className="font-bold text-gray-900 truncate" title={log.details || log.action}>
                          {log.details || log.action}
                        </div>
                        {log.errorDetails && (
                          <div className="text-[11px] font-semibold text-red-600 truncate mt-1 flex items-center gap-1 bg-red-50 px-2 py-0.5 rounded-md border border-red-100" title={log.errorDetails}>
                            <AlertTriangle className="w-3 h-3 flex-shrink-0 text-red-600" />
                            <span>{log.errorDetails}</span>
                          </div>
                        )}
                      </td>

                      {/* İşlem */}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#004aad] rounded-lg transition-colors font-bold cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>İncele</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ZENGİN LOG VE SORUN İNCELEME MODALI */}
      {selectedLog && (
        <ModalPortal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 max-h-[92vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
            {/* Top Accent Strip */}
            <div className={`h-2 ${selectedLog.status === 'ERROR' ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-500' : 'bg-gradient-to-r from-[#002b66] via-[#004aad] to-blue-500'} -mx-6 -mt-6 mb-5`} />

            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${selectedLog.status === 'ERROR' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-blue-50 text-[#004aad] border border-blue-200'}`}>
                  {selectedLog.status === 'ERROR' ? <AlertTriangle className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-base font-black text-gray-900">Log Ayrıntısı ve Sorun Raporu</h2>
                  <p className="text-xs text-gray-400 font-mono">ID: {selectedLog.id}</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedLog(null)} 
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 pt-4 text-xs">
              {/* YAŞANAN SORUN / HATA BİLGİSİ (ÖNCELİKLİ ALAN) */}
              {selectedLog.errorDetails ? (
                <div className="p-4 bg-red-50/90 border border-red-200 rounded-2xl space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-1.5 text-red-800 font-black text-xs uppercase tracking-wide">
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span>Yaşanan Sorun &amp; Hata Detayı:</span>
                  </div>
                  <p className="text-sm font-bold text-red-950 leading-relaxed">
                    {selectedLog.errorDetails}
                  </p>
                </div>
              ) : selectedLog.status === 'SUCCESS' ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>İşlem hatasız ve başarılı bir şekilde tamamlanmıştır.</span>
                </div>
              ) : null}

              {/* TEMEL BİLGİLER TABLOSU */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50/80 rounded-2xl border border-gray-100">
                <div>
                  <span className="text-gray-400 text-[11px] block font-semibold">Hangi Saatte Girmiş / Zaman:</span>
                  <span className="font-black text-gray-900 text-sm font-mono mt-0.5 block">
                    {new Date(selectedLog.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <span className="text-[11px] text-gray-500 block">
                    {new Date(selectedLog.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 text-[11px] block font-semibold">Hangi Panele Girmiş:</span>
                  <div className="mt-1">
                    {getPanelBadge(selectedLog.panel)}
                  </div>
                </div>

                <div>
                  <span className="text-gray-400 text-[11px] block font-semibold">Kim Girmiş / Kullanıcı:</span>
                  <span className="font-bold text-gray-900 text-sm block mt-0.5">
                    {selectedLog.userName || 'Anonim / Sistem'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 text-[11px] block font-semibold">Hangi Kurum:</span>
                  <span className="font-bold text-gray-900 text-sm block mt-0.5">
                    {selectedLog.organizationName || 'Sistem Genel / Kurumsuz'}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 text-[11px] block font-semibold">İşlem Türü (Action):</span>
                  <span className="font-mono text-xs font-black text-[#004aad] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 inline-block mt-0.5">
                    {selectedLog.action}
                  </span>
                </div>

                <div>
                  <span className="text-gray-400 text-[11px] block font-semibold">İşlem Durumu:</span>
                  <div className="mt-0.5">{getStatusBadge(selectedLog.status)}</div>
                </div>
              </div>

              {/* IP ADRESİ VE TARAYICI BİLGİSİ */}
              <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-2">
                <span className="text-gray-600 font-bold block uppercase tracking-wider text-[10px]">
                  İstemci &amp; Güvenlik Bilgileri:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[11px] font-semibold">IP Adresi:</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-gray-900">{selectedLog.ipAddress || '127.0.0.1 (Yerel)'}</span>
                      {selectedLog.ipAddress && (
                        <button
                          type="button"
                          onClick={() => copyToClipboard(selectedLog.ipAddress!, 'ip')}
                          className="p-1 text-gray-400 hover:text-[#004aad] transition-colors"
                          title="IP Adresini Kopyala"
                        >
                          {copiedField === 'ip' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[11px] font-semibold">Cihaz / Tarayıcı (User Agent):</span>
                    <span className="font-mono text-[10px] text-gray-600 truncate block mt-0.5" title={selectedLog.userAgent || ''}>
                      {selectedLog.userAgent || 'Tarayıcı bilgisi alınamadı'}
                    </span>
                  </div>
                </div>
              </div>

              {/* TEKNİK DETAY / SİSTEM MESAJI */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600 font-bold block">Olay &amp; Sistem Mesajı:</span>
                  {selectedLog.details && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedLog.details!, 'details')}
                      className="text-[11px] text-[#004aad] hover:underline flex items-center gap-1 font-semibold"
                    >
                      {copiedField === 'details' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedField === 'details' ? 'Kopyalandı' : 'Metni Kopyala'}</span>
                    </button>
                  )}
                </div>
                <div className="p-3.5 bg-gray-50 text-gray-800 rounded-xl text-xs whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed border border-gray-200 font-medium">
                  {selectedLog.details || 'Açıklama girilmemiş.'}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100 mt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl text-xs px-6 font-bold cursor-pointer"
              >
                Kapat
              </Button>
            </div>
          </div>
        </div>
        </ModalPortal>
      )}
    </div>
  );
}
