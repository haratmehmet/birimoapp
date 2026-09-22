'use client';

import { useActionState } from 'react';
import { loginAction } from './actions';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div className="relative flex min-h-screen items-center justify-center p-4 overflow-hidden bg-gray-50">
      {/* Background Sketch Graphic */}
      <div className="absolute inset-0 z-0 opacity-20 mix-blend-multiply pointer-events-none">
        <img src="/images/header_sketch_notext.jpg" alt="Education Sketch" className="w-full h-full object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-8 rounded-3xl bg-white/90 backdrop-blur-xl p-10 shadow-[0_20px_60px_rgb(0,74,173,0.15)] border border-white">
        <div className="flex flex-col items-center text-center">
          <img src="/images/Logo.png" alt="birimO" className="h-14 w-auto object-contain mb-4" />
          <h2 className="text-xl font-extrabold text-[#004aad] tracking-tight">
            Birebir Eğitim Yönetim Sistemi
          </h2>
          <p className="mt-2 text-sm text-gray-500 font-medium">
            Devam etmek için hesabınıza giriş yapın
          </p>
        </div>
        
        <form className="mt-8 space-y-6" action={formAction}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-1 ml-1">
                Kullanıcı Adı veya E-posta
              </label>
              <input
                id="email"
                name="username"
                type="text"
                autoComplete="email"
                required
                className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-white/50 focus:bg-white"
                placeholder="Kullanıcı adı veya e-posta adresi"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1 ml-1">
                Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="block w-full rounded-xl border border-gray-200 px-4 py-3 text-gray-900 placeholder-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all bg-white/50 focus:bg-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="flex items-center ml-1">
            <input
              id="remember-me"
              name="remember"
              type="checkbox"
              defaultChecked
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/20 transition-all cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer select-none">
              Beni Hatırla
            </label>
          </div>

          {state?.error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 p-3 rounded-xl text-center font-medium animate-in fade-in">
              {state.error}
            </div>
          )}

          <div className="pt-2">
            <Button
              type="submit"
              disabled={pending}
              className="w-full py-6 text-base font-bold shadow-lg shadow-primary/20 rounded-xl"
            >
              {pending ? 'Giriş Yapılıyor...' : 'Sisteme Giriş Yap'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
