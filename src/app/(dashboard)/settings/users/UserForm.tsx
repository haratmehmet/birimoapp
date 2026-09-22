'use client';

import { useActionState } from 'react';
import { createUserAction } from './actions';
import { Button } from '@/components/ui/button';

export function UserForm({ roles, onSuccess }: { roles: { id: string, name: string }[], onSuccess?: () => void }) {
  const [state, formAction, pending] = useActionState(createUserAction, null);

  if (state?.success && onSuccess) {
    setTimeout(() => {
      onSuccess();
    }, 1000);
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            Ad
          </label>
          <input
            type="text"
            name="firstName"
            id="firstName"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Soyad
          </label>
          <input
            type="text"
            name="lastName"
            id="lastName"
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          E-posta
        </label>
        <input
          type="text"
          name="username"
          id="email"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Şifre
        </label>
        <input
          type="password"
          name="password"
          id="password"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        />
      </div>

      <div>
        <label htmlFor="roleId" className="block text-sm font-medium text-gray-700">
          Rol
        </label>
        <select
          name="roleId"
          id="roleId"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
        >
          <option value="">Rol Seçin</option>
          {roles.map(r => {
            let label = r.name;
            const upper = r.name.toUpperCase();
            if (upper === 'STAFF' || upper.includes('YETKILI')) {
              label = 'Yetkili';
            } else if (upper.includes('ADMIN') || upper.includes('YÖNETICI')) {
              label = 'Kurum Yöneticisi';
            }
            return (
              <option key={r.id} value={r.id}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      {state?.error && (
        <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
          {state.success}
        </div>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full bg-primary hover:bg-primary/90 text-white"
      >
        {pending ? 'Oluşturuluyor...' : 'Kullanıcı Oluştur'}
      </Button>
    </form>
  );
}
