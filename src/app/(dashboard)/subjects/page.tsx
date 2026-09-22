import { db } from '@/db';
import { subjects } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { SubjectList } from './SubjectList';
import Link from 'next/link';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default async function SubjectsPage() {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) redirect('/dashboard');

  const activeSubjects = await db.select({ name: subjects.name })
    .from(subjects)
    .where(eq(subjects.organizationId, user.organizationId));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto mt-4">
      
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
              <BookOpen className="w-6 h-6" />
            </div>
            Branş ve Eğitim Yönetimi
          </h1>
          <p className="mt-2 text-gray-500 font-medium">
            Öğretmenlere atanabilen tüm branşları yönetin ve aktif hale getirin.
          </p>
        </div>
      </div>

      <div className="glass-panel p-8 rounded-3xl border border-white/60 shadow-sm">
        <SubjectList activeSubjects={activeSubjects} />
      </div>
    </div>
  );
}
