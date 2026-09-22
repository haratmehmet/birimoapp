import { db } from '@/db';
import { classrooms } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { ClassroomForm } from './ClassroomForm';
import { eq, desc } from 'drizzle-orm';

export default async function ClassroomsPage() {
  const { user } = await getCurrentSession();

  if (!user || !user.organizationId) redirect('/dashboard');

  const orgClassrooms = await db.select().from(classrooms)
    .where(eq(classrooms.organizationId, user.organizationId))
    .orderBy(desc(classrooms.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Derslik Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">Kurumunuzdaki derslikleri ve kapasitelerini yönetin.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Yeni Derslik Ekle</h2>
            <ClassroomForm />
          </div>
        </div>

        <div className="lg:col-span-2 min-w-0">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto min-w-0 w-full pb-2">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adı</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kapasite</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orgClassrooms.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">Derslik bulunmuyor.</td></tr>
                ) : (
                  orgClassrooms.map((c) => (
                    <tr key={c.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.capacity || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-primary hover:text-indigo-900">Düzenle</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
