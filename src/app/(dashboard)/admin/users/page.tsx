import { db } from '@/db';
import { users, organizations, roles, userRoles, teachers, roleModulePermissions } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { desc, eq, asc } from 'drizzle-orm';
import { AdminUsersClient } from './AdminUsersClient';

export default async function AdminUsersPage() {
  const { user } = await getCurrentSession();

  // Only SUPER_ADMIN (organizationId === null) can access
  if (!user || user.organizationId !== null) {
    redirect('/dashboard');
  }

  // Fetch all users with their organization, roles and teacher status
  const rawUsers = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      phone: users.phone,
      organizationId: users.organizationId,
      organizationName: organizations.name,
      orgLogoUrl: organizations.logoUrl,
      role: roles.name,
      roleDescription: roles.description,
      teacherId: teachers.id,
      isActive: users.isActive,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(organizations, eq(users.organizationId, organizations.id))
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(teachers, eq(teachers.userId, users.id))
    .orderBy(desc(users.createdAt));

  // Role hierarchy priority for sorting:
  // 1. SUPER_ADMIN (Süper Admin)
  // 2. ORG_ADMIN (Kurum Yöneticisi)
  // 3. STAFF (Yetkili)
  // 4. TEACHER (Öğretmen)
  const roleOrder: Record<string, number> = {
    'SUPER_ADMIN': 1,
    'ORG_ADMIN': 2,
    'STAFF': 3,
    'TEACHER': 4,
  };

  // De-duplicate users (in case of multiple roles/records) and compute effective role
  const userMap = new Map<string, any>();
  for (const row of rawUsers) {
    if (!userMap.has(row.id)) {
      let role = row.role;
      let roleDescription = row.roleDescription;

      if (row.organizationId === null || role === 'SUPER_ADMIN') {
        role = 'SUPER_ADMIN';
        roleDescription = 'Süper Admin';
      } else if (row.teacherId || role === 'TEACHER') {
        role = 'TEACHER';
        roleDescription = 'Öğretmen';
      } else if (role === 'STAFF') {
        role = 'STAFF';
        roleDescription = 'Yetkili';
      } else if (role === 'ORG_ADMIN') {
        role = 'ORG_ADMIN';
        roleDescription = 'Kurum Yöneticisi';
      } else {
        role = 'ORG_ADMIN';
        roleDescription = 'Kurum Yöneticisi';
      }

      userMap.set(row.id, {
        id: row.id,
        username: row.username,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        organizationId: row.organizationId,
        organizationName: row.organizationName,
        orgLogoUrl: row.orgLogoUrl,
        role,
        roleDescription,
        isActive: row.isActive,
        createdAt: row.createdAt,
      });
    }
  }

  // Sort users by Role Priority (Süper Admin -> Kurum Yöneticisi -> Yetkili -> Öğretmen) then by Name
  const allUsers = Array.from(userMap.values()).sort((a, b) => {
    const orderA = roleOrder[a.role] || 99;
    const orderB = roleOrder[b.role] || 99;
    if (orderA !== orderB) return orderA - orderB;
    const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.username;
    const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim() || b.username;
    return nameA.localeCompare(nameB, 'tr');
  });

  // Fetch all organizations for dropdowns and institution cards
  const allOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      logoUrl: organizations.logoUrl,
    })
    .from(organizations)
    .orderBy(asc(organizations.name));

  // Fetch all module permission overrides
  const allOverrides = await db
    .select({
      id: roleModulePermissions.id,
      organizationId: roleModulePermissions.organizationId,
      role: roleModulePermissions.role,
      userId: roleModulePermissions.userId,
      moduleKey: roleModulePermissions.moduleKey,
      isEnabled: roleModulePermissions.isEnabled,
    })
    .from(roleModulePermissions);

  return <AdminUsersClient users={allUsers} organizations={allOrgs} overrides={allOverrides as any} />;
}
