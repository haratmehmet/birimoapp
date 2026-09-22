// @ts-nocheck
'use server';

import { db } from '@/db';
import { teacherAvailability } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateTeacherAvailabilityAction(
  teacherId: string, 
  availabilities: { dayOfWeek: string; startTime: string; endTime: string }[]
) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Unauthorized' };

  try {
    // 1. Delete old availabilities for this teacher
    await db.delete(teacherAvailability)
      .where(and(
        eq(teacherAvailability.teacherId, teacherId),
        eq(teacherAvailability.organizationId, user.organizationId)
      ));

    // 2. Insert new ones
    if (availabilities.length > 0) {
      await db.insert(teacherAvailability).values(
        availabilities.map(a => ({
          organizationId: user.organizationId!,
          teacherId,
          dayOfWeek: a.dayOfWeek,
          startTime: a.startTime,
          endTime: a.endTime,
        }))
      );
    }

    revalidatePath(`/teachers/${teacherId}`);
    return { success: true };
  } catch (error: any) {
    console.error("Error updating availability:", error);
    return { error: 'Müsaitlik saatleri kaydedilemedi.' };
  }
}

export async function getTeacherPerformanceStatsAction(
  teacherId: string, 
  filter: 'all' | 'daily' | 'weekly' | 'monthly' | 'custom',
  customStartDate?: string,
  customEndDate?: string
) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Unauthorized' };

  try {
    const { students, lessons, subjects } = await import('@/db/schema');
    const { eq, and, sql, desc, gte, lte } = await import('drizzle-orm');
    
    let dateFilter = undefined;
    if (filter === 'custom' && customStartDate && customEndDate) {
      const sDate = new Date(customStartDate);
      sDate.setHours(0, 0, 0, 0);
      const eDate = new Date(customEndDate);
      eDate.setHours(23, 59, 59, 999);
      dateFilter = and(gte(lessons.startTime, sDate), lte(lessons.startTime, eDate));
    } else if (filter !== 'all') {
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();
      if (filter === 'daily') {
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
      } else if (filter === 'weekly') {
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        startDate = new Date(startDate.setDate(diff));
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (filter === 'monthly') {
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);
      }
      dateFilter = and(gte(lessons.startTime, startDate), lte(lessons.startTime, endDate));
    }

    const conditions = dateFilter 
      ? and(eq(lessons.teacherId, teacherId), eq(lessons.status, 'COMPLETED'), dateFilter)
      : and(eq(lessons.teacherId, teacherId), eq(lessons.status, 'COMPLETED'));

    // Fetch completed lesson counts
    const [{ count }] = await db.select({
      count: sql<number>`count(*)`
    })
    .from(lessons)
    .where(conditions);

    // Fetch unique student count
    const [{ studentCount }] = await db.select({
      studentCount: sql<number>`count(distinct ${lessons.studentId})`
    })
    .from(lessons)
    .where(conditions);

    // Fetch detailed student lesson stats
    const detailedStudents = await db.select({
      studentId: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      completedHours: sql<number>`count(${lessons.id})::int`,
      lastLessonDate: sql<Date>`max(${lessons.endTime})`,
    })
    .from(lessons)
    .innerJoin(students, eq(lessons.studentId, students.id))
    .where(conditions)
    .groupBy(students.id, students.firstName, students.lastName)
    .orderBy(desc(sql`count(${lessons.id})`));

    // Fetch individual completed lessons for detailed records view
    const lessonsList = await db.select({
      id: lessons.id,
      startTime: lessons.startTime,
      endTime: lessons.endTime,
      durationMinutes: lessons.durationMinutes,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      subjectName: subjects.name,
    })
    .from(lessons)
    .innerJoin(students, eq(lessons.studentId, students.id))
    .innerJoin(subjects, eq(lessons.subjectId, subjects.id))
    .where(conditions)
    .orderBy(desc(lessons.startTime));

    return { 
      success: true, 
      data: {
        completedLessonsCount: Number(count) || 0,
        studentCount: Number(studentCount) || 0,
        detailedStudents,
        lessonsList,
      }
    };
  } catch (error: any) {
    console.error("Error fetching performance stats:", error);
    return { error: 'Performans verileri alınamadı.' };
  }
}

