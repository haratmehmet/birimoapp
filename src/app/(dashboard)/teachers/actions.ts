'use server';

import { db } from '@/db';
import { teachers, users, userRoles, roles, teacherSubjects } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export async function createTeacherAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Yetkisiz erişim.' };

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const subjectId = formData.get('subjectId') as string;
  const compensationModel = formData.get('compensationModel') as string; // HOURLY, MONTHLY, AGREEMENT
  const compensationRate = formData.get('compensationRate') as string;
  const gender = formData.get('gender') as string; // MALE, FEMALE
  const phone = formData.get('phone') as string;

  if (!firstName || !lastName || !username || !password || !subjectId || !compensationModel || !gender) {
    return { error: 'Lütfen tüm zorunlu alanları doldurun.' };
  }

  try {
    await db.transaction(async (tx) => {
      // 1. Get or Create Teacher Role
      let [teacherRole] = await tx.select().from(roles).where(eq(roles.name, 'TEACHER'));
      
      // 2. Create User
      const [newUser] = await tx.insert(users).values({
        organizationId: user.organizationId!,
        firstName,
        lastName,
        username,
        passwordHash: await hashPassword(password),
        phone,
        gender,
        isActive: true,
      }).returning();

      // 3. Assign Role to User
      if (teacherRole) {
        await tx.insert(userRoles).values({
          userId: newUser.id,
          roleId: teacherRole.id,
          organizationId: user.organizationId!,
        });
      }

      // 4. Create Teacher Record
      const [newTeacher] = await tx.insert(teachers).values({
        organizationId: user.organizationId!,
        userId: newUser.id,
        compensationModel,
        compensationRate: compensationRate || '0',
      }).returning();

      // 5. Assign Subject
      await tx.insert(teacherSubjects).values({
        organizationId: user.organizationId!,
        teacherId: newTeacher.id,
        subjectId,
      });
    });

    revalidatePath('/teachers');
    return { success: 'Öğretmen başarıyla eklendi.' };
  } catch (error: any) {
    console.error('Öğretmen Ekleme Hatası:', error);
    if (error.code === '23505' || error.message?.includes('unique constraint')) {
      return { error: 'Bu e-posta (kullanıcı adı) ile daha önce kayıt yapılmış.' };
    }
    return { error: 'Öğretmen eklenirken bir hata oluştu.' };
  }
}

export async function deleteTeacherAction(userId: string) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Yetkisiz erişim.' };

  try {
    const [teacher] = await db.select().from(teachers).where(and(eq(teachers.userId, userId), eq(teachers.organizationId, user.organizationId!)));
    if (!teacher) return { error: 'Öğretmen bulunamadı.' };

    await db.transaction(async (tx) => {
      await tx.update(teachers).set({ isArchived: true }).where(eq(teachers.id, teacher.id));
      await tx.update(users).set({ isActive: false }).where(eq(users.id, userId));
    });

    revalidatePath('/teachers');
    revalidatePath('/teachers/pool');
    return { success: true };
  } catch (error) {
    console.error('Öğretmen Arşivleme Hatası:', error);
    return { error: 'Öğretmen havuza gönderilirken bir hata oluştu.' };
  }
}

export async function restoreTeacherAction(teacherId: string, userId: string) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Yetkisiz erişim.' };

  try {
    await db.transaction(async (tx) => {
      await tx.update(teachers).set({ isArchived: false }).where(and(eq(teachers.id, teacherId), eq(teachers.organizationId, user.organizationId!)));
      await tx.update(users).set({ isActive: true }).where(and(eq(users.id, userId), eq(users.organizationId, user.organizationId!)));
    });

    revalidatePath('/teachers');
    revalidatePath('/teachers/pool');
    return { success: true };
  } catch (error) {
    console.error('Öğretmen Geri Yükleme Hatası:', error);
    return { error: 'Öğretmen geri yüklenirken bir hata oluştu.' };
  }
}

export async function editTeacherAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Yetkisiz erişim.' };

  const teacherId = formData.get('teacherId') as string;
  const userId = formData.get('userId') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const subjectId = formData.get('subjectId') as string;
  const compensationModel = formData.get('compensationModel') as string;
  const compensationRate = formData.get('compensationRate') as string;
  const gender = formData.get('gender') as string;
  const phone = formData.get('phone') as string;

  if (!teacherId || !userId || !firstName || !lastName || !username || !subjectId || !compensationModel || !gender) {
    return { error: 'Lütfen tüm zorunlu alanları doldurun.' };
  }

  try {
    await db.transaction(async (tx) => {
      // Update User
      const userUpdatePayload: any = {
        firstName,
        lastName,
        username,
        phone,
        gender,
      };
      if (password) {
        userUpdatePayload.passwordHash = await hashPassword(password);
      }

      await tx.update(users)
        .set(userUpdatePayload)
        .where(and(eq(users.id, userId), eq(users.organizationId, user.organizationId!)));

      // Update Teacher
      await tx.update(teachers)
        .set({
          compensationModel,
          compensationRate: compensationRate || '0',
        })
        .where(and(eq(teachers.id, teacherId), eq(teachers.organizationId, user.organizationId!)));

      // Update Subject
      await tx.delete(teacherSubjects)
        .where(and(eq(teacherSubjects.teacherId, teacherId), eq(teacherSubjects.organizationId, user.organizationId!)));
        
      await tx.insert(teacherSubjects).values({
        organizationId: user.organizationId!,
        teacherId: teacherId,
        subjectId,
      });
    });

    revalidatePath('/teachers');
    return { success: 'Öğretmen başarıyla güncellendi.' };
  } catch (error: any) {
    console.error('Öğretmen Güncelleme Hatası:', error);
    if (error.code === '23505' || error.message?.includes('unique constraint')) {
      return { error: 'Bu e-posta (kullanıcı adı) ile daha önce kayıt yapılmış.' };
    }
    return { error: 'Öğretmen güncellenirken bir hata oluştu.' };
  }
}
