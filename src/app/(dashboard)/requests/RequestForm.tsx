'use client';

import { useActionState, useState, useEffect } from 'react';
import { createRequestAction, convertToPackageAction } from './actions';
import { Button } from '@/components/ui/button';

export function RequestForm({ students, subjects, onSuccess }: { students: any[], subjects: any[], onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createRequestAction, null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  useEffect(() => {
    if (state?.success) {
      onSuccess?.();
    }
  }, [state, onSuccess]);

  const filteredStudents = students.filter(s => 
    `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden input to pass selected student ID to FormData */}
      <input type="hidden" name="studentId" value={selectedStudent?.id || ''} required />
      
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Öğrenci Seçimi</label>
        
        {/* Searchable Input */}
        <div 
          className="relative"
          onClick={() => setIsDropdownOpen(true)}
        >
          <input
            type="text"
            placeholder={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : "Öğrenci arayın..."}
            value={isDropdownOpen ? searchTerm : (selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : '')}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (!isDropdownOpen) setIsDropdownOpen(true);
            }}
            onFocus={() => setIsDropdownOpen(true)}
            onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
            className="w-full rounded-xl border border-gray-200 p-3 pr-10 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all bg-white"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Dropdown List */}
        {isDropdownOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-auto">
            {filteredStudents.length > 0 ? (
              filteredStudents.map(s => (
                <div 
                  key={s.id}
                  onClick={() => {
                    setSelectedStudent(s);
                    setSearchTerm('');
                    setIsDropdownOpen(false);
                  }}
                  className="px-4 py-2 hover:bg-primary/5 cursor-pointer text-sm font-medium transition-colors"
                >
                  {s.firstName} {s.lastName}
                </div>
              ))
            ) : (
              <div className="px-4 py-3 text-sm text-gray-500 italic">Sonuç bulunamadı...</div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Branşlar (Birden fazla seçebilirsiniz)</label>
        <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border p-2 rounded bg-gray-50">
          {subjects.map(sub => (
            <div key={sub.id} className="flex items-center">
              <input type="checkbox" id={`subj-${sub.id}`} name="subjectIds" value={sub.id} className="h-4 w-4 text-primary rounded border-gray-300" />
              <label htmlFor={`subj-${sub.id}`} className="ml-2 text-sm text-gray-700">{sub.name}</label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Notlar</label>
        <textarea name="notes" className="mt-1 block w-full rounded-md border-gray-300 p-2 border" rows={3}></textarea>
      </div>

      {state?.error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{state.error}</div>}
      {state?.success && <div className="text-sm text-green-600 bg-green-50 p-2 rounded">{state.success}</div>}

      <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90 text-white">
        {pending ? 'Oluşturuluyor...' : 'Talep Oluştur'}
      </Button>
    </form>
  );
}

export function ConvertPackageForm({ req }: { req: any }) {
  const [state, formAction, pending] = useActionState(convertToPackageAction, null);
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)} className="text-sm text-primary hover:text-indigo-900 font-medium">
        Pakete Dönüştür
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 p-3 bg-gray-50 border rounded text-left space-y-3">
      <input type="hidden" name="requestId" value={req.id} />
      <input type="hidden" name="studentId" value={req.studentId} />
      
      <div>
        <label className="block text-xs font-medium text-gray-700">Paket Adı</label>
        <input type="text" name="title" required placeholder="Örn: 20 Saatlik Matematik" className="mt-1 block w-full rounded border-gray-300 p-1.5 border text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-700">Toplam Dakika</label>
        <input type="number" name="totalMinutes" required placeholder="Örn: 1200" className="mt-1 block w-full rounded border-gray-300 p-1.5 border text-sm" />
      </div>

      {state?.error && <div className="text-xs text-red-600">{state.error}</div>}
      
      <div className="flex space-x-2">
        <Button type="submit" disabled={pending} className="text-xs bg-green-600 hover:bg-green-700 text-white h-8 px-3">
          Onayla
        </Button>
        <Button type="button" onClick={() => setIsOpen(false)} variant="outline" className="text-xs h-8 px-3">
          İptal
        </Button>
      </div>
    </form>
  );
}
