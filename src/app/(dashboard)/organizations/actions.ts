'use server';

import { db } from '@/db';
import { organizations, users, userRoles, roles } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { logActivity } from '@/lib/audit';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';

export async function createOrganizationAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  
  if (!user || user.organizationId !== null) {
    return { error: 'Bu işlem için yetkiniz yok.' };
  }

  const name = (formData.get('name') as string)?.trim();
  const logoUrl = (formData.get('logoUrl') as string)?.trim() || null;
  const faviconUrl = (formData.get('faviconUrl') as string)?.trim() || null;
  const phone = (formData.get('phone') as string)?.trim() || null;
  const email = (formData.get('email') as string)?.trim() || null;
  const address = (formData.get('address') as string)?.trim() || null;
  const taxOffice = (formData.get('taxOffice') as string)?.trim() || null;
  const taxNumber = (formData.get('taxNumber') as string)?.trim() || null;
  const scheduleStartTime = (formData.get('scheduleStartTime') as string)?.trim() || '08:00';
  const scheduleEndTime = (formData.get('scheduleEndTime') as string)?.trim() || '18:00';
  const lessonDurationMinutes = (formData.get('lessonDurationMinutes') as string)?.trim() || '50';
  const breakDurationMinutes = (formData.get('breakDurationMinutes') as string)?.trim() || '10';

  const adminEmail = (formData.get('adminEmail') as string)?.trim();
  const adminPassword = (formData.get('adminPassword') as string)?.trim();
  const adminFirstName = (formData.get('adminFirstName') as string)?.trim();
  const adminLastName = (formData.get('adminLastName') as string)?.trim();
  const adminPhone = (formData.get('adminPhone') as string)?.trim() || null;

  if (!name || !adminEmail || !adminPassword || !adminFirstName || !adminLastName) {
    return { error: 'Lütfen zorunlu tüm alanları doldurun.' };
  }

  try {
    // Check if email already in use
    const existingUser = await db.select().from(users).where(eq(users.username, adminEmail));
    if (existingUser.length > 0) {
      return { error: 'Bu kullanıcı adı / e-posta adresi zaten kullanımda.' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(adminPassword, 10);

    // Create organization
    const [newOrg] = await db.insert(organizations).values({
      name,
      logoUrl,
      faviconUrl,
      phone,
      email,
      address,
      taxOffice,
      taxNumber,
      scheduleStartTime,
      scheduleEndTime,
      lessonDurationMinutes,
      breakDurationMinutes,
    }).returning();

    // Create org admin user
    const [newAdmin] = await db.insert(users).values({
      organizationId: newOrg.id,
      username: adminEmail,
      passwordHash,
      firstName: adminFirstName,
      lastName: adminLastName,
      phone: adminPhone,
      isActive: true,
    }).returning();

    // Ensure ORG_ADMIN role exists
    let [orgAdminRole] = await db.select().from(roles).where(eq(roles.name, 'ORG_ADMIN'));
    if (!orgAdminRole) {
      const [newRole] = await db.insert(roles).values({
        name: 'ORG_ADMIN',
        description: 'Kurum Yöneticisi',
      }).returning();
      orgAdminRole = newRole;
    }

    // Assign role
    await db.insert(userRoles).values({
      userId: newAdmin.id,
      roleId: orgAdminRole.id,
      organizationId: newOrg.id,
    });

    // Log action
    await logActivity({
      userId: user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
      organizationId: newOrg.id,
      action: 'ORG_CREATE',
      category: 'ORGANIZATION',
      details: `Yeni kurum oluşturuldu: ${name} (Kurum Sahibi / Yetkili: ${adminFirstName} ${adminLastName})`,
    });

    revalidatePath('/organizations');
    return { success: 'Kurum ve yetkili hesabı başarıyla oluşturuldu.' };
  } catch (error: any) {
    console.error(error);
    return { error: error?.message || 'Kurum oluşturulurken bir hata oluştu.' };
  }
}

export async function updateOrganizationAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  
  if (!user || user.organizationId !== null) {
    return { error: 'Bu işlem için yetkiniz yok.' };
  }

  const id = formData.get('id') as string;
  const name = (formData.get('name') as string)?.trim();
  const logoUrl = (formData.get('logoUrl') as string)?.trim() || null;
  const faviconUrl = (formData.get('faviconUrl') as string)?.trim() || null;
  const phone = (formData.get('phone') as string)?.trim() || null;
  const email = (formData.get('email') as string)?.trim() || null;
  const address = (formData.get('address') as string)?.trim() || null;
  const taxOffice = (formData.get('taxOffice') as string)?.trim() || null;
  const taxNumber = (formData.get('taxNumber') as string)?.trim() || null;
  const scheduleStartTime = (formData.get('scheduleStartTime') as string)?.trim() || '08:00';
  const scheduleEndTime = (formData.get('scheduleEndTime') as string)?.trim() || '18:00';
  const lessonDurationMinutes = (formData.get('lessonDurationMinutes') as string)?.trim() || '50';
  const breakDurationMinutes = (formData.get('breakDurationMinutes') as string)?.trim() || '10';

  // Kurum Sahibi / Yetkili Bilgileri
  const adminFirstName = (formData.get('adminFirstName') as string)?.trim() || null;
  const adminLastName = (formData.get('adminLastName') as string)?.trim() || null;
  const adminPhone = (formData.get('adminPhone') as string)?.trim() || null;
  const adminEmail = (formData.get('adminEmail') as string)?.trim() || null;
  const adminPassword = (formData.get('adminPassword') as string)?.trim() || null;

  if (!id || !name) {
    return { error: 'Kurum ID ve Kurum Adı zorunludur.' };
  }

  try {
    await db.update(organizations).set({
      name,
      logoUrl,
      faviconUrl,
      phone,
      email,
      address,
      taxOffice,
      taxNumber,
      scheduleStartTime,
      scheduleEndTime,
      lessonDurationMinutes,
      breakDurationMinutes,
    }).where(eq(organizations.id, id));

    // Update Kurum Sahibi / ORG_ADMIN if provided
    if (adminFirstName || adminLastName || adminPhone || adminEmail) {
      // Find existing ORG_ADMIN for this organization
      const existingAdmins = await db
        .select({ id: users.id, username: users.username })
        .from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(users.organizationId, id))
        .limit(1);

      if (existingAdmins.length > 0) {
        const adminId = existingAdmins[0].id;
        const updateData: any = {};
        if (adminFirstName !== null) updateData.firstName = adminFirstName;
        if (adminLastName !== null) updateData.lastName = adminLastName;
        if (adminPhone !== null) updateData.phone = adminPhone;
        if (adminEmail && adminEmail !== existingAdmins[0].username) {
          const emailCheck = await db.select().from(users).where(eq(users.username, adminEmail));
          if (emailCheck.length > 0) {
            return { error: 'Bu kullanıcı adı / e-posta adresi başka bir hesap tarafından kullanılıyor.' };
          }
          updateData.username = adminEmail;
        }
        if (adminPassword) {
          updateData.passwordHash = await bcrypt.hash(adminPassword, 10);
        }
        if (Object.keys(updateData).length > 0) {
          await db.update(users).set(updateData).where(eq(users.id, adminId));
        }
      } else if (adminFirstName && adminLastName && adminEmail) {
        // Create new ORG_ADMIN user if none existed
        let [orgAdminRole] = await db.select().from(roles).where(eq(roles.name, 'ORG_ADMIN'));
        if (!orgAdminRole) {
          const [newRole] = await db.insert(roles).values({
            name: 'ORG_ADMIN',
            description: 'Kurum Yöneticisi',
          }).returning();
          orgAdminRole = newRole;
        }

        const pwdHash = await bcrypt.hash(adminPassword || '123456', 10);
        const [newAdmin] = await db.insert(users).values({
          organizationId: id,
          username: adminEmail,
          passwordHash: pwdHash,
          firstName: adminFirstName,
          lastName: adminLastName,
          phone: adminPhone,
          isActive: true,
        }).returning();

        await db.insert(userRoles).values({
          userId: newAdmin.id,
          roleId: orgAdminRole.id,
          organizationId: id,
        });
      }
    }

    await logActivity({
      userId: user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
      organizationId: id,
      action: 'ORG_UPDATE',
      category: 'ORGANIZATION',
      details: `Kurum ve yetkili bilgileri güncellendi: ${name}`,
    });

    revalidatePath('/organizations');
    return { success: 'Kurum ve yetkili bilgileri başarıyla güncellendi.' };
  } catch (error: any) {
    console.error(error);
    return { error: error?.message || 'Kurum güncellenirken bir hata oluştu.' };
  }
}

