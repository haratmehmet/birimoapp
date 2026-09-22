'use server';

import { db } from '@/db';
import { classrooms } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export async function createClassroomAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  if (!user || !user.organizationId) return { error: 'Yetkisiz erişim.' };

  const name = formData.get('name') as string;
  const capacity = formData.get('capacity') as string;

  if (!name) return { error: 'Derslik adı zorunludur.' };

  try {
    await db.insert(classrooms).values({
      organizationId: user.organizationId,
      name,
      capacity,
    });

    revalidatePath('/classrooms');
    return { success: 'Derslik başarıyla eklendi.' };
  } catch (error) {
    console.error(error);
    return { error: 'Derslik eklenirken hata oluştu.' };
  }
}
