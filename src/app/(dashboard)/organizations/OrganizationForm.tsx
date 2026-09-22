'use client';

import { useActionState } from 'react';
import { createOrganizationAction } from './actions';
import { Button } from '@/components/ui/button';

export function OrganizationForm() {
  const [state, formAction, pending] = useActionState(createOrganizationAction, null);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Kurum Adı
        </label>
        <input
          type="text"
          name="name"
          id="name"
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
        />
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-4">İlk Yönetici Hesabı</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="adminFirstName" className="block text-sm font-medium text-gray-700">
                Ad
              </label>
              <input
                type="text"
                name="adminFirstName"
                id="adminFirstName"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>
            <div>
              <label htmlFor="adminLastName" className="block text-sm font-medium text-gray-700">
                Soyad
              </label>
              <input
                type="text"
                name="adminLastName"
                id="adminLastName"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              />
            </div>
          </div>

          <div>
            <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700">
              E-posta
            </label>
            <input
              type="text"
              name="adminEmail"
              id="adminEmail"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>

          <div>
            <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700">
              Geçici Şifre
            </label>
            <input
              type="password"
              name="adminPassword"
              id="adminPassword"
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            />
          </div>
        </div>
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
        {pending ? 'Oluşturuluyor...' : 'Kurum Oluştur'}
      </Button>
    </form>
  );
}
