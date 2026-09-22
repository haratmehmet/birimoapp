'use client';

import { useActionState } from 'react';
import { createClassroomAction } from './actions';
import { Button } from '@/components/ui/button';

export function ClassroomForm() {
  const [state, formAction, pending] = useActionState(createClassroomAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Derslik Adı</label>
        <input type="text" name="name" required placeholder="Örn: Derslik 1" className="mt-1 block w-full rounded-md border-gray-300 p-2 border" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Kapasite</label>
        <input type="number" name="capacity" placeholder="Örn: 2" className="mt-1 block w-full rounded-md border-gray-300 p-2 border" />
      </div>

      {state?.error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{state.error}</div>}
      {state?.success && <div className="text-sm text-green-600 bg-green-50 p-2 rounded">{state.success}</div>}

      <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90 text-white">
        {pending ? 'Ekleniyor...' : 'Derslik Ekle'}
      </Button>
    </form>
  );
}
