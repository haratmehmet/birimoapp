'use server';

import { db } from '@/db';
import { users, organizations, roles, userRoles, teachers } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { logActivity } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

export async function createAdminUserAction(prevState: any, formData: FormData) {
  const { user: currentUser } = await getCurrentSession();

  if (!currentUser || currentUser.organizationId !== null) {
    return { error: 'Bu işlem için Süper Admin yetkisi gereklidir.' };
  }

  const username = (formData.get('username') as string)?.trim();
  const password = (formData.get('password') as string)?.trim();
  const firstName = (formData.get('firstName') as string)?.trim();
  const lastName = (formData.get('lastName') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim() || null;
  const organizationIdRaw = (formData.get('organizationId') as string)?.trim();
  const targetRole = (formData.get('role') as string)?.trim(); // 'SUPER_ADMIN' | 'ORG_ADMIN' | 'STAFF' | 'TEACHER'

  const organizationId = targetRole === 'SUPER_ADMIN' || !organizationIdRaw ? null : organizationIdRaw;

  if (!username || !password || !firstName || !lastName || !targetRole) {
    return { error: 'Lütfen zorunlu alanları doldurun.' };
  }

  if (targetRole !== 'SUPER_ADMIN' && !organizationId) {
    return { error: 'Süper admin haricindeki kullanıcılar için kurum seçimi zorunludur.' };
  }

  try {
    const existing = await db.select().from(users).where(eq(users.username, username));
    if (existing.length > 0) {
      return { error: 'Bu kullanıcı adı zaten kullanımda.' };
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [newUser] = await db.insert(users).values({
      username,
      passwordHash,
      firstName,
      lastName,
      phone,
      organizationId,
      isActive: true,
    }).returning();

    // Assign role if it's an org user
    if (organizationId && targetRole !== 'SUPER_ADMIN') {
      let [roleRecord] = await db.select().from(roles).where(eq(roles.name, targetRole));
      if (!roleRecord) {
        const [createdRole] = await db.insert(roles).values({
          name: targetRole,
          description: targetRole === 'ORG_ADMIN' ? 'Kurum Yöneticisi' : (targetRole === 'STAFF' ? 'Yetkili' : 'Öğretmen'),
          organizationId,
        }).returning();
        roleRecord = createdRole;
      }

      await db.insert(userRoles).values({
        userId: newUser.id,
        roleId: roleRecord.id,
        organizationId,
      });

      if (targetRole === 'TEACHER') {
        await db.insert(teachers).values({
          userId: newUser.id,
          organizationId,
          compensationModel: 'HOURLY',
          compensationRate: '0',
        });
      }
    }

    await logActivity({
      userId: currentUser.id,
      userName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username,
      organizationId,
      action: 'USER_CREATE',
      category: 'USER',
      details: `Yeni kullanıcı oluşturuldu: ${firstName} ${lastName} (@${username}) - Rol: ${targetRole}`,
    });

    revalidatePath('/admin/users');
    return { success: 'Kullanıcı başarıyla oluşturuldu.' };
  } catch (error: any) {
    console.error(error);
    return { error: error?.message || 'Kullanıcı oluşturulurken bir hata oluştu.' };
  }
}

export async function updateAdminUserAction(prevState: any, formData: FormData) {
  const { user: currentUser } = await getCurrentSession();

  if (!currentUser || currentUser.organizationId !== null) {
    return { error: 'Bu işlem için Süper Admin yetkisi gereklidir.' };
  }

  const id = formData.get('id') as string;
  const username = (formData.get('username') as string)?.trim();
  const firstName = (formData.get('firstName') as string)?.trim();
  const lastName = (formData.get('lastName') as string)?.trim();
  const phone = (formData.get('phone') as string)?.trim() || null;
  const organizationIdRaw = (formData.get('organizationId') as string)?.trim();
  const targetRole = (formData.get('role') as string)?.trim();
  const isActive = formData.get('isActive') === 'true';

  const organizationId = targetRole === 'SUPER_ADMIN' || !organizationIdRaw ? null : organizationIdRaw;

  if (!id || !username || !firstName || !lastName) {
    return { error: 'Lütfen zorunlu alanları doldurun.' };
  }

  try {
    // Check username collision
    const existing = await db.select().from(users).where(eq(users.username, username));
    if (existing.length > 0 && existing[0].id !== id) {
      return { error: 'Bu kullanıcı adı başka bir hesap tarafından kullanılıyor.' };
    }

    await db.update(users).set({
      username,
      firstName,
      lastName,
      phone,
      organizationId,
      isActive,
    }).where(eq(users.id, id));

    // Update role if changed
    if (organizationId && targetRole && targetRole !== 'SUPER_ADMIN') {
      let [roleRecord] = await db.select().from(roles).where(eq(roles.name, targetRole));
      if (!roleRecord) {
        const [createdRole] = await db.insert(roles).values({
          name: targetRole,
          description: targetRole === 'ORG_ADMIN' ? 'Kurum Yöneticisi' : (targetRole === 'STAFF' ? 'Yetkili' : 'Öğretmen'),
          organizationId,
        }).returning();
        roleRecord = createdRole;
      }

      await db.delete(userRoles).where(eq(userRoles.userId, id));
      await db.insert(userRoles).values({
        userId: id,
        roleId: roleRecord.id,
        organizationId,
      });
    }

    await logActivity({
      userId: currentUser.id,
      userName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username,
      organizationId,
      action: 'USER_UPDATE',
      category: 'USER',
      details: `Kullanıcı bilgileri güncellendi: ${firstName} ${lastName} (@${username})`,
    });

    revalidatePath('/admin/users');
    return { success: 'Kullanıcı başarıyla güncellendi.' };
  } catch (error: any) {
    console.error(error);
    return { error: error?.message || 'Kullanıcı güncellenirken bir hata oluştu.' };
  }
}

export async function resetUserPasswordAction(userId: string, newPass: string) {
  const { user: currentUser } = await getCurrentSession();

  if (!currentUser || currentUser.organizationId !== null) {
    return { error: 'Bu işlem için Süper Admin yetkisi gereklidir.' };
  }

  if (!newPass || newPass.length < 6) {
    return { error: 'Şifre en az 6 karakter olmalıdır.' };
  }

  try {
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) return { error: 'Kullanıcı bulunamadı.' };

    const passwordHash = await bcrypt.hash(newPass, 10);
    await db.update(users).set({ passwordHash }).where(eq(users.id, userId));

    await logActivity({
      userId: currentUser.id,
      userName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username,
      organizationId: targetUser.organizationId,
      action: 'PASSWORD_RESET',
      category: 'USER',
      details: `Kullanıcı şifresi sıfırlandı: @${targetUser.username} (${targetUser.firstName} ${targetUser.lastName})`,
    });

    revalidatePath('/admin/users');
    return { success: 'Şifre başarıyla güncellendi.' };
  } catch (error: any) {
    console.error(error);
    return { error: error?.message || 'Şifre sıfırlanırken bir hata oluştu.' };
  }
}

export async function toggleUserStatusAction(userId: string) {
  const { user: currentUser } = await getCurrentSession();

  if (!currentUser || currentUser.organizationId !== null) {
    return { error: 'Bu işlem için Süper Admin yetkisi gereklidir.' };
  }

  try {
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) return { error: 'Kullanıcı bulunamadı.' };

    const nextStatus = !targetUser.isActive;
    await db.update(users).set({ isActive: nextStatus }).where(eq(users.id, userId));

    await logActivity({
      userId: currentUser.id,
      userName: `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username,
      organizationId: targetUser.organizationId,
      action: 'USER_STATUS_TOGGLE',
      category: 'USER',
      details: `Kullanıcı durumu değiştirildi: @${targetUser.username} (${nextStatus ? 'Aktif' : 'Pasif'})`,
    });

    revalidatePath('/admin/users');
    return { success: `Kullanıcı ${nextStatus ? 'aktif' : 'pasif'} duruma getirildi.` };
  } catch (error: any) {
    console.error(error);
    return { error: error?.message || 'İşlem başarısız.' };
  }
}
