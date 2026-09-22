import { db } from '@/db';
import { organizations } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { SettingsForm } from './SettingsForm';
import Link from 'next/link';
import { BookOpen, ChevronRight, Calendar, Users } from 'lucide-react';

export default async function SettingsPage() {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId || user.role === 'STAFF' || user.role === 'TEACHER') redirect('/dashboard');

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.organizationId));

  if (!org) redirect('/dashboard');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight">Kurum Ayarları</h1>
        <p className="mt-2 text-gray-500 font-medium text-lg leading-relaxed">
          Kurumunuzun planlama ve takvim altyapısını yönlendiren ana parametreleri buradan güncelleyebilirsiniz.
        </p>
      </div>

      <div className="glass-panel p-4 rounded-3xl border border-white/60 shadow-sm max-w-3xl flex flex-col gap-3">
        {/* Navigation Card for Schedule Settings */}
        <Link 
          href="/settings/schedule"
          className="w-full text-left group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-primary rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">Takvim ve Planlama Yönetimi</h3>
              <p className="text-sm text-gray-500">Bu ayarlar, takvim sayfasındaki zaman çizelgesinin nasıl oluşacağını belirler.</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-primary group-hover:text-white text-gray-400 flex items-center justify-center transition-colors">
            <ChevronRight className="w-5 h-5" />
          </div>
        </Link>
        
        {/* Navigation Card for Subjects */}
        <Link 
          href="/subjects"
          className="w-full text-left group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-primary rounded-xl flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">Branş ve Eğitim Yönetimi</h3>
              <p className="text-sm text-gray-500">Kurumunuzda verilen ders branşlarını ve temel eğitim kategorilerini düzenleyin.</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-primary group-hover:text-white text-gray-400 flex items-center justify-center transition-colors">
            <ChevronRight className="w-5 h-5" />
          </div>
        </Link>

        {/* Navigation Card for Users */}
        <Link 
          href="/settings/users"
          className="w-full text-left group flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-primary rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">Kullanıcı Yönetimi</h3>
              <p className="text-sm text-gray-500">Sisteme erişimi olan kullanıcıları, öğretmen hesaplarını ve rollerini yönetin.</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-primary group-hover:text-white text-gray-400 flex items-center justify-center transition-colors">
            <ChevronRight className="w-5 h-5" />
          </div>
        </Link>
      </div>

    </div>
  );
}
