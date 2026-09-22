'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { updateRequestAction } from './actions';

export function EditRequestModal({ request, subjects, onClose }: { request: any, subjects: any[], onClose: () => void }) {
  const [notes, setNotes] = useState(request.notes || '');
  // requested subjects is an array of names. we need ids.
  const initialSubjectIds = subjects.filter(s => request.subjects.includes(s.name)).map(s => s.id);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(initialSubjectIds);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    if (selectedSubjects.length === 0) return alert('En az bir branş seçin');
    startTransition(async () => {
      const res = await updateRequestAction(request.id, selectedSubjects, notes);
      if (res?.error) {
        alert(res.error);
      } else {
        onClose();
      }
    });
  };

  const toggleSubject = (id: string) => {
    if (selectedSubjects.includes(id)) {
      setSelectedSubjects(selectedSubjects.filter(s => s !== id));
    } else {
      setSelectedSubjects([...selectedSubjects, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-extrabold text-gray-900 mb-4">Talebi Düzenle</h2>
        <p className="text-sm text-gray-500 mb-6">{request.studentName} adlı öğrencinin eğitim talebini güncelliyorsunuz.</p>
        
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Talep Edilen Branşlar</label>
            <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-100 p-3 rounded-xl bg-gray-50/50">
              {subjects.map(s => (
                <div key={s.id} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                    checked={selectedSubjects.includes(s.id)} 
                    onChange={() => toggleSubject(s.id)} 
                  />
                  <span className="text-sm font-medium text-gray-700">{s.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notlar (Opsiyonel)</label>
            <textarea 
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none" 
              value={notes} 
              onChange={e => setNotes(e.target.value)} 
              rows={3}
              placeholder="Talep ile ilgili ekstra notlar..."
            ></textarea>
          </div>
          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
            <Button variant="outline" onClick={onClose} disabled={isPending} className="rounded-xl">İptal</Button>
            <Button onClick={handleSave} disabled={isPending} className="rounded-xl px-6">{isPending ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
