'use server';

import { db } from '@/db';
import { roleModulePermissions, organizations, users } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { logActivity } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { eq, and, isNull } from 'drizzle-orm';

export async function toggleRoleModulePermissionAction(data: {
  organizationId: string;
  role: string;
  userId?: string | null;
  moduleKey: string;
  isEnabled: boolean;
}) {
  const { user: currentUser } = await getCurrentSession();

  if (!currentUser || currentUser.organizationId !== null) {
    return { error: 'Bu işlem için Süper Admin yetkisi gereklidir.' };
  }

  const { organizationId, role, userId = null, moduleKey, isEnabled } = data;

  if (!organizationId || !role || !moduleKey) {
    return { error: 'Eksik parametre gönderildi.' };
  }

  try {
    // Check if record exists
    const condition = and(
      eq(roleModulePermissions.organizationId, organizationId),
      eq(roleModulePermissions.role, role),
      eq(roleModulePermissions.moduleKey, moduleKey),
      userId ? eq(roleModulePermissions.userId, userId) : isNull(roleModulePermissions.userId)
    );

    const existing = await db
      .select({ id: roleModulePermissions.id })
      .from(roleModulePermissions)
      .where(condition);

    if (existing.length > 0) {
      await db
        .update(roleModulePermissions)
        .set({
          isEnabled,
          updatedAt: new Date(),
        })
        .where(eq(roleModulePermissions.id, existing[0].id));
    } else {
      await db.insert(roleModulePermissions).values({
        organizationId,
        role,
        userId: userId || null,
        moduleKey,
        isEnabled,
      });
    }

    // Get org name for nice audit log
    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    let targetDesc = `Rol: ${role}`;
    if (userId) {
      const [u] = await db.select({ firstName: users.firstName, lastName: users.lastName, username: users.username }).from(users).where(eq(users.id, userId));
      if (u) targetDesc = `Kullanıcı: ${u.firstName} ${u.lastName} (${u.username})`;
    }

    await logActivity({
      organizationId,
      action: 'PERMISSION_UPDATE',
      category: 'ORGANIZATION',
      panel: 'Süper Admin Paneli',
      status: 'SUCCESS',
      details: `${org?.name || 'Kurum'} için ${targetDesc} yetkilerinde '${moduleKey}' modülü ${isEnabled ? 'ETKİNLEŞTİRİLDİ' : 'DEVRE DIŞI BIRAKILDI'}.`,
    });

    revalidatePath('/admin/users/permissions');
    revalidatePath('/dashboard');
    return { success: true, isEnabled };
  } catch (err: any) {
    console.error('toggleRoleModulePermissionAction error:', err);
    return { error: 'Yetki güncellenirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata') };
  }
}

export async function resetRolePermissionsAction(data: {
  organizationId: string;
  role: string;
  userId?: string | null;
}) {
  const { user: currentUser } = await getCurrentSession();

  if (!currentUser || currentUser.organizationId !== null) {
    return { error: 'Bu işlem için Süper Admin yetkisi gereklidir.' };
  }

  const { organizationId, role, userId = null } = data;

  try {
    const condition = and(
      eq(roleModulePermissions.organizationId, organizationId),
      eq(roleModulePermissions.role, role),
      userId ? eq(roleModulePermissions.userId, userId) : isNull(roleModulePermissions.userId)
    );

    await db.delete(roleModulePermissions).where(condition);

    const [org] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, organizationId));

    await logActivity({
      organizationId,
      action: 'PERMISSION_RESET',
      category: 'ORGANIZATION',
      panel: 'Süper Admin Paneli',
      status: 'SUCCESS',
      details: `${org?.name || 'Kurum'} için ${role} rolünün modül yetkileri fabrika varsayılanlarına sıfırlandı.`,
    });

    revalidatePath('/admin/users/permissions');
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    console.error('resetRolePermissionsAction error:', err);
    return { error: 'Yetkiler sıfırlanırken hata oluştu.' };
  }
}
