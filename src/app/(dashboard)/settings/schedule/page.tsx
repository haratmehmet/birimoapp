import { db } from '@/db';
import { organizations } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { SettingsForm } from '../SettingsForm';
import Link from 'next/link';
import { ArrowLeft, Calendar } from 'lucide-react';

export default async function ScheduleSettingsPage() {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId || user.role === 'STAFF' || user.role === 'TEACHER') redirect('/dashboard');

  const [org] = await db.select().from(organizations).where(eq(organizations.id, user.organizationId));
  if (!org) redirect('/dashboard');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto mt-4">
      
      <div className="flex items-center gap-4 mb-8">
        <Link 
          href="/settings" 
          className="p-2.5 bg-white text-gray-500 hover:text-primary rounded-xl border border-gray-200 hover:border-primary/30 transition-all shadow-sm hover:shadow"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-primary rounded-xl">
              <Calendar className="w-6 h-6" />
            </div>
            Takvim ve Planlama Yönetimi
          </h1>
          <p className="mt-2 text-gray-500 font-medium">
            Kurumunuzun zaman çizelgesi, mesai saatleri ve molalarını buradan yapılandırın.
          </p>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-white/60 shadow-sm bg-white/60 backdrop-blur-md relative overflow-hidden">
        {/* Dekoratif arka plan simgesi */}
        <div className="absolute -top-10 -right-10 p-12 opacity-[0.03] pointer-events-none rotate-12">
          <Calendar className="w-96 h-96 text-primary" />
        </div>
        
        <div className="relative z-10">
          <SettingsForm org={org} />
        </div>
      </div>

    </div>
  );
}
