import { db } from '@/db';
import { users, roles, userRoles, teachers } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { UsersClient } from './UsersClient';
import { eq, desc, and, not, inArray } from 'drizzle-orm';

export default async function UsersPage() {
  const { user } = await getCurrentSession();

  if (!user || !user.organizationId || user.role === 'STAFF' || user.role === 'TEACHER') {
    redirect('/dashboard');
  }

  // Fetch users in this organization
  // Filter out superadmins if any, only get teachers and admins
  const orgUsersRaw = await db.select({
    id: users.id,
    firstName: users.firstName,
    lastName: users.lastName,
    email: users.username,
    isActive: users.isActive,
    role: roles.name,
    roleId: roles.id,
    isTeacher: teachers.id,
  })
  .from(users)
  .leftJoin(userRoles, eq(userRoles.userId, users.id))
  .leftJoin(roles, eq(userRoles.roleId, roles.id))
  .leftJoin(teachers, eq(teachers.userId, users.id))
  .where(eq(users.organizationId, user.organizationId))
  .orderBy(desc(users.createdAt));

  const orgUsers = orgUsersRaw.filter(u => {
    const r = (u.role || '').toLowerCase();
    const e = (u.email || '').toLowerCase();
    const fullName = ((u.firstName || '') + ' ' + (u.lastName || '')).toLowerCase().trim();
    // Süper adminleri kesinlikle gizle
    if (r.includes('super')) return false;
    if (e === 'admin@mentoros.com' || e === 'admin' || e === 'superadmin') return false;
    if (fullName === 'super admin') return false;
    return true;
  }).map(u => {
    const fullName = ((u.firstName || '') + ' ' + (u.lastName || '')).toLowerCase().trim();
    let role = u.role;
    if (u.isTeacher) {
      role = 'TEACHER';
    } else if (!role && fullName.includes('yönetici')) {
      role = 'ORG_ADMIN';
    }
    return { ...u, role };
  });

  // Fetch roles available for organization user creation (Admin and Staff)
  const allRoles = await db.select().from(roles);
  const availableRoles = allRoles.filter(r => {
    const name = r.name.toUpperCase();
    return name === 'ORG_ADMIN' || name === 'STAFF' || name.includes('ADMIN') || name.includes('YETKILI') || name.includes('YÖNETICI');
  });

  return <UsersClient users={orgUsers} roles={availableRoles} />;
}