export async function deleteOrganizationAction(id: string) {
  const { user } = await getCurrentSession();
  
  if (!user || user.organizationId !== null) {
    return { error: 'Bu işlem için yetkiniz yok.' };
  }

  try {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    if (!org) return { error: 'Kurum bulunamadı.' };

    await db.delete(organizations).where(eq(organizations.id, id));

    await logActivity({
      userId: user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
      organizationId: id,
      action: 'ORG_DELETE',
      category: 'ORGANIZATION',
      details: `Kurum silindi: ${org.name}`,
    });

    revalidatePath('/organizations');
    return { success: 'Kurum başarıyla silindi.' };
  } catch (error: any) {
    console.error(error);
    return { error: error?.message || 'Kurum silinirken bir hata oluştu.' };
  }
}

export async function impersonateOrganizationAction(orgId: string) {
  try {
    const { user } = await getCurrentSession();
    const isSuperAdmin = !user || user.organizationId === null || (user as any).isImpersonating === true || (user as any).originalRole === 'SUPER_ADMIN';
    
    if (!user || !isSuperAdmin) {
      return { error: 'Bu işlem için yetkiniz bulunmamaktadır.' };
    }

    const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId));
    if (!org) {
      return { error: 'Seçilen kurum sistemde bulunamadı.' };
    }

    const cookieStore = await cookies();
    cookieStore.set('impersonate_org_id', orgId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    await logActivity({
      userId: user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
      organizationId: orgId,
      action: 'ORG_IMPERSONATE',
      category: 'ORGANIZATION',
      details: `Süper admin "${org.name}" kurumunu yönetici yetkisiyle ziyarete başladı.`,
    });

    revalidatePath('/', 'layout');
    return { success: true, orgName: org.name };
  } catch (error: any) {
    console.error('Kurum ziyaret hatası:', error);
    return { error: error?.message || 'Kurum paneline bağlanırken beklenmeyen bir hata oluştu.' };
  }
}

export async function stopImpersonationAction() {
  const { user } = await getCurrentSession();
  
  const cookieStore = await cookies();
  const currentOrgId = cookieStore.get('impersonate_org_id')?.value;

  cookieStore.set('impersonate_org_id', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  });

  if (user && currentOrgId) {
    await logActivity({
      userId: user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
      organizationId: currentOrgId,
      action: 'ORG_IMPERSONATE_STOP',
      category: 'ORGANIZATION',
      details: `Süper admin kurum ziyaret modundan çıkıp süper admin paneline döndü.`,
    });
  }

  revalidatePath('/', 'layout');
  redirect('/organizations');
}

