'use server';

import { db } from '@/db';
import { subjects, teacherSubjects } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';

export async function toggleSubjectAction(name: string, color: string) {
  const { user } = await getCurrentSession();
  
  if (!user || !user.organizationId) {
    return { error: 'Oturumunuz geçersiz veya yetkiniz yok.' };
  }

  try {
    // Check if the subject already exists for this org
    const existing = await db.select().from(subjects).where(
      and(
        eq(subjects.organizationId, user.organizationId),
        eq(subjects.name, name)
      )
    );

    if (existing.length > 0) {
      const subjectId = existing[0].id;
      // Check if any teacher is assigned to this subject
      const assigned = await db.select().from(teacherSubjects).where(eq(teacherSubjects.subjectId, subjectId));
      if (assigned.length > 0) {
        return { error: 'Bu derse atanmış öğretmenler var. Önce öğretmenlerin branşlarını değiştirmelisiniz.' };
      }
      
      // Safe to delete
      await db.delete(subjects).where(eq(subjects.id, subjectId));
      revalidatePath('/subjects');
      revalidatePath('/teachers'); // In case teachers page is cached
      return { success: 'Ders pasif duruma getirildi.' };
    } else {
      // Add the subject
      await db.insert(subjects).values({
        organizationId: user.organizationId,
        name,
        color,
      });
      revalidatePath('/subjects');
      revalidatePath('/teachers');
      return { success: 'Ders aktif edildi.' };
    }
  } catch (error: any) {
    console.error(error);
    return { error: 'İşlem sırasında bir hata oluştu.' };
  }
}
