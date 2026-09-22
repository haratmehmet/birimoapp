'use client';

import { useActionState, useEffect, useState } from 'react';
import { createStudentAction } from './actions';
import { Button } from '@/components/ui/button';
import { formatPhoneNumber } from '@/lib/utils';

export function StudentForm({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createStudentAction, null);
  const [phone, setPhone] = useState('');
  const [parentPhone, setParentPhone] = useState('');

  useEffect(() => {
    if (state?.success && onSuccess) {
      onSuccess();
    }
  }, [state, onSuccess]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhoneNumber(e.target.value));
  };

  const handleParentPhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParentPhone(formatPhoneNumber(e.target.value));
  };

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Öğrenci Adı</label>
          <input type="text" name="firstName" required className="mt-1 block w-full rounded-md border-gray-300 p-2 border" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Öğrenci Soyadı</label>
          <input type="text" name="lastName" required className="mt-1 block w-full rounded-md border-gray-300 p-2 border" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Öğrenim Durumu</label>
          <select name="educationLevel" required className="mt-1 block w-full rounded-md border-gray-300 p-2 border bg-white">
            <option value="">Seçiniz</option>
            <option value="LGS">LGS</option>
            <option value="YKS">YKS</option>
            <option value="MEZUN">MEZUN</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Sınıfı</label>
          <input type="text" name="grade" className="mt-1 block w-full rounded-md border-gray-300 p-2 border" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Cinsiyet</label>
          <select name="gender" className="mt-1 block w-full rounded-md border-gray-300 p-2 border bg-white">
            <option value="">Belirtilmedi</option>
            <option value="MALE">Erkek</option>
            <option value="FEMALE">Kadın</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Telefon Numarası</label>
          <input 
            type="text" 
            name="phone"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="0 555 555 55 55"
            className="mt-1 block w-full rounded-md border-gray-300 p-2 border" 
          />
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100">
        <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-1.5">
          <span>Veli Bilgileri</span>
          <span className="text-xs font-normal text-gray-400">(İsteğe Bağlı)</span>
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Veli Adı Soyadı</label>
            <input 
              type="text" 
              name="parentName" 
              placeholder="Örn: Ahmet Yılmaz" 
              className="mt-1 block w-full rounded-md border-gray-300 p-2 border" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Veli Telefon Numarası</label>
            <input 
              type="text" 
              name="parentPhone"
              value={parentPhone}
              onChange={handleParentPhoneChange}
              placeholder="0 555 555 55 55"
              className="mt-1 block w-full rounded-md border-gray-300 p-2 border" 
            />
          </div>
        </div>
      </div>

      <div className="pt-6 mt-2 border-t border-gray-200">
        <h3 className="text-lg font-extrabold text-gray-950 mb-4">Paket Tanımlama</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Birebir Paket Saati (Opsiyonel)</label>
            <input 
              type="number" 
              name="packageHours" 
              min="0"
              placeholder="Örn: 20"
              className="mt-1 block w-full rounded-md border-gray-300 p-2 border" 
            />
            <p className="mt-1 text-xs text-gray-500">Öğrenciye başlangıç için bir paket tanımlamak istiyorsanız saat olarak girin.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Saatlik Ders Ücreti (TL)</label>
            <input 
              type="number" 
              name="packageHourlyRate" 
              min="0"
              step="0.01"
              placeholder="Örn: 1500"
              className="mt-1 block w-full rounded-md border-gray-300 p-2 border" 
            />
            <p className="mt-1 text-xs text-gray-500">İsteğe bağlı. Öğrencinin bu pakette ödeyeceği saat başı ücret (TL).</p>
          </div>
        </div>
      </div>

      {state?.error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{state.error}</div>}
      {state?.success && <div className="text-sm text-green-600 bg-green-50 p-2 rounded">{state.success}</div>}

      <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90 text-white">
        {pending ? 'Oluşturuluyor...' : 'Öğrenci Ekle'}
      </Button>
    </form>
  );
}
