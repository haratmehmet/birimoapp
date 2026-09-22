// @ts-nocheck
'use server';

import { db } from '@/db';
import { educationRequests, educationRequestItems, educationPackages } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

export async function createRequestAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Yetkisiz erişim.' };

  const studentId = formData.get('studentId') as string;
  const subjectIds = formData.getAll('subjectIds') as string[];
  const notes = formData.get('notes') as string;

  if (!studentId || subjectIds.length === 0) {
    return { error: 'Öğrenci ve en az bir branş seçmelisiniz.' };
  }

  try {
    const finalNotes = notes.trim() === '' ? null : notes.trim();
    const [newRequest] = await db.insert(educationRequests).values({
      organizationId: user.organizationId!,
      studentId,
      notes: finalNotes,
    }).returning();

    for (const subjectId of subjectIds) {
      await db.insert(educationRequestItems).values({
        organizationId: user.organizationId!,
        requestId: newRequest.id,
        subjectId,
      });
    }

    revalidatePath('/requests');
    return { success: 'Eğitim talebi başarıyla oluşturuldu.' };
  } catch (error: any) {
    console.error(error);
    return { error: 'Talep oluşturulurken bir hata oluştu.' };
  }
}

export async function convertToPackageAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Yetkisiz erişim.' };

  const requestId = formData.get('requestId') as string;
  const studentId = formData.get('studentId') as string;
  const totalMinutes = formData.get('totalMinutes') as string;
  const title = formData.get('title') as string;

  if (!requestId || !studentId || !totalMinutes || !title) {
    return { error: 'Eksik bilgi.' };
  }

  try {
    // 1. Create Package
    await db.insert(educationPackages).values({
      organizationId: user.organizationId!,
      studentId,
      requestId,
      title,
      totalMinutes,
    });

    // 2. Update Request Status
    await db.update(educationRequests)
      .set({ status: 'APPROVED' })
      .where(eq(educationRequests.id, requestId));

    revalidatePath('/requests');
    revalidatePath('/packages');
    return { success: 'Talep başarıyla pakete dönüştürüldü.' };
  } catch (error: any) {
    console.error(error);
    return { error: 'Paket oluşturulurken bir hata oluştu.' };
  }
}

export async function getTeachersForSubjectAction(subjectId: string) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Unauthorized', data: null };

  try {
    const { teachers, teacherSubjects, users } = await import('@/db/schema');
    const { eq, and } = await import('drizzle-orm');
    
    const availableTeachers = await db.select({
      id: teachers.id,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(teacherSubjects)
    .innerJoin(teachers, eq(teacherSubjects.teacherId, teachers.id))
    .innerJoin(users, eq(teachers.userId, users.id))
    .where(
      and(
        eq(teacherSubjects.organizationId, user.organizationId),
        eq(teacherSubjects.subjectId, subjectId),
        eq(teachers.isArchived, false)
      )
    );

    return { data: availableTeachers };
  } catch (e) {
    console.error(e);
    return { error: 'Öğretmenler getirilirken hata oluştu.', data: null };
  }
}

export async function getTeacherWeeklyScheduleAction(teacherId: string, baseDateStr?: string) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Unauthorized', data: null };

  try {
    const { teacherAvailability, lessons, students } = await import('@/db/schema');
    const { eq, and, gte, lt, inArray } = await import('drizzle-orm');
    const { addDays, startOfWeek } = await import('date-fns');

    // Get general availability settings (e.g. MONDAY 09:00 - 15:00)
    const availability = await db.select().from(teacherAvailability).where(eq(teacherAvailability.teacherId, teacherId));

    // Get actual lessons for the current week to show "Dolu"
    let now = baseDateStr ? new Date(baseDateStr) : new Date();
    if (now.getDay() === 0) {
      now = addDays(now, 1);
    }
    const startOfCurrentWeek = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const endOfCurrentWeek = addDays(startOfCurrentWeek, 7);

    const upcomingLessons = await db.select({
      id: lessons.id,
      startTime: lessons.startTime,
      endTime: lessons.endTime,
      status: lessons.status,
      seriesId: lessons.seriesId,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
    })
    .from(lessons)
    .innerJoin(students, eq(lessons.studentId, students.id))
    .where(
      and(
        eq(lessons.teacherId, teacherId),
        gte(lessons.startTime, startOfCurrentWeek),
        lt(lessons.startTime, endOfCurrentWeek),
        inArray(lessons.status, ['PLANNED', 'COMPLETED'])
      )
    );

    return { 
      data: {
        availability,
        upcomingLessons,
        weekStart: startOfCurrentWeek
      } 
    };
  } catch (e) {
    console.error(e);
    return { error: 'Öğretmen takvimi getirilirken hata oluştu.', data: null };
  }
}

