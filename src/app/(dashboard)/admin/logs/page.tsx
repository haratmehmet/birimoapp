import { db } from '@/db';
import { systemLogs, organizations } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { desc, eq } from 'drizzle-orm';
import { AdminLogsClient } from './AdminLogsClient';

export default async function AdminLogsPage() {
  const { user } = await getCurrentSession();

  // Only SUPER_ADMIN (organizationId === null) can access
  if (!user || user.organizationId !== null) {
    redirect('/dashboard');
  }

  const logs = await db
    .select({
      id: systemLogs.id,
      organizationId: systemLogs.organizationId,
      organizationName: organizations.name,
      orgLogoUrl: organizations.logoUrl,
      userId: systemLogs.userId,
      userName: systemLogs.userName,
      action: systemLogs.action,
      category: systemLogs.category,
      panel: systemLogs.panel,
      status: systemLogs.status,
      details: systemLogs.details,
      errorDetails: systemLogs.errorDetails,
      ipAddress: systemLogs.ipAddress,
      userAgent: systemLogs.userAgent,
      createdAt: systemLogs.createdAt,
    })
    .from(systemLogs)
    .leftJoin(organizations, eq(systemLogs.organizationId, organizations.id))
    .orderBy(desc(systemLogs.createdAt))
    .limit(500);

  const orgList = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      logoUrl: organizations.logoUrl,
    })
    .from(organizations)
    .orderBy(organizations.name);

  return <AdminLogsClient logs={logs} organizations={orgList} />;
}
