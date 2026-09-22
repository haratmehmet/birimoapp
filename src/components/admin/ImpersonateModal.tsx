'use client';

import { useState } from 'react';
import { 
  Building2, 
  LogIn, 
  X, 
  AlertTriangle, 
  ShieldCheck, 
  CheckCircle2, 
  Info,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { impersonateOrganizationAction } from '@/app/(dashboard)/organizations/actions';
import { ModalPortal } from '@/components/ui/ModalPortal';

export interface ImpersonateTargetOrg {
  id: string;
  name: string;
  logoUrl?: string | null;
  adminName?: string | null;
}

interface ImpersonateModalProps {
  isOpen: boolean;
  onClose: () => void;
  org: ImpersonateTargetOrg | null;
}

export function ImpersonateModal({ isOpen, onClose, org }: ImpersonateModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !org) return null;

  const handleStartImpersonation = async () => {
    setStatus('loading');
    setErrorMessage(null);

    try {
      const res = await impersonateOrganizationAction(org.id);

      if (res?.error) {
        setStatus('error');
        setErrorMessage(res.error);
        return;
      }

      setStatus('success');
      // Smooth visual transition before reloading to the new organization context
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 700);
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err?.message || 'Kurum paneline bağlanırken beklenmeyen bir hata oluştu.');
    }
  };

  const handleModalClose = () => {
    if (status === 'loading') return; // Prevent closing while processing
    setStatus('idle');
    setErrorMessage(null);
    onClose();
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 overflow-hidden relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Header Accent - Signature MentorOS Blue */}
        <div className="h-2 bg-gradient-to-r from-[#002b66] via-[#004aad] to-blue-500 w-full" />

        {/* Close Button */}
        {status !== 'loading' && (
          <button
            onClick={handleModalClose}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-6">
          {/* Status: IDLE */}
          {status === 'idle' && (
            <div className="space-y-5">
              {/* Header Icon & Title */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#004aad] flex-shrink-0 shadow-sm">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">
                    Kurumu Ziyaret Et
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Kurum yöneticisi olarak sisteme tam yetkili bağlanma
                  </p>
                </div>
              </div>

              {/* Target Institution Badge Card */}
              <div className="bg-gradient-to-br from-blue-50/70 via-indigo-50/40 to-blue-50/50 rounded-2xl p-4 border border-blue-200/70 flex items-center gap-3.5 shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-white border border-blue-200/80 flex items-center justify-center overflow-hidden flex-shrink-0 p-1 shadow-xs">
                  {org.logoUrl ? (
                    <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-6 h-6 text-[#004aad]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {org.name}
                  </div>
                  <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-blue-100/90 text-[#004aad] text-[10px] font-extrabold rounded-md uppercase tracking-wide">
                    <Sparkles className="w-3 h-3 text-[#004aad]" />
                    <span>Yönetici Modu (Tam Yetki)</span>
                  </div>
                </div>
              </div>

              {/* Explanatory Info */}
              <div className="text-xs text-gray-600 space-y-2 leading-relaxed bg-gray-50/80 rounded-xl p-3.5 border border-gray-100">
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#004aad]" />
                  Bu işlemle birlikte neler yapabilirsiniz?
                </p>
                <ul className="space-y-1.5 pl-3 list-disc text-gray-600">
                  <li>Öğrenci, öğretmen ve ders programlarına doğrudan müdahale</li>
                  <li>Yoklamalar, finans/hakedişler ve kurum ayarlarını yönetme</li>
                  <li>Tıpkı kurumun asıl yöneticisi gibi işlem gerçekleştirme</li>
                </ul>
              </div>

              {/* Safety notice */}
              <div className="flex items-start gap-2 text-[11px] text-[#003882] bg-blue-50/80 rounded-xl p-3 border border-blue-100/80">
                <Info className="w-4 h-4 text-[#004aad] flex-shrink-0 mt-0.5" />
                <span>
                  Ekranın üstündeki mavi çubukta yer alan <strong>"Süper Admin Paneline Dön"</strong> butonu ile dilediğiniz an tek tıkla geri dönebilirsiniz.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleStartImpersonation}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#004aad] via-[#003882] to-[#002b66] hover:from-[#003882] hover:to-[#002250] text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Yetkili Olarak Bağlan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Status: LOADING */}
          {status === 'loading' && (
            <div className="py-8 px-4 flex flex-col items-center text-center space-y-4">
              <div className="relative flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-[#004aad] animate-spin" />
                <div className="absolute">
                  <Building2 className="w-7 h-7 text-[#004aad] animate-pulse" />
                </div>
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900">
                  Kurum Paneline Bağlanılıyor...
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-xs">
                  <strong>{org.name}</strong> yöneticisi yetkileri oturumunuza tanımlanıyor. Lütfen bekleyiniz...
                </p>
              </div>
              <div className="w-48 bg-blue-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#004aad] h-full w-2/3 animate-pulse" />
              </div>
            </div>
          )}

          {/* Status: SUCCESS */}
          {status === 'success' && (
            <div className="py-8 px-4 flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                <CheckCircle2 className="w-9 h-9 animate-bounce" />
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900">
                  Bağlantı Başarılı!
                </h4>
                <p className="text-xs text-gray-500 mt-1">
                  <strong>{org.name}</strong> yönetim paneline aktarılıyorsunuz...
                </p>
              </div>
            </div>
          )}

          {/* Status: ERROR */}
          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Bağlantı Kurulamadı</h4>
                  <p className="text-xs text-gray-500">İşlem sırasında bir sorun oluştu</p>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 text-xs text-red-700 font-medium leading-relaxed">
                {errorMessage || 'Kurum paneline bağlanırken beklenmeyen bir hata oluştu.'}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
                >
                  Kapat
                </button>
                <button
                  type="button"
                  onClick={handleStartImpersonation}
                  className="px-4 py-2 rounded-xl bg-[#004aad] hover:bg-[#003882] text-white text-xs font-bold transition-colors shadow-sm"
                >
                  Tekrar Dene
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
    </ModalPortal>
  );
}
