// @ts-nocheck
'use server';

import { db } from '@/db';
import { lessons, lessonAttendance, educationPackages, packageBalanceTransactions } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { eq, and, gte } from 'drizzle-orm';
import { addMinutes, addDays } from 'date-fns';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';

export async function assignLessonAction(data: {
  teacherId: string;
  subjectId: string;
  studentId: string;
  packageId: string;
  startTime: Date;
  durationMinutes: number;
  isOneOff?: boolean;
  totalLessons?: number;
}) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Unauthorized' };

  try {
    const [pkg] = await db.select().from(educationPackages).where(eq(educationPackages.id, data.packageId));
    if (!pkg) return { error: 'Seçilen paket bulunamadı.' };

    const { sql } = await import('drizzle-orm');
    const [plannedResult] = await db.select({
      totalPlanned: sql<number>`COUNT(${lessons.id}) * 60`
    })
    .from(lessons)
    .where(and(eq(lessons.packageId, data.packageId), eq(lessons.status, 'PLANNED')));

    const plannedMin = Number(plannedResult?.totalPlanned || 0);
    const totalMin = parseInt(pkg.totalMinutes, 10);
    const consumedMin = parseInt(pkg.consumedMinutes || '0', 10);
    const remainingMin = totalMin - consumedMin - plannedMin;

    if (remainingMin < 60) {
      return { error: 'Öğrencinin atanabilir birebir paketi kalmamıştır.' };
    }

    const possibleLessons = Math.floor(remainingMin / 60);
    const requestedLessons = data.totalLessons === -1 ? possibleLessons : (data.totalLessons || possibleLessons);

    if (!data.isOneOff && requestedLessons > possibleLessons) {
      return { error: `Paket bakiyesi yetersiz! Maksimum ${possibleLessons} ders (${possibleLessons} saat) daha planlayabilirsiniz.` };
    }

    const numLessonsToSchedule = data.isOneOff ? 1 : Math.min(requestedLessons, possibleLessons, 52);
    
    const seriesId = data.isOneOff ? null : crypto.randomUUID();
    const newLessons = [];

    let currentStartTime = new Date(data.startTime);

    for (let i = 0; i < numLessonsToSchedule; i++) {
      const currentEndTime = addMinutes(currentStartTime, data.durationMinutes);
      
      // Clean up any existing CANCELLED placeholder lessons in this slot so it doesn't linger as a phantom cancellation
      const cancelledExisting = await db.select({ id: lessons.id })
        .from(lessons)
        .where(
          and(
            eq(lessons.organizationId, user.organizationId),
            eq(lessons.teacherId, data.teacherId),
            eq(lessons.startTime, currentStartTime),
            eq(lessons.status, 'CANCELLED')
          )
        );

      for (const cl of cancelledExisting) {
        await db.delete(lessonAttendance).where(eq(lessonAttendance.lessonId, cl.id));
        await db.delete(lessons).where(eq(lessons.id, cl.id));
      }

      newLessons.push({
        organizationId: user.organizationId,
        studentId: data.studentId,
        teacherId: data.teacherId,
        subjectId: data.subjectId,
        packageId: data.packageId,
        startTime: currentStartTime,
        endTime: currentEndTime,
        durationMinutes: '60', // Sistem kuralı: 1 ders oturumu her zaman 1 saat (60 dk) olarak kaydedilir
        status: 'PLANNED',
        seriesId: seriesId,
      });

      // Bir sonraki haftaya geç
      currentStartTime = addDays(currentStartTime, 7);
    }

    await db.insert(lessons).values(newLessons);

    revalidatePath('/calendar');
    return { success: true };
  } catch (error: any) {
    console.error("Assign Lesson Error:", error);
    const dbErr = error.cause || error;
    if (dbErr.code === '23P01' || (dbErr.message && dbErr.message.includes('conflict'))) {
      if (dbErr.constraint === 'student_conflict' || (dbErr.message && dbErr.message.includes('student_conflict'))) {
        return { error: 'Öğrencinin bu saatlerde dersi var.' };
      }
      if (dbErr.constraint === 'teacher_conflict' || (dbErr.message && dbErr.message.includes('teacher_conflict'))) {
        return { error: 'Öğretmenin bu saatlerde zaten planlanmış başka bir dersi var.' };
      }
      return { error: 'Bu saatte çakışan bir ders bulunuyor.' };
    }
    const fs = require('fs');
    fs.appendFileSync('error_log.txt', JSON.stringify({ message: error.message, dbErrMessage: dbErr.message, code: dbErr.code }) + '\\n');
    return { error: `Ders ataması başarısız oldu.` };
  }
}

