// @ts-nocheck
'use server';

import { db } from '@/db';
import { lessons, teacherPayouts, teacherPayoutItems } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { eq, and, notInArray, isNotNull } from 'drizzle-orm';

export async function createPayoutAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Yetkisiz erişim.' };

  const teacherId = formData.get('teacherId') as string;
  if (!teacherId) return { error: 'Öğretmen seçmelisiniz.' };

  try {
    let successMessage = '';
    
    await db.transaction(async (tx) => {
      // 1. Find unpaid COMPLETED lessons for this teacher
      // First find lessons that are already paid (in teacher_payout_items)
      const paidItems = await tx.select({ lessonId: teacherPayoutItems.lessonId })
        .from(teacherPayoutItems)
        .where(eq(teacherPayoutItems.organizationId, user.organizationId!));
      const paidLessonIds = paidItems.map(p => p.lessonId);

      // Now find completed lessons not in paidLessonIds
      let unpaidLessonsQuery = tx.select()
        .from(lessons)
        .where(
          and(
            eq(lessons.organizationId, user.organizationId),
            eq(lessons.teacherId, teacherId),
            eq(lessons.status, 'COMPLETED'),
            isNotNull(lessons.teacherFeeAmount)
          )
        );
      
      const allTeacherCompletedLessons = await unpaidLessonsQuery;
      
      const unpaidLessons = allTeacherCompletedLessons.filter(l => !paidLessonIds.includes(l.id));

      if (unpaidLessons.length === 0) {
        throw new Error('Bu öğretmenin ödenmemiş tamamlanmış dersi bulunmuyor.');
      }

      // 2. Calculate Total Fee
      let totalFee = 0;
      for (const l of unpaidLessons) {
        totalFee += parseFloat(l.teacherFeeAmount || '0');
      }

      // 3. Create Payout Record
      const [newPayout] = await tx.insert(teacherPayouts).values({
        organizationId: user.organizationId!,
        teacherId,
        totalAmount: totalFee.toFixed(2),
        status: 'PAID',
      }).returning();

      // 4. Create Payout Items
      for (const l of unpaidLessons) {
        await tx.insert(teacherPayoutItems).values({
          organizationId: user.organizationId!,
          payoutId: newPayout.id,
          lessonId: l.id,
          amount: l.teacherFeeAmount || '0',
        });
      }

      successMessage = `Başarılı! ${unpaidLessons.length} ders hesaplandı, Toplam: ${totalFee.toFixed(2)}₺.`;
    });

    revalidatePath('/payouts');
    return { success: successMessage };
  } catch (error: any) {
    console.error('Hakediş Hatası:', error);
    if (error.code === '23505' || error.message?.includes('unique constraint')) {
      return { error: 'Çifte ödeme koruması devrede. Bir ders birden fazla hakedişe eklenemez.' };
    }
    return { error: 'Hakediş oluşturulurken sistemsel bir hata oluştu. Lütfen tekrar deneyin.' };
  }
}
