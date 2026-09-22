import { db } from '@/db';
import { systemLogs } from '@/db/schema';

export interface LogActivityParams {
  organizationId?: string | null;
  userId?: string | null;
  userName?: string | null;
  action: string;
  category?: 'AUTH' | 'ORGANIZATION' | 'USER' | 'SETTINGS' | 'SYSTEM';
  panel?: string | null;
  status?: 'SUCCESS' | 'ERROR' | 'WARNING';
  details?: string | Record<string, any> | null;
  errorDetails?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logActivity({
  organizationId,
  userId,
  userName,
  action,
  category = 'SYSTEM',
  panel = null,
  status = 'SUCCESS',
  details,
  errorDetails,
  ipAddress,
  userAgent,
}: LogActivityParams) {
  try {
    const detailsString = typeof details === 'object' && details !== null ? JSON.stringify(details) : (details || null);
    await db.insert(systemLogs).values({
      organizationId: organizationId || null,
      userId: userId || null,
      userName: userName || null,
      action,
      category,
      panel: panel || null,
      status,
      details: detailsString,
      errorDetails: errorDetails || null,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}
