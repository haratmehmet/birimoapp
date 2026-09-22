import { db } from '@/db';
import { educationPackages, students } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Bell, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default async function NotificationsPage() {
  const { session, user } = await getCurrentSession();

  if (!session || !user?.organizationId) {
    redirect('/login');
  }

  if (user.role === 'TEACHER') {
    redirect('/dashboard');
  }

  // Get active packages with remaining minutes <= 300
  // Left join with students to get student details
  const activePackages = await db.select({
    id: educationPackages.id,
    name: educationPackages.title,
    totalMinutes: educationPackages.totalMinutes,
    consumedMinutes: educationPackages.consumedMinutes,
    studentId: students.id,
    studentFirstName: students.firstName,
    studentLastName: students.lastName,
  })
  .from(educationPackages)
  .leftJoin(students, eq(educationPackages.studentId, students.id))
  .where(
    and(
      eq(educationPackages.organizationId, user.organizationId),
      eq(educationPackages.status, 'ACTIVE')
    )
  );

  const notifications = activePackages
    .map(pkg => {
      const remainingMinutes = Math.max(0, parseInt(pkg.totalMinutes || '0', 10) - parseInt(pkg.consumedMinutes || '0', 10));
      return {
        ...pkg,
        remainingMinutes,
        remainingHours: Math.floor(remainingMinutes / 60)
      };
    })
    .filter(pkg => pkg.remainingMinutes <= 300)
    .sort((a, b) => a.remainingMinutes - b.remainingMinutes); // Sort by most urgent (least minutes)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center shadow-sm">
          <Bell className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight">Bildirimler</h1>
          <p className="text-gray-500 mt-1 font-medium text-sm">Paket bakiyesi azalan öğrenciler (0 - 5 Saat)</p>
        </div>
      </div>

      <div className="space-y-4">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
               <Bell className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Harika! Bekleyen Bildirim Yok</h3>
            <p className="text-gray-500 mt-2 max-w-sm">Tüm öğrencilerinizin paket bakiyeleri güvende. Kritik seviyeye düşen bir bakiye olduğunda sistem sizi uyaracaktır.</p>
          </div>
        ) : (
          notifications.map((notif, idx) => (
            <div key={`${notif.id}-${idx}`} className="bg-white rounded-2xl shadow-sm border border-red-100 p-6 flex flex-col sm:flex-row gap-5 items-start relative overflow-hidden group hover:shadow-md hover:border-red-200 transition-all">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-red-500"></div>
              
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0 text-red-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              
              <div className="flex-1 space-y-3">
                <p className="text-gray-700 text-base leading-relaxed">
                  🚨 <strong className="text-gray-900">{notif.studentFirstName} {notif.studentLastName}</strong> adlı öğrencinin <strong className="text-gray-900">{notif.name}</strong> paketi için son <strong className="text-red-600 text-lg">{notif.remainingHours} saat</strong> dersi kalmıştır. Yenileme işlemi için öğrenci veya velisiyle iletişime geçiniz.
                </p>
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-inset ring-red-500/10">
                    Satış/Yenileme Gerekli
                  </span>
                  {notif.studentId && (
                    <Link href={`/students/${notif.studentId}`} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                      Öğrenci Profiline Git &rarr;
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
