// @ts-nocheck
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '@/db';
import { sessions, users, userRoles, roles, teachers, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return encodeBase32LowerCaseNoPadding(bytes);
}

export async function createSession(token: string, userId: string): Promise<typeof sessions.$inferSelect> {
  const sessionId = encodeHexLowerCase(new TextEncoder().encode(token));
  const session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
  };
  await db.insert(sessions).values(session);
  return session;
}

export async function validateSessionToken(token: string) {
  const sessionId = encodeHexLowerCase(new TextEncoder().encode(token));
  const result = await db
    .select({
      user: users,
      session: sessions,
      role: roles.name,
      roleDescription: roles.description,
      teacherId: teachers.id,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(teachers, eq(teachers.userId, users.id))
    .where(eq(sessions.id, sessionId));

  if (result.length < 1) {
    return { user: null, session: null };
  }

  const { user, session, role, roleDescription, teacherId } = result[0];

  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, session.id));
    return { user: null, session: null };
  }

  // Extend session if active
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db
      .update(sessions)
      .set({
        expiresAt: session.expiresAt
      })
      .where(eq(sessions.id, session.id));
  }

  const effectiveRole = role || (teacherId ? 'TEACHER' : (user.organizationId === null ? 'SUPER_ADMIN' : 'ORG_ADMIN'));
  let effectiveDescription = roleDescription;
  if (!effectiveDescription) {
    if (effectiveRole === 'TEACHER') effectiveDescription = 'Öğretmen';
    else if (effectiveRole === 'STAFF') effectiveDescription = 'Yetkili';
    else if (user.organizationId === null) effectiveDescription = 'Süper Admin';
    else effectiveDescription = 'Kurum Yöneticisi';
  }

  const userWithRole = {
    ...user,
    role: effectiveRole,
    roleDescription: effectiveDescription,
    teacherId: teacherId || null,
  };

  return { user: userWithRole, session };
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

export async function setSessionTokenCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    path: '/'
  });
}

export async function deleteSessionTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.set('session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/'
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value ?? null;
  if (token === null) {
    return { user: null, session: null };
  }
  const { user, session } = await validateSessionToken(token);
  if (!user) return { user: null, session: null };

  // If user is originally a SUPER_ADMIN, check if they are impersonating an organization
  const impersonateOrgId = cookieStore.get('impersonate_org_id')?.value ?? null;
  if (impersonateOrgId && user.organizationId === null) {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, impersonateOrgId));
    if (org) {
      return {
        session,
        user: {
          ...user,
          organizationId: org.id,
          role: 'ORG_ADMIN',
          roleDescription: `Yönetici (${org.name})`,
          isImpersonating: true,
          impersonatedOrgName: org.name,
          impersonatedOrgId: org.id,
          originalRole: 'SUPER_ADMIN',
        },
      };
    }
  }

  return { user, session };
}
