'use client';

import { useActionState, useState } from 'react';
import { createTeacherAction } from './actions';
import { formatPhoneNumber } from '@/lib/utils';
import { User, Lock, Mail, CreditCard, Layers, Phone } from 'lucide-react';

export function TeacherForm({ subjects }: { subjects: any[] }) {
  const [state, formAction, pending] = useActionState(createTeacherAction, null);
  const [isOpen, setIsOpen] = useState(false);
  const [compModel, setCompModel] = useState('');
  const [phoneInput, setPhoneInput] = useState('');

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        + Yeni Öğretmen Ekle
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsOpen(false)}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Yeni Öğretmen Ekle</h3>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>
        
        {/* Form Body */}
        <div className="p-6 md:p-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
          <form action={formAction} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ad & Soyad */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Ad</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input type="text" name="firstName" required className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" placeholder="Ahmet" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Soyad</label>
                <input type="text" name="lastName" required className="w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" placeholder="Yılmaz" />
              </div>

              {/* Cinsiyet & Branş */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cinsiyet</label>
                <select name="gender" required className="w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm">
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
                  <select name="subjectId" required className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm">
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
                  <input type="text" name="username" required className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" placeholder="ahmet123" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Şifre</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input type="text" name="password" required className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" placeholder="Şifre belirleyin" />
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
                  <input type="number" name="compensationRate" required className="w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" placeholder="Örn: 500" />
                </div>
              )}
            </div>

            {state?.error && <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-2"><span className="font-bold">Hata:</span> {state.error}</div>}
            {state?.success && <div className="text-sm text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex items-center gap-2"><span className="font-bold">Başarılı:</span> {state.success}</div>}

            <div className="flex justify-end gap-3 pt-6 mt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="px-6 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all"
              >
                İptal
              </button>
              <button 
                type="submit" 
                disabled={pending} 
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
              >
                {pending ? 'Kaydediliyor...' : 'Öğretmeni Kaydet'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