export async function assignRequestTeacherAction(data: {
  requestId: string;
  studentId: string;
  teacherId: string;
  subjectId: string;
  packageId?: string; // Optional if they want to deduct from an existing package
  startTime: Date;
  durationMinutes: number;
  totalLessons?: number; // Added parameter
}) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Unauthorized' };

  try {
    const { lessons, educationRequests, educationPackages } = await import('@/db/schema');
    const { eq, and } = await import('drizzle-orm');
    const { addMinutes, addDays } = await import('date-fns');
    const crypto = await import('crypto');

    // 1. If packageId is not provided, we might need to find an active package for this student.
    // For now, let's assume we just create the lessons. If packageId is mandatory in DB, we find the latest package or create a dummy one.
    // Let's find an active package.
    let targetPackageId = data.packageId;
    let pkgDetails = null;

    if (!targetPackageId) {
      const activePackages = await db.select().from(educationPackages)
        .where(and(eq(educationPackages.studentId, data.studentId), eq(educationPackages.organizationId, user.organizationId!)))
        .limit(1); // Normally we'd order by newest or active
      
      if (activePackages.length === 0) {
        // Create a default package since MentorOS requires a packageId for a lesson
        const [newPkg] = await db.insert(educationPackages).values({
          organizationId: user.organizationId!,
          studentId: data.studentId,
          title: 'Otomatik Atama Paketi',
          totalMinutes: '2400', // Example 40 hours
        }).returning();
        targetPackageId = newPkg.id;
        pkgDetails = newPkg;
      } else {
        targetPackageId = activePackages[0].id;
        pkgDetails = activePackages[0];
      }
    } else {
      const pkgs = await db.select().from(educationPackages).where(eq(educationPackages.id, targetPackageId));
      if (pkgs.length > 0) pkgDetails = pkgs[0];
    }

    if (!pkgDetails) {
      return { error: 'Geçerli bir paket bulunamadı.' };
    }

    const { sql } = await import('drizzle-orm');
    const [plannedResult] = await db.select({
      totalPlanned: sql<number>`COUNT(${lessons.id}) * 60`
    })
    .from(lessons)
    .where(and(eq(lessons.packageId, targetPackageId), eq(lessons.status, 'PLANNED')));

    const plannedMin = Number(plannedResult?.totalPlanned || 0);
    const totalMin = parseInt(pkgDetails.totalMinutes, 10);
    const consumedMin = parseInt(pkgDetails.consumedMinutes || '0', 10);
    const remainingMin = totalMin - consumedMin - plannedMin;

    if (remainingMin < 60) {
      return { error: 'Öğrencinin atanabilir birebir paketi kalmamıştır.' };
    }

    const possibleLessons = Math.floor(remainingMin / 60);
    const requestedLessons = data.totalLessons === -1 ? possibleLessons : (data.totalLessons || possibleLessons);

    if (requestedLessons > possibleLessons) {
      return { error: `Paket bakiyesi yetersiz! Maksimum ${possibleLessons} ders (${possibleLessons} saat) daha planlayabilirsiniz.` };
    }

    const numLessonsToSchedule = Math.min(requestedLessons, possibleLessons, 52); 
    const seriesId = crypto.randomUUID();
    const newLessons = [];

    let currentStartTime = new Date(data.startTime);

    for (let i = 0; i < numLessonsToSchedule; i++) {
      const currentEndTime = addMinutes(currentStartTime, data.durationMinutes);
      
      newLessons.push({
        organizationId: user.organizationId!,
        studentId: data.studentId,
        teacherId: data.teacherId,
        subjectId: data.subjectId,
        packageId: targetPackageId,
        startTime: currentStartTime,
        endTime: currentEndTime,
        durationMinutes: '60', // Sistem kuralı: 1 ders oturumu her zaman 1 saat (60 dk) olarak kaydedilir
        status: 'PLANNED',
        seriesId: seriesId,
      });

      // Next week
      currentStartTime = addDays(currentStartTime, 7);
    }

    // Insert Lessons
    await db.insert(lessons).values(newLessons);

    // 3. Remove the assigned subject from the request items
    const { educationRequestItems } = await import('@/db/schema');
    
    await db.delete(educationRequestItems)
      .where(
        and(
          eq(educationRequestItems.requestId, data.requestId),
          eq(educationRequestItems.subjectId, data.subjectId)
        )
      );

    // 4. Check if there are any requested subjects left
    const remainingItems = await db.select().from(educationRequestItems)
      .where(eq(educationRequestItems.requestId, data.requestId));

    // 5. If no subjects left, mark Request as APPROVED
    if (remainingItems.length === 0) {
      await db.update(educationRequests)
        .set({ status: 'APPROVED' })
        .where(eq(educationRequests.id, data.requestId));
    }

    return { success: true };
  } catch (error: any) {
    console.error(error);
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
    return { error: `Ders ataması başarısız oldu. Detay: ${dbErr.message || JSON.stringify(dbErr)}` };
  }
}

