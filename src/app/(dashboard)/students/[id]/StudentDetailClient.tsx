'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Phone, BookOpen, Clock, Wallet, CheckCircle2, XCircle, PackagePlus, Trash2, Pencil, Banknote, RotateCcw, Archive } from 'lucide-react';
import { formatPhoneNumber } from '@/lib/utils';
import { addPackageAction, deletePackageAction, updatePackageHoursAction, addPaymentAction, restoreStudentAction } from '../actions';

export function StudentDetailClient({ student, packages, plannedSchedules = [], isTeacher = false }: { student: any, packages: any[], plannedSchedules?: any[], isTeacher?: boolean }) {
  const router = useRouter();
  const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
  const [packageHoursInput, setPackageHoursInput] = useState('');
  const [packageHourlyRateInput, setPackageHourlyRateInput] = useState('');
  
  const [deletePackageId, setDeletePackageId] = useState<string | null>(null);
  const [editPackageId, setEditPackageId] = useState<string | null>(null);
  const [editPackageHoursInput, setEditPackageHoursInput] = useState('');
  
  const [paymentPackageId, setPaymentPackageId] = useState<string | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  
  const [isPending, setIsPending] = useState(false);

  const handleAddPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageHoursInput) return;
    setIsPending(true);
    await addPackageAction(student.id, parseInt(packageHoursInput, 10), packageHourlyRateInput);
    setIsPending(false);
    setIsPackageModalOpen(false);
    setPackageHoursInput('');
    setPackageHourlyRateInput('');
    router.refresh();
  };

  const handleDeletePackage = async () => {
    if (!deletePackageId) return;
    setIsPending(true);
    await deletePackageAction(deletePackageId);
    setIsPending(false);
    setDeletePackageId(null);
    router.refresh();
  };

  const handleEditPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPackageId || !editPackageHoursInput) return;
    setIsPending(true);
    const res = await updatePackageHoursAction(editPackageId, parseInt(editPackageHoursInput, 10));
    if (res?.error) {
      alert("Hata: " + res.error);
    }
    setIsPending(false);
    setEditPackageId(null);
    setEditPackageHoursInput('');
    router.refresh();
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentPackageId || !paymentAmountInput) return;
    setIsPending(true);
    await addPaymentAction(paymentPackageId, parseFloat(paymentAmountInput));
    setIsPending(false);
    setPaymentPackageId(null);
    setPaymentAmountInput('');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2 text-gray-500 hover:text-primary hover:bg-indigo-50 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#004aad] tracking-tight">Öğrenci Detayı</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">
            Öğrencinin tüm bilgilerini ve eğitim paketlerini buradan yönetebilirsiniz.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sol Kolon: Öğrenci Bilgileri */}
        <div className="lg:col-span-1 space-y-6 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="flex items-center gap-4 mb-6 relative">
              <img src="/images/student.png" alt="Öğrenci" className="w-16 h-16 rounded-full bg-indigo-50 border-2 border-white shadow-sm shrink-0 object-contain p-2" />
              <div>
                <h2 className="text-xl font-bold text-gray-900">{student.firstName} {student.lastName}</h2>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {student.isArchived ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Havuzda (Arşiv)
                    </span>
                  ) : student.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Aktif Öğrenci
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                      Pasif
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400">Telefon</p>
                  <p className="font-semibold text-gray-800">{student.phone ? formatPhoneNumber(student.phone) : '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400">Veli Bilgisi</p>
                  <p className="font-semibold text-gray-800">{student.parentName || '-'}</p>
                  {student.parentPhone && (
                    <p className="text-xs text-gray-500 mt-0.5">{formatPhoneNumber(student.parentPhone)}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400">Eğitim Durumu</p>
                  <p className="font-semibold text-gray-800">
                    {student.educationLevel || '-'} {student.grade ? `(${student.grade}. Sınıf)` : ''}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400">Kayıt Tarihi</p>
                  <p className="font-semibold text-gray-800">
                    {new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(student.createdAt))}
                  </p>
                </div>
              </div>
            </div>

            {student.isArchived && (
              <div className="pt-4 border-t border-gray-100 mt-4">
                <button
                  onClick={async () => {
                    if (window.confirm(`${student.firstName} ${student.lastName} isimli öğrenciyi aktif listeye geri yüklemek istediğinize emin misiniz?`)) {
                      setIsPending(true);
                      await restoreStudentAction(student.id);
                      setIsPending(false);
                      router.refresh();
                    }
                  }}
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl text-xs transition-colors border border-emerald-200 shadow-sm disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  {isPending ? 'Yükleniyor...' : 'Havuzdan Geri Yükle'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sağ Kolon: Paketler */}
        <div className="lg:col-span-3 space-y-6 min-w-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-w-0">
            <div className="p-4 lg:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-500" />
                {isTeacher ? 'Eğitim Paketleri & Kalan Süre' : 'Anlaşma Fiyatları & Eğitim Paketleri'}
              </h3>
              {!isTeacher && (
                <button
                  onClick={() => setIsPackageModalOpen(true)}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                >
                  <PackagePlus className="w-4 h-4" />
                  Yeni Paket
                </button>
              )}
            </div>
            
            <div className="p-0">
              {/* Mobile View: Cards */}
              <div className="md:hidden space-y-4 p-4">
                {packages.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="font-medium text-sm text-gray-500">Öğrenciye ait eğitim paketi bulunmuyor.</p>
                  </div>
                ) : (
                  packages.map((pkg) => {
                    const totalMins = parseInt(pkg.totalMinutes, 10);
                    const consumedMins = parseInt(pkg.consumedMinutes, 10);
                    const remainingMins = totalMins - consumedMins;
                    const hourlyRate = pkg.hourlyRate ? parseFloat(pkg.hourlyRate) : 0;
                    
                    return (
                      <div key={pkg.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-start mb-3 relative z-10">
                          <div>
                            <h4 className="font-bold text-gray-900 text-[15px]">{pkg.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">{Math.floor(totalMins / 60)} Saatlik Paket</p>
                          </div>
                          <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-bold ${
                            remainingMins <= 0 
                              ? 'bg-gray-100 text-gray-500 border border-gray-200' 
                              : pkg.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-gray-100 text-gray-500 border border-gray-200'
                          }`}>
                            {remainingMins > 0 && pkg.status === 'ACTIVE' ? 'Aktif' : 'Tüketildi'}
                          </span>
                        </div>
                        
                        <div className={`grid ${isTeacher ? 'grid-cols-1' : 'grid-cols-2'} gap-2 mb-3`}>
                          {!isTeacher && (
                            <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
                              <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Birim Fiyat</p>
                              <p className="font-black text-indigo-700 text-sm">{pkg.hourlyRate ? `${pkg.hourlyRate} ₺` : '-'}</p>
                            </div>
                          )}
                          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
                            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Kalan Süre</p>
                            <p className="font-black text-gray-900 text-sm">{Math.floor(remainingMins / 60)} Saat</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-[11px] font-medium mb-1">
                            <span className="text-gray-500">Tüketim: {Math.floor(consumedMins / 60)}s</span>
                            <span className="text-gray-900">{Math.floor((consumedMins / totalMins) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div 
                              className={`h-1.5 rounded-full ${remainingMins > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(100, (consumedMins / totalMins) * 100)}%` }}
                            ></div>
                          </div>
                        </div>

                        {!isTeacher && (
                          <div className="flex justify-end gap-2 border-t border-gray-50 pt-3">
                            <button onClick={() => { setPaymentPackageId(pkg.id); setPaymentAmountInput(''); }} className="p-2 text-emerald-600 bg-emerald-50 rounded-lg" title="Ödeme Al">
                              <Banknote className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setEditPackageId(pkg.id); setEditPackageHoursInput(Math.floor(totalMins / 60).toString()); }} className="p-2 text-indigo-600 bg-indigo-50 rounded-lg" title="Düzenle">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeletePackageId(pkg.id)} className="p-2 text-rose-600 bg-rose-50 rounded-lg" title="Sil">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto min-w-0 w-full pb-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white border-b border-gray-100">
                      <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Paket Bilgisi</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Oluşturulma</th>
                      {!isTeacher && <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Birim Fiyat</th>}
                      <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Tüketim Durumu</th>
                      <th className="px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Durum</th>
                      {!isTeacher && <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[11px]">İşlemler</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {packages.length === 0 ? (
                      <tr>
                        <td colSpan={isTeacher ? 4 : 6} className="px-6 py-10 text-center text-gray-500">
                          <p className="font-medium text-sm">Öğrenciye ait herhangi bir eğitim paketi bulunmuyor.</p>
                        </td>
                      </tr>
                    ) : (
                      packages.map((pkg) => {
                        const totalMins = parseInt(pkg.totalMinutes, 10);
                        const consumedMins = parseInt(pkg.consumedMinutes, 10);
                        const remainingMins = totalMins - consumedMins;
                        
                        const hourlyRate = pkg.hourlyRate ? parseFloat(pkg.hourlyRate) : 0;
                        const totalCost = (totalMins / 60) * hourlyRate;
                        const consumedCost = (consumedMins / 60) * hourlyRate;
                        const paidAmount = parseFloat(pkg.paidAmount || '0');
                        
                        return (
                          <tr key={pkg.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <p className="font-semibold text-gray-900 text-sm">{pkg.title}</p>
                              <p className="text-xs text-gray-500 mt-0.5">{Math.floor(totalMins / 60)} Saatlik Paket</p>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-xs text-gray-600 font-medium">
                              {new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(pkg.createdAt))}
                            </td>
                            {!isTeacher && (
                              <td className="px-4 py-4 whitespace-nowrap">
                                <div className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                  {pkg.hourlyRate ? `${pkg.hourlyRate} ₺ / Saat` : 'Belirtilmedi'}
                                </div>
                              </td>
                            )}
                            <td className="px-4 py-4 min-w-[140px] whitespace-nowrap">
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-medium text-gray-600">
                                    {Math.floor(consumedMins / 60)}s / {Math.floor(totalMins / 60)}s
                                  </span>
                                  <span className="font-bold text-gray-900">{Math.floor(remainingMins / 60)}s kalan</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                  <div 
                                    className={`h-1.5 rounded-full ${remainingMins > 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(100, (consumedMins / totalMins) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              {remainingMins <= 0 ? (
                                <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded-md text-xs font-semibold border border-gray-200">
                                  <XCircle className="w-3.5 h-3.5" /> Pasif (Tüketildi)
                                </span>
                              ) : pkg.status === 'ACTIVE' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md text-xs font-semibold border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded-md text-xs font-semibold border border-gray-200">
                                  <XCircle className="w-3.5 h-3.5" /> Pasif
                                </span>
                              )}
                            </td>
                            {!isTeacher && (
                              <td className="px-4 py-4 whitespace-nowrap text-right">
                                <div className="flex justify-end gap-1.5">
                                  <button onClick={() => { setPaymentPackageId(pkg.id); setPaymentAmountInput(''); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Ödeme Al">
                                    <Banknote className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => { setEditPackageId(pkg.id); setEditPackageHoursInput(Math.floor(totalMins / 60).toString()); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Paket Saatini Düzenle">
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setDeletePackageId(pkg.id)} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors" title="Paketi Sil">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
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
            </div>
          </div>

          {/* Finans ve Tahsilat Tablosu */}
          {!isTeacher && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 lg:p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50/30">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  Finans & Tahsilat Durumu
                </h3>
              </div>
              
              <div className="p-0">
                {/* Mobile View: Cards */}
                <div className="md:hidden space-y-4 p-4">
                  {packages.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                      <p className="font-medium text-sm text-gray-500">Finansal kayıt bulunmuyor.</p>
                    </div>
                  ) : (
                    packages.map((pkg) => {
                      const totalMins = parseInt(pkg.totalMinutes, 10);
                      const consumedMins = parseInt(pkg.consumedMinutes, 10);
                      const hourlyRate = pkg.hourlyRate ? parseFloat(pkg.hourlyRate) : 0;
                      const totalCost = (totalMins / 60) * hourlyRate;
                      const consumedCost = (consumedMins / 60) * hourlyRate;
                      const paidAmount = parseFloat(pkg.paidAmount || '0');
                      const currentDebt = Math.max(0, consumedCost - paidAmount);
                      
                      return (
                        <div key={`fin-m-${pkg.id}`} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative">
                          <div className="flex items-center gap-3 border-b border-gray-50 pb-3 mb-3">
                            <div>
                              <h4 className="font-bold text-gray-900 text-sm">{pkg.title}</h4>
                              <p className="text-xs text-gray-500">{hourlyRate} ₺ / Saat</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <p className="text-gray-400 font-medium mb-0.5">Toplam Tutar</p>
                              <p className="font-semibold text-gray-600">{hourlyRate > 0 ? `${totalCost.toLocaleString('tr-TR')} ₺` : '-'}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 font-medium mb-0.5">Güncel Kullanım</p>
                              <p className="font-bold text-gray-800">{hourlyRate > 0 ? `${consumedCost.toLocaleString('tr-TR')} ₺` : '-'}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 font-medium mb-0.5">Ödenen Toplam</p>
                              <p className="font-bold text-emerald-600">{hourlyRate > 0 ? `${paidAmount.toLocaleString('tr-TR')} ₺` : '-'}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 font-medium mb-0.5">Kalan Borç</p>
                              <p className={`font-black ${currentDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {hourlyRate > 0 ? `${currentDebt.toLocaleString('tr-TR')} ₺` : '-'}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-gray-50 flex justify-end">
                             <button onClick={() => { setPaymentPackageId(pkg.id); setPaymentAmountInput(''); }} className="w-full text-center px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-colors">
                               Ödeme Al
                             </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop View: Table */}
                <div className="hidden md:block overflow-x-auto min-w-0 w-full pb-2">
                  <table className="w-full text-sm align-middle">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/80">
                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Paket Adı</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Toplam Tutar</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Güncel Kullanım Tutarı</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Ödenen Toplam</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Kalan Borç</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider text-[11px]">İşlem</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 bg-white">
                      {packages.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                            <p className="font-medium text-sm">Finansal kayıt bulunmuyor.</p>
                          </td>
                        </tr>
                      ) : (
                        packages.map((pkg) => {
                          const totalMins = parseInt(pkg.totalMinutes, 10);
                          const consumedMins = parseInt(pkg.consumedMinutes, 10);
                          
                          const hourlyRate = pkg.hourlyRate ? parseFloat(pkg.hourlyRate) : 0;
                          const totalCost = (totalMins / 60) * hourlyRate;
                          const consumedCost = (consumedMins / 60) * hourlyRate;
                          const paidAmount = parseFloat(pkg.paidAmount || '0');
                          const currentDebt = Math.max(0, consumedCost - paidAmount);
                          
                          return (
                            <tr key={`fin-${pkg.id}`} className="hover:bg-gray-50/50 transition-colors">
                              <td className="px-4 py-4 whitespace-nowrap">
                                <p className="font-semibold text-gray-900 text-sm">{pkg.title}</p>
                                <p className="text-xs text-gray-500">{hourlyRate} ₺ / Saat</p>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-600">
                                {hourlyRate > 0 ? `${totalCost.toLocaleString('tr-TR')} ₺` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                                {hourlyRate > 0 ? `${consumedCost.toLocaleString('tr-TR')} ₺` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-emerald-600">
                                {hourlyRate > 0 ? `${paidAmount.toLocaleString('tr-TR')} ₺` : '-'}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-black ${currentDebt > 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                                  {hourlyRate > 0 ? `${currentDebt.toLocaleString('tr-TR')} ₺` : '-'}
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right">
                                 <button onClick={() => { setPaymentPackageId(pkg.id); setPaymentAmountInput(''); }} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Ödeme Al">
                                   <Banknote className="w-4 h-4" />
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
            </div>
          )}

          {/* Planlanan Dersler */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-gray-100 flex items-center justify-between bg-blue-50/30">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" />
                Planlanan Dersler
              </h3>
            </div>
            
            <div className="p-0">
              {/* Mobile View: Cards */}
              <div className="md:hidden space-y-4 p-4">
                {plannedSchedules.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="font-medium text-sm text-gray-500">Planlanmış bir ders programı bulunmuyor.</p>
                  </div>
                ) : (
                  plannedSchedules.map((schedule, idx) => (
                    <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative">
                      <div className="flex items-center gap-3 border-b border-gray-50 pb-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                          {schedule.teacherFirstName[0]}{schedule.teacherLastName[0]}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{schedule.teacherFirstName} {schedule.teacherLastName}</p>
                          <span className="inline-flex items-center mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600">
                            {schedule.subjectName}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <p className="text-gray-400 font-medium mb-0.5">Ders Süresi</p>
                          <p className="font-bold text-gray-800">{schedule.lessonCount} Ders ({Math.floor(schedule.totalMinutes / 60)} Saat)</p>
                        </div>
                        <div>
                          <p className="text-gray-400 font-medium mb-0.5">Başlangıç</p>
                          <p className="font-semibold text-gray-700">
                            {schedule.startDate ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit' }).format(new Date(schedule.startDate)) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop View: Table */}
              <div className="hidden md:block overflow-x-auto min-w-0 w-full pb-2">
                <table className="w-full text-sm align-middle">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/80">
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Öğretmen</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Branş</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Planlanan Toplam Süre</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Başlangıç Tarihi</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Son Ders (Bitiş)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white">
                    {plannedSchedules.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                          <p className="font-medium text-sm">Planlanmış bir ders programı bulunmuyor.</p>
                        </td>
                      </tr>
                    ) : (
                      plannedSchedules.map((schedule, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <p className="font-semibold text-gray-900 text-sm">{schedule.teacherFirstName} {schedule.teacherLastName}</p>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700">
                              {schedule.subjectName}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                            {schedule.lessonCount} Ders ({Math.floor(schedule.totalMinutes / 60)} Saat)
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {schedule.startDate ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(schedule.startDate)) : '-'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-800">
                            {schedule.endDate ? new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(schedule.endDate)) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletePackageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setDeletePackageId(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-red-50/50">
              <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <Trash2 className="w-5 h-5" /> Paketi Sil
              </h3>
              <button onClick={() => setDeletePackageId(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">✕</button>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-6 text-sm">Bu eğitim paketini silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve bu pakete bağlı dersler etkilenebilir.</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setDeletePackageId(null)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  disabled={isPending}
                >
                  İptal
                </button>
                <button 
                  onClick={handleDeletePackage}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 text-white bg-red-600 rounded-xl font-bold hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isPending ? 'Siliniyor...' : 'Evet, Sil'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Package Modal */}
      {editPackageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setEditPackageId(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
              <h3 className="text-xl font-bold text-indigo-600 flex items-center gap-2">
                <Pencil className="w-5 h-5" /> Paketi Düzenle
              </h3>
              <button onClick={() => setEditPackageId(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">✕</button>
            </div>
            <form onSubmit={handleEditPackage} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Yeni Toplam Ders Saati</label>
                <input 
                  type="number" 
                  min="1"
                  required
                  placeholder="Örn: 20"
                  value={editPackageHoursInput}
                  onChange={(e) => setEditPackageHoursInput(e.target.value)}
                  className="w-full rounded-xl border-gray-300 p-3 border focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-lg" 
                />
                <p className="mt-2 text-xs text-gray-500">Bu paketin saatini artırabilir veya azaltabilirsiniz.</p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditPackageId(null)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  disabled={isPending}
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  disabled={isPending || !editPackageHoursInput}
                  className="flex-1 px-4 py-2.5 text-white bg-indigo-600 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Package Modal */}
      {isPackageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsPackageModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900">Paket Yükle</h3>
              <button onClick={() => setIsPackageModalOpen(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">✕</button>
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
                <p className="mt-2 text-xs text-gray-500">Öğrencinin kalan saatine girilen saat eklenecektir.</p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsPackageModalOpen(false)}
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

      {paymentPackageId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setPaymentPackageId(null)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-600" /> Tahsilat Gir
              </h3>
              <button onClick={() => setPaymentPackageId(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-full transition-colors">✕</button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Ödenen Tutar (TL)</label>
                <input 
                  type="number" 
                  min="1"
                  step="0.01"
                  required
                  placeholder="Örn: 2000"
                  value={paymentAmountInput}
                  onChange={(e) => setPaymentAmountInput(e.target.value)}
                  className="w-full rounded-xl border-gray-300 p-3 border focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-lg" 
                />
                <p className="mt-2 text-xs text-gray-500">Mevcut ödenmiş tutarın üzerine bu girdiğiniz miktar eklenecektir.</p>
              </div>
              
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setPaymentPackageId(null)}
                  className="flex-1 px-4 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  disabled={isPending}
                >
                  İptal
                </button>
                <button 
                  type="submit" 
                  disabled={isPending || !paymentAmountInput}
                  className="flex-1 px-4 py-2.5 text-white bg-emerald-600 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isPending ? 'Kaydediliyor...' : 'Ödemeyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
