import { db } from '@/db';
import { organizations, users, userRoles, roles, teachers, roleModulePermissions } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { asc, desc, eq } from 'drizzle-orm';
import { AdminPermissionsClient } from './AdminPermissionsClient';

export default async function AdminPermissionsPage() {
  const { user } = await getCurrentSession();

  // Only SUPER_ADMIN can access
  if (!user || user.organizationId !== null) {
    redirect('/dashboard');
  }

  // Fetch all organizations
  const allOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      logoUrl: organizations.logoUrl,
    })
    .from(organizations)
    .orderBy(asc(organizations.name));

  // Fetch all users with roles
  const rawUsers = await db
    .select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      organizationId: users.organizationId,
      role: roles.name,
      teacherId: teachers.id,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(teachers, eq(teachers.userId, users.id))
    .orderBy(desc(users.createdAt));

  const userMap = new Map<string, any>();
  for (const row of rawUsers) {
    if (!userMap.has(row.id)) {
      let role = row.role;
      if (row.organizationId === null || role === 'SUPER_ADMIN') {
        role = 'SUPER_ADMIN';
      } else if (row.teacherId || role === 'TEACHER') {
        role = 'TEACHER';
      } else if (role === 'STAFF') {
        role = 'STAFF';
      } else {
        role = 'ORG_ADMIN';
      }

      userMap.set(row.id, {
        id: row.id,
        username: row.username,
        firstName: row.firstName,
        lastName: row.lastName,
        organizationId: row.organizationId,
        role,
      });
    }
  }

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

  return (
    <AdminPermissionsClient 
      organizations={allOrgs}
      users={Array.from(userMap.values())}
      overrides={allOverrides as any}
    />
  );
}
