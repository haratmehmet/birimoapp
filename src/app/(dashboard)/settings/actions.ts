'use server';

import { db } from '@/db';
import { organizations } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { eq, sql } from 'drizzle-orm';

export async function updateScheduleSettingsAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  
  if (!user || !user.organizationId) {
    return { error: 'Oturumunuz geçersiz veya yetkiniz yok.' };
  }

  const scheduleStartTime = formData.get('scheduleStartTime') as string;
  const scheduleEndTime = formData.get('scheduleEndTime') as string;
  const lessonDurationMinutes = formData.get('lessonDurationMinutes') as string;
  const breakDurationMinutes = formData.get('breakDurationMinutes') as string;
  const lunchBreakStartTime = formData.get('lunchBreakStartTime') as string;
  const lunchBreakEndTime = formData.get('lunchBreakEndTime') as string;
  const activeDaysArr = formData.getAll('activeDays') as string[];

  if (!scheduleStartTime || !scheduleEndTime || !lessonDurationMinutes || !breakDurationMinutes || activeDaysArr.length === 0) {
    return { error: 'Lütfen tüm alanları doldurun ve en az 1 gün seçin.' };
  }

  const activeDays = activeDaysArr.join(',');

  try {
    // Lazy migration for the new columns
    try {
      await db.execute(sql`ALTER TABLE organizations ADD COLUMN lunch_break_start_time VARCHAR(10)`);
      await db.execute(sql`ALTER TABLE organizations ADD COLUMN lunch_break_end_time VARCHAR(10)`);
    } catch (e) {
      // Ignored if they already exist
    }

    await db.update(organizations)
      .set({
        scheduleStartTime,
        scheduleEndTime,
        lessonDurationMinutes,
        breakDurationMinutes,
        lunchBreakStartTime: lunchBreakStartTime || null,
        lunchBreakEndTime: lunchBreakEndTime || null,
        activeDays,
      })
      .where(eq(organizations.id, user.organizationId));

    revalidatePath('/settings');
    revalidatePath('/calendar');
    return { success: 'Planlama ayarları başarıyla kaydedildi.' };
  } catch (error: any) {
    console.error(error);
    return { error: 'Ayarlar kaydedilirken bir hata oluştu.' };
  }
}
