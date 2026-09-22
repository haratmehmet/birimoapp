'use server';

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { createSession, generateSessionToken, setSessionTokenCookie, deleteSessionTokenCookie } from '@/lib/session';
import { logActivity } from '@/lib/audit';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export async function loginAction(prevState: any, formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  const headerList = await headers();
  const ipAddress = headerList.get('x-forwarded-for')?.split(',')[0] || headerList.get('x-real-ip') || null;
  const userAgent = headerList.get('user-agent') || null;

  if (!username || !password) {
    return { error: 'Lütfen tüm alanları doldurun.' };
  }

  // Basic mitigation against brute force and timing attacks
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));

  const [user] = await db.select().from(users).where(eq(users.username, username));

  if (!user || !user.isActive) {
    await logActivity({
      action: 'LOGIN_FAILED',
      category: 'AUTH',
      panel: 'Giriş Ekranı',
      status: 'ERROR',
      details: `Başarısız giriş denemesi: @${username}`,
      errorDetails: !user ? 'Kullanıcı adı sistemde bulunamadı.' : 'Kullanıcı hesabı pasif durumda, giriş engellendi.',
      ipAddress,
      userAgent,
    });
    return { error: 'Geçersiz kullanıcı adı veya şifre.' };
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);

  if (!validPassword) {
    await logActivity({
      userId: user.id,
      userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
      organizationId: user.organizationId,
      action: 'LOGIN_FAILED',
      category: 'AUTH',
      panel: 'Giriş Ekranı',
      status: 'ERROR',
      details: `Hatalı şifre girildi: @${username}`,
      errorDetails: 'Girilen şifre veritabanındaki şifre hash ile eşleşmedi (Yanlış şifre denemesi).',
      ipAddress,
      userAgent,
    });
    return { error: 'Geçersiz kullanıcı adı veya şifre.' };
  }

  const remember = formData.get('remember') === 'on';

  const token = generateSessionToken();
  const session = await createSession(token, user.id, remember);
  await setSessionTokenCookie(token, session.expiresAt, remember);

  const panelName = user.organizationId === null ? 'Süper Admin Paneli' : 'Kurum Paneli';

  await logActivity({
    userId: user.id,
    userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
    organizationId: user.organizationId,
    action: 'LOGIN_SUCCESS',
    category: 'AUTH',
    panel: panelName,
    status: 'SUCCESS',
    details: `${panelName}'ne başarıyla giriş yapıldı (@${username})`,
    ipAddress,
    userAgent,
  });

  redirect('/dashboard');
}

export async function logoutAction() {
  await deleteSessionTokenCookie();
  redirect('/login');
}
