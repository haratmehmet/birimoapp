import { db } from '@/db';
import { roleModulePermissions } from '@/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';

export * from './permissions-constants';
import { MODULE_DEFINITIONS, DEFAULT_ROLE_PERMISSIONS } from './permissions-constants';

export async function getUserModulePermissions(user: {
  id?: string | null;
  organizationId?: string | null;
  role?: string | null;
}): Promise<Record<string, boolean>> {
  const role = user.role || 'STAFF';

  // Super admin always has full permissions
  if (role === 'SUPER_ADMIN' || !user.organizationId) {
    return { ...DEFAULT_ROLE_PERMISSIONS['SUPER_ADMIN'] };
  }

  // Base defaults
  const permissions: Record<string, boolean> = {
    ...(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS['STAFF']),
  };

  try {
    // Fetch overrides for this organization
    const whereConditions = [
      eq(roleModulePermissions.organizationId, user.organizationId),
      or(
        and(eq(roleModulePermissions.role, role), isNull(roleModulePermissions.userId)),
        user.id ? eq(roleModulePermissions.userId, user.id) : undefined
      ),
    ].filter(Boolean);

    const orgOverrides = await db
      .select({
        moduleKey: roleModulePermissions.moduleKey,
        isEnabled: roleModulePermissions.isEnabled,
        userId: roleModulePermissions.userId,
      })
      .from(roleModulePermissions)
      .where(and(...whereConditions));

    // Role-level overrides
    for (const ov of orgOverrides) {
      if (!ov.userId) {
        permissions[ov.moduleKey] = ov.isEnabled;
      }
    }

    // User-level overrides (highest priority)
    for (const ov of orgOverrides) {
      if (ov.userId && ov.userId === user.id) {
        permissions[ov.moduleKey] = ov.isEnabled;
      }
    }
  } catch (e) {
    console.error('Error fetching module permissions:', e);
  }

  return permissions;
}
