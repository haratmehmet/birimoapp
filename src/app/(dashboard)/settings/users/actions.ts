'use server';

import { db } from '@/db';
import { users, userRoles, roles } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import * as bcrypt from 'bcrypt';
import { eq, and } from 'drizzle-orm';

export async function createUserAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  
  if (!user || !user.organizationId || (user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN')) {
    return { error: 'Kurum yöneticisi değilsiniz veya oturumunuz geçersiz.' };
  }

  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const roleId = formData.get('roleId') as string;

  if (!username || !password || !firstName || !lastName || !roleId) {
    return { error: 'Lütfen tüm alanları doldurun.' };
  }

  try {
    // Validate role belongs to this org or is a global role
    // For now we assume roleId is valid from the select list

    const existingUser = await db.select().from(users).where(eq(users.username, username));
    if (existingUser.length > 0) {
      return { error: 'Bu e-posta adresi zaten kullanımda.' };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      organizationId: user.organizationId,
      username,
      passwordHash,
      firstName,
      lastName,
      isActive: true,
    }).returning();

    await db.insert(userRoles).values({
      userId: newUser.id,
      roleId,
      organizationId: user.organizationId,
    });

    revalidatePath('/users');
    return { success: 'Kullanıcı başarıyla oluşturuldu.' };
  } catch (error: any) {
    console.error(error);
    return { error: 'Kullanıcı oluşturulurken bir hata oluştu.' };
  }
}

export async function updateUserCredentialsAction(userId: string, username: string, password?: string) {
  const { user } = await getCurrentSession();
  
  if (!user || !user.organizationId || (user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN')) {
    return { error: 'Kurum yöneticisi değilsiniz.' };
  }

  try {
    const targetUser = await db.select().from(users).where(and(eq(users.id, userId), eq(users.organizationId, user.organizationId)));
    if (targetUser.length === 0) {
      return { error: 'Kullanıcı bulunamadı.' };
    }

    const updates: any = { username };
    
    if (password) {
      updates.passwordHash = await bcrypt.hash(password, 10);
    }

    await db.update(users).set(updates).where(eq(users.id, userId));

    revalidatePath('/settings/users');
    return { success: true };
  } catch (error: any) {
    console.error('Kullanıcı güncellenemedi:', error);
    return { error: 'Kullanıcı güncellenirken bir hata oluştu.' };
  }
}

export async function deleteUserAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId || (user.role !== 'SUPER_ADMIN' && user.role !== 'ORG_ADMIN')) {
    return { error: 'Yetkisiz erişim.' };
  }

  const userId = formData.get('userId') as string;
  if (!userId) {
    return { error: 'Kullanıcı bulunamadı.' };
  }

  try {
    await db.delete(users).where(and(
      eq(users.id, userId),
      eq(users.organizationId, user.organizationId)
    ));
    revalidatePath('/settings/users');
    return { success: true };
  } catch (error) {
    console.error('Kullanıcı silinemedi:', error);
    return { error: 'Kullanıcı silinirken bir hata oluştu.' };
  }
}