export async function deleteRequestAction(requestId: string) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Unauthorized' };

  try {
    const { educationRequests } = await import('@/db/schema');
    const { eq, and } = await import('drizzle-orm');
    await db.delete(educationRequests).where(
      and(
        eq(educationRequests.id, requestId),
        eq(educationRequests.organizationId, user.organizationId)
      )
    );
    revalidatePath('/requests');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Talep silinirken hata oluştu.' };
  }
}

export async function getStudentRemainingHoursAction(studentId: string) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Unauthorized', hours: 0 };

  try {
    const { educationPackages } = await import('@/db/schema');
    const { eq, and } = await import('drizzle-orm');
    const packages = await db.select().from(educationPackages).where(and(eq(educationPackages.studentId, studentId), eq(educationPackages.organizationId, user.organizationId!)));
    
    let totalMin = 0;
    let consumedMin = 0;
    packages.forEach(p => {
      totalMin += parseInt(p.totalMinutes || '0', 10);
      consumedMin += parseInt(p.consumedMinutes || '0', 10);
    });
    
    const remainingMin = totalMin - consumedMin;
    const remainingHours = Math.floor(remainingMin / 60);
    
    return { hours: remainingHours };
  } catch (e) {
    console.error(e);
    return { error: 'Hata', hours: 0 };
  }
}

export async function updateRequestAction(requestId: string, subjectIds: string[], notes: string) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Unauthorized' };

  try {
    const { educationRequests, educationRequestItems } = await import('@/db/schema');
    const { eq } = await import('drizzle-orm');
    
    // Update notes
    const finalNotes = notes.trim() === '' ? null : notes.trim();
    await db.update(educationRequests)
      .set({ notes: finalNotes, updatedAt: new Date() })
      .where(eq(educationRequests.id, requestId));

    // Recreate items
    await db.delete(educationRequestItems).where(eq(educationRequestItems.requestId, requestId));
    
    if (subjectIds.length > 0) {
      await db.insert(educationRequestItems).values(
        subjectIds.map(subjectId => ({
          organizationId: user.organizationId!,
          requestId,
          subjectId
        }))
      );
    }
    
    revalidatePath('/requests');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Talep güncellenirken hata oluştu.' };
  }
}

export async function cancelLessonAction(lessonId: string, cancelSeries: boolean) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Unauthorized' };

  try {
    const { lessons } = await import('@/db/schema');
    const { eq, and, gte } = await import('drizzle-orm');
    const { db } = await import('@/db');

    // 1. Fetch the target lesson to ensure it exists and get its seriesId & startTime
    const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId)).limit(1);
    if (!lesson) return { error: 'Ders bulunamadı.' };

    const now = new Date();
    if (new Date(lesson.startTime) < now) {
      return { error: 'Geçmiş dersler iptal edilemez.' };
    }
    if (lesson.status !== 'PLANNED') {
      return { error: 'Sadece planlanmış dersler iptal edilebilir.' };
    }

    if (cancelSeries && lesson.seriesId) {
      // Cancel all future planned lessons in this series (from this date forward)
      await db.update(lessons)
        .set({ status: 'CANCELLED' })
        .where(
          and(
            eq(lessons.seriesId, lesson.seriesId),
            gte(lessons.startTime, lesson.startTime),
            eq(lessons.status, 'PLANNED'),
            eq(lessons.organizationId, user.organizationId)
          )
        );
    } else {
      // Cancel only this lesson
      await db.update(lessons)
        .set({ status: 'CANCELLED' })
        .where(
          and(
            eq(lessons.id, lessonId),
            eq(lessons.status, 'PLANNED'),
            eq(lessons.organizationId, user.organizationId)
          )
        );
    }

    return { success: true };
  } catch (error) {
    console.error('Error cancelling lesson:', error);
    return { error: 'Ders iptal edilirken bir hata oluştu.' };
  }
}

