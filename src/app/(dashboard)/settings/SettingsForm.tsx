'use client';

import { useActionState } from 'react';
import { updateScheduleSettingsAction } from './actions';
import { Clock, Loader2, Save } from 'lucide-react';

export function SettingsForm({ org }: { org: any }) {
  const [state, formAction, pending] = useActionState(updateScheduleSettingsAction, null);

  return (
    <div className="w-full">
      <form action={formAction} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Mesai Başlangıç */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Mesai Başlangıç Saati</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Clock className="w-5 h-5" />
            </div>
            <input 
              type="time" 
              name="scheduleStartTime" 
              defaultValue={org.scheduleStartTime}
              required 
              className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
            />
          </div>
          <p className="text-xs text-gray-500">Program tablosunun başlayacağı saat (Örn: 08:00).</p>
        </div>

        {/* Mesai Bitiş */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Mesai Bitiş Saati</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Clock className="w-5 h-5" />
            </div>
            <input 
              type="time" 
              name="scheduleEndTime" 
              defaultValue={org.scheduleEndTime}
              required 
              className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
            />
          </div>
          <p className="text-xs text-gray-500">Program tablosunun biteceği saat (Örn: 18:00).</p>
        </div>

        {/* Ders Süresi */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Ders Süresi (Dakika)</label>
          <div className="relative">
            <input 
              type="number" 
              name="lessonDurationMinutes" 
              defaultValue={org.lessonDurationMinutes}
              min="10"
              max="120"
              required 
              className="w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 text-sm font-medium">
              dk
            </div>
          </div>
          <p className="text-xs text-gray-500">Bir dersin blok olarak ne kadar süreceği (Örn: 50).</p>
        </div>

        {/* Mola Süresi */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Mola Süresi (Dakika)</label>
          <div className="relative">
            <input 
              type="number" 
              name="breakDurationMinutes" 
              defaultValue={org.breakDurationMinutes}
              min="0"
              max="60"
              required 
              className="w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
            />
            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-gray-400 text-sm font-medium">
              dk
            </div>
          </div>
          <p className="text-xs text-gray-500">İki ders arasındaki standart mola süresi (Örn: 10).</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
        {/* Öğle Molası Başlangıç */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Öğle Molası Başlangıç Saati</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Clock className="w-5 h-5" />
            </div>
            <input 
              type="time" 
              name="lunchBreakStartTime" 
              defaultValue={org.lunchBreakStartTime || ''}
              className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
            />
          </div>
          <p className="text-xs text-gray-500">Öğle molasının başlayacağı saat (İsteğe bağlı).</p>
        </div>

        {/* Öğle Molası Bitiş */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">Öğle Molası Bitiş Saati</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
              <Clock className="w-5 h-5" />
            </div>
            <input 
              type="time" 
              name="lunchBreakEndTime" 
              defaultValue={org.lunchBreakEndTime || ''}
              className="pl-10 w-full rounded-xl border-gray-200 bg-white p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm" 
            />
          </div>
          <p className="text-xs text-gray-500">Öğle molasının biteceği saat (İsteğe bağlı).</p>
        </div>
      </div>

      {/* Aktif Günler */}
      <div className="space-y-3 pt-4 border-t border-gray-100">
        <label className="text-sm font-semibold text-gray-700">Kurumun Açık Olduğu Günler</label>
        <div className="flex flex-wrap gap-3">
          {[
            { id: '1', label: 'Pazartesi' },
            { id: '2', label: 'Salı' },
            { id: '3', label: 'Çarşamba' },
            { id: '4', label: 'Perşembe' },
            { id: '5', label: 'Cuma' },
            { id: '6', label: 'Cumartesi' },
            { id: '7', label: 'Pazar' },
          ].map(day => {
            const isChecked = org.activeDays ? org.activeDays.split(',').includes(day.id) : true;
            return (
              <label key={day.id} className="flex items-center gap-2 cursor-pointer bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:text-primary font-medium text-sm">
                <input 
                  type="checkbox" 
                  name="activeDays" 
                  value={day.id} 
                  defaultChecked={isChecked}
                  className="rounded text-primary focus:ring-primary"
                />
                {day.label}
              </label>
            );
          })}
        </div>
        <p className="text-xs text-gray-500">Seçilmeyen günlerde takvim ekranı kapalı (tatil) olarak gösterilecektir.</p>
      </div>

      {state?.error && (
        <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-2">
          <span className="font-bold">Hata:</span> {state.error}
        </div>
      )}
      
        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
          >
            {pending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {pending ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
          </button>
        </div>
        {state?.success && (
          <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm font-medium animate-in fade-in">
            Takvim ve planlama ayarları başarıyla kaydedildi.
          </div>
        )}
        {state?.error && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium animate-in fade-in">
            {state.error}
          </div>
        )}
      </form>
    </div>
  );
}