export async function updateLessonStatusAction(lessonId: string, status: string) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Unauthorized' };

  try {
    // Get existing lesson to check previous status and duration
    const [existingLesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!existingLesson) return { error: 'Ders bulunamadı.' };

    const oldStatus = existingLesson.status;
    const duration = 60; // Her ders tüketimde 1 saat (60 dk) olarak hesaplanacak
    const packageId = existingLesson.packageId;

    await db.transaction(async (tx) => {
      await tx.update(lessons)
        .set({ status })
        .where(eq(lessons.id, lessonId));

      if (status === 'COMPLETED' || status === 'UNEXCUSED' || status === 'CANCELLED' || status === 'TEACHER_ABSENT') {
        const attendanceStatus = 
          status === 'COMPLETED' ? 'PRESENT' : 
          status === 'UNEXCUSED' ? 'UNEXCUSED' : 
          status === 'TEACHER_ABSENT' ? 'TEACHER_ABSENT' : 'EXCUSED';

        const excuseReason = 
          status === 'TEACHER_ABSENT' ? 'Öğretmen derse katılım sağlamadı' : null;

        await tx.delete(lessonAttendance).where(eq(lessonAttendance.lessonId, lessonId));
        await tx.insert(lessonAttendance).values({
          organizationId: user.organizationId,
          lessonId: lessonId,
          status: attendanceStatus,
          excuseReason,
          excuseReportedAt: (status === 'TEACHER_ABSENT' || status === 'CANCELLED') ? new Date() : null,
        });
      } else if (status === 'PLANNED') {
        // Durum Planlandı olarak sıfırlandığında önceki yoklama kayıtlarını temizle
        await tx.delete(lessonAttendance).where(eq(lessonAttendance.lessonId, lessonId));
      }

      // Balance logic: ONLY COMPLETED and UNEXCUSED deduct from student's package balance
      // TEACHER_ABSENT and CANCELLED DO NOT deduct!
      const isCompletedOrUnexcused = (st: string) => st === 'COMPLETED' || st === 'UNEXCUSED';
      const wasDeducted = isCompletedOrUnexcused(oldStatus);
      const nowDeducted = isCompletedOrUnexcused(status);

      if (packageId) {
        if (nowDeducted && !wasDeducted) {
          const [pkg] = await tx.select().from(educationPackages).where(eq(educationPackages.id, packageId));
          if (pkg) {
            const currentConsumed = parseInt(pkg.consumedMinutes || '0', 10);
            await tx.update(educationPackages)
              .set({ consumedMinutes: (currentConsumed + 60).toString() })
              .where(eq(educationPackages.id, packageId));
              
            await tx.insert(packageBalanceTransactions).values({
              organizationId: user.organizationId,
              packageId: packageId,
              transactionType: 'DEDUCT',
              amountMinutes: '60',
              idempotentKey: `lesson-deduct-${status}-${lessonId}`,
              notes: status === 'COMPLETED' ? 'Ders katılımı' : 'Mazeretsiz devamsızlık',
            });
          }
        } else if (!nowDeducted && wasDeducted) {
          const [pkg] = await tx.select().from(educationPackages).where(eq(educationPackages.id, packageId));
          if (pkg) {
            const currentConsumed = parseInt(pkg.consumedMinutes || '0', 10);
            await tx.update(educationPackages)
              .set({ consumedMinutes: Math.max(0, currentConsumed - 60).toString() })
              .where(eq(educationPackages.id, packageId));
              
            await tx.insert(packageBalanceTransactions).values({
              organizationId: user.organizationId,
              packageId: packageId,
              transactionType: 'ADJUSTMENT',
              amountMinutes: '60',
              idempotentKey: `lesson-revert-${status}-${lessonId}`,
              notes: status === 'TEACHER_ABSENT' ? 'Öğretmen mazereti (Ders iadesi)' : 'Ders iptali/durum değişikliği iadesi',
            });
          }
        }
      }
    });

    revalidatePath('/calendar');
    revalidatePath('/attendance');
    revalidatePath('/reports');
    revalidatePath('/lessons');
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { error: 'Yoklama güncellenemedi.' };
  }
}

export async function deleteLessonAction(lessonId: string) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Unauthorized' };

  try {
    const [existingLesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
    if (!existingLesson) return { error: 'Ders bulunamadı.' };

    // If it was COMPLETED or UNEXCUSED, revert the package balance before deleting
    if ((existingLesson.status === 'COMPLETED' || existingLesson.status === 'UNEXCUSED') && existingLesson.packageId) {
      const duration = 60; // 1 lesson = 1 hour deduction
      const [pkg] = await db.select().from(educationPackages).where(eq(educationPackages.id, existingLesson.packageId));
      if (pkg) {
        const currentConsumed = parseInt(pkg.consumedMinutes || '0', 10);
        await db.update(educationPackages)
          .set({ consumedMinutes: Math.max(0, currentConsumed - duration).toString() })
          .where(eq(educationPackages.id, existingLesson.packageId));
      }
    }

    // Delete attendance records if any for the current lesson
    await db.delete(lessonAttendance).where(eq(lessonAttendance.lessonId, lessonId));
    // Delete the lesson itself
    await db.delete(lessons).where(eq(lessons.id, lessonId));

    // Yıl boyunca silme (Tüm seriyi sil)
    if (existingLesson.seriesId) {
      // Find all future PLANNED lessons in the same series
      const futureLessons = await db.select().from(lessons).where(and(
        eq(lessons.seriesId, existingLesson.seriesId),
        gte(lessons.startTime, existingLesson.startTime),
        eq(lessons.status, 'PLANNED')
      ));
      
      for (const futureLesson of futureLessons) {
        await db.delete(lessonAttendance).where(eq(lessonAttendance.lessonId, futureLesson.id));
        await db.delete(lessons).where(eq(lessons.id, futureLesson.id));
      }
    }

    revalidatePath('/calendar');
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { error: 'Ders silinemedi.' };
  }
}

