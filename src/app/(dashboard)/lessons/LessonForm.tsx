'use client';

import { useActionState } from 'react';
import { scheduleLessonAction } from './actions';
import { Button } from '@/components/ui/button';

export function LessonForm({ students, teachers, packages, subjects, classrooms }: any) {
  const [state, formAction, pending] = useActionState(scheduleLessonAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Öğrenci</label>
          <select name="studentId" required className="mt-1 block w-full rounded-md border-gray-300 p-2 border bg-white">
            <option value="">Seçiniz</option>
            {students.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Öğretmen</label>
          <select name="teacherId" required className="mt-1 block w-full rounded-md border-gray-300 p-2 border bg-white">
            <option value="">Seçiniz</option>
            {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Paket</label>
          <select name="packageId" required className="mt-1 block w-full rounded-md border-gray-300 p-2 border bg-white">
            <option value="">Seçiniz</option>
            {packages.map((p: any) => <option key={p.id} value={p.id}>{p.title} (Kalan: {Number(p.totalMinutes) - Number(p.consumedMinutes)} dk)</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Branş</label>
          <select name="subjectId" required className="mt-1 block w-full rounded-md border-gray-300 p-2 border bg-white">
            <option value="">Seçiniz</option>
            {subjects.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Derslik (Opsiyonel)</label>
        <select name="classroomId" className="mt-1 block w-full rounded-md border-gray-300 p-2 border bg-white">
          <option value="">Derslik Yok / Online</option>
          {classrooms.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Başlangıç Zamanı</label>
          <input type="datetime-local" name="startTime" required className="mt-1 block w-full rounded-md border-gray-300 p-2 border bg-white" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Bitiş Zamanı</label>
          <input type="datetime-local" name="endTime" required className="mt-1 block w-full rounded-md border-gray-300 p-2 border bg-white" />
        </div>
      </div>

      {state?.error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{state.error}</div>}
      {state?.success && <div className="text-sm text-green-600 bg-green-50 p-2 rounded">{state.success}</div>}

      <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90 text-white">
        {pending ? 'Planlanıyor...' : 'Dersi Planla'}
      </Button>
    </form>
  );
}
