// @ts-nocheck
'use server';

import { db } from '@/db';
import { lessons, lessonAttendance, educationPackages, packageBalanceTransactions } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';

export async function takeAttendanceAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Yetkisiz erişim.' };

  const lessonId = formData.get('lessonId') as string;
  const status = formData.get('status') as string; // PRESENT, EXCUSED, UNEXCUSED
  const excuseReason = formData.get('excuseReason') as string;

  if (!lessonId || !status) return { error: 'Eksik bilgi.' };

  try {
    await db.transaction(async (tx) => {
      // 1. Fetch the lesson
      const [lesson] = await tx.select().from(lessons).where(and(eq(lessons.id, lessonId), eq(lessons.organizationId, user.organizationId!)));
      if (!lesson) throw new Error('Ders bulunamadı.');
      if (lesson.status !== 'PLANNED') throw new Error('Bu dersin yoklaması zaten alınmış veya iptal edilmiş.');

      // 2. Insert into lesson_attendance
      await tx.insert(lessonAttendance).values({
        organizationId: user.organizationId,
        lessonId: lesson.id,
        status,
        excuseReason: excuseReason || null,
        excuseReportedAt: status === 'EXCUSED' ? new Date() : null,
      });

      // 3. Process logic based on status
      if (status === 'PRESENT' || status === 'UNEXCUSED') {
        // Deduct minutes (1 lesson = 1 hour / 60 minutes)
        const amountMinutes = '60';
        
        // Ledger entry (idempotentKey = lesson.id ensures no double-deduction)
        await tx.insert(packageBalanceTransactions).values({
          organizationId: user.organizationId,
          packageId: lesson.packageId,
          transactionType: 'DEDUCT',
          amountMinutes,
          idempotentKey: `deduct_lesson_${lesson.id}`,
          notes: status === 'PRESENT' ? 'Derse katılım.' : 'Mazeretsiz devamsızlık (Ceza kesintisi).',
        });

        // Update package consumedMinutes
        const [pkg] = await tx.select().from(educationPackages).where(eq(educationPackages.id, lesson.packageId));
        const newConsumed = Number(pkg.consumedMinutes) + Number(amountMinutes);
        await tx.update(educationPackages)
          .set({ consumedMinutes: newConsumed.toString() })
          .where(eq(educationPackages.id, lesson.packageId));

        // Update lesson status
        await tx.update(lessons)
          .set({ status: 'COMPLETED' })
          .where(eq(lessons.id, lesson.id));
      } else if (status === 'EXCUSED') {
        // No deduction, mark as cancelled/postponed
        await tx.update(lessons)
          .set({ status: 'CANCELLED' }) // or POSTPONED based on preference
          .where(eq(lessons.id, lesson.id));
      } else if (status === 'TEACHER_ABSENT') {
        // No deduction from student hours, mark as TEACHER_ABSENT
        await tx.update(lessons)
          .set({ status: 'TEACHER_ABSENT' })
          .where(eq(lessons.id, lesson.id));
      }
    });

    revalidatePath('/attendance');
    revalidatePath('/calendar');
    revalidatePath('/packages');
    revalidatePath('/lessons');
    return { success: 'Yoklama başarıyla kaydedildi.' };
  } catch (error: any) {
    if (error.code === '23505' || error.message?.includes('unique constraint')) {
      return { error: 'Bu ders için daha önce paket bakiyesi düşülmüş (Mükerrer işlem engellendi).' };
    }
    return { error: 'Yoklama kaydedilirken sistemsel bir hata oluştu. Lütfen tekrar deneyin.' };
  }
}
