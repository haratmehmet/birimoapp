'use server';

import { db } from '@/db';
import { lessons, educationPackages, teachers } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

export async function scheduleLessonAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Yetkisiz erişim.' };

  const studentId = formData.get('studentId') as string;
  const teacherId = formData.get('teacherId') as string;
  const packageId = formData.get('packageId') as string;
  const subjectId = formData.get('subjectId') as string;
  const classroomId = formData.get('classroomId') as string || null;
  const startTimeStr = formData.get('startTime') as string;
  const endTimeStr = formData.get('endTime') as string;

  if (!studentId || !teacherId || !packageId || !subjectId || !startTimeStr || !endTimeStr) {
    return { error: 'Lütfen zorunlu alanları doldurun.' };
  }

  const startTime = new Date(startTimeStr);
  const endTime = new Date(endTimeStr);

  if (endTime <= startTime) {
    return { error: 'Bitiş saati başlangıç saatinden sonra olmalıdır.' };
  }

  const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);

  try {
    // Check package balance (1 ders oturumu her zaman 1 saat = 60 dk hak gerektirir)
    const [pkg] = await db.select().from(educationPackages).where(eq(educationPackages.id, packageId));
    if (!pkg) return { error: 'Paket bulunamadı.' };

    const remaining = Number(pkg.totalMinutes) - Number(pkg.consumedMinutes);
    if (remaining < 60) {
      return { error: `Pakette yeterli bakiye yok. Kalan: ${remaining} dk, İstenen: 1 Ders (60 dk).` };
    }

    // Get Teacher Compensation Snapshot (1 ders oturumu = 1 saatlik hakediş)
    const [teacher] = await db.select().from(teachers).where(eq(teachers.id, teacherId));
    const compModel = teacher?.compensationModel || 'UNKNOWN';
    const compRate = teacher?.compensationRate || '0';
    let feeAmount = '0';

    if (compModel === 'HOURLY') {
      feeAmount = compRate;
    } else {
      feeAmount = compRate;
    }

    // Insert Lesson (GIST constraints will throw if there's a conflict)
    await db.insert(lessons).values({
      organizationId: user.organizationId,
      studentId,
      teacherId,
      packageId,
      subjectId,
      classroomId: classroomId || null,
      startTime,
      endTime,
      durationMinutes: '60', // Sistem kuralı: 1 ders oturumu her zaman 1 saat (60 dk) olarak kaydedilir
      status: 'PLANNED',
      teacherCompensationModelSnapshot: compModel,
      teacherRateSnapshot: compRate,
      teacherFeeAmount: feeAmount,
    });

    revalidatePath('/lessons');
    revalidatePath('/calendar');
    return { success: 'Ders başarıyla planlandı.' };
  } catch (error: any) {
    console.error('Planlama Hatası:', error);
    // GIST exclusion constraint errors usually have code '23P01' or similar in postgres
    if (error.code === '23P01' || error.message?.includes('exclude')) {
      return { error: 'Çakışma Hatası: Seçilen saat diliminde öğretmen, öğrenci veya derslik müsait değil.' };
    }
    return { error: 'Ders planlanırken bir hata oluştu.' };
  }
}
