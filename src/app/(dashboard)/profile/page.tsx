import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  const { user } = await getCurrentSession();
  
  if (!user || !user.organizationId) {
    redirect('/dashboard');
  }

  if (user.role === 'TEACHER' && user.teacherId) {
    redirect(`/teachers/${user.teacherId}`);
  }

  redirect('/dashboard');
}
