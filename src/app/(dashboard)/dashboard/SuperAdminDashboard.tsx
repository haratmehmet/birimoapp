import { db } from '@/db';
import { organizations, students, teachers, lessons, users, systemLogs, userRoles, roles } from '@/db/schema';
import { desc, eq, and, sql, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { 
  Building2, 
  Users, 
  GraduationCap, 
  Clock, 
  Globe, 
  ExternalLink, 
  ShieldAlert, 
  Plus, 
  ArrowRight,
  Phone,
  Mail,
  UserCheck,
  Activity
} from 'lucide-react';
import { ImpersonateButton } from '@/components/admin/ImpersonateButton';

interface SuperAdminDashboardProps {
  user: any;
}

export async function SuperAdminDashboard({ user }: SuperAdminDashboardProps) {
  // 1. Fetch total counts across the platform
  const allOrgs = await db.select().from(organizations).orderBy(desc(organizations.createdAt));
  const totalStudents = await db.select({ count: sql<number>`count(*)` }).from(students).where(eq(students.isArchived, false));
  const totalTeachers = await db.select({ count: sql<number>`count(*)` }).from(teachers).where(eq(teachers.isArchived, false));
  const totalCompletedLessons = await db.select({ count: sql<number>`count(*)` }).from(lessons).where(eq(lessons.status, 'COMPLETED'));
  const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isActive, true));

  // 2. Fetch stats per organization
  const orgStats = await Promise.all(
    allOrgs.map(async (org) => {
      const [studentCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(students)
        .where(and(eq(students.organizationId, org.id), eq(students.isArchived, false)));

      const [teacherCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(teachers)
        .where(and(eq(teachers.organizationId, org.id), eq(teachers.isArchived, false)));

      const [lessonCount] = await db
        .select({ count: sql<number>`count(*)` })
        .from(lessons)
        .where(and(eq(lessons.organizationId, org.id), eq(lessons.status, 'COMPLETED')));

      // Find real Org Admin (explicit ORG_ADMIN, strictly excluding teachers)
      const explicitAdmins = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
        })
        .from(users)
        .innerJoin(userRoles, eq(userRoles.userId, users.id))
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .leftJoin(teachers, eq(teachers.userId, users.id))
        .where(
          and(
            eq(users.organizationId, org.id),
            eq(roles.name, 'ORG_ADMIN'),
            isNull(teachers.id)
          )
        )
        .limit(1);

      let adminName = 'Yönetici Atanmadı';
      let adminEmail: string | null = null;

      if (explicitAdmins.length > 0) {
        const a = explicitAdmins[0];
        adminName = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.username;
        adminEmail = a.username;
      } else {
        // Fallback: any user in the organization who is NOT a teacher
        const nonTeacherUsers = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
          })
          .from(users)
          .leftJoin(teachers, eq(teachers.userId, users.id))
          .where(
            and(
              eq(users.organizationId, org.id),
              isNull(teachers.id)
            )
          )
          .limit(1);

        if (nonTeacherUsers.length > 0) {
          const a = nonTeacherUsers[0];
          adminName = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.username;
          adminEmail = a.username;
        }
      }

      return {
        ...org,
        studentCount: Number(studentCount?.count || 0),
        teacherCount: Number(teacherCount?.count || 0),
        lessonCount: Number(lessonCount?.count || 0),
        adminName,
        adminEmail,
      };
    })
  );

  // 3. Fetch recent system logs
  const recentLogs = await db
    .select({
      id: systemLogs.id,
      userName: systemLogs.userName,
      action: systemLogs.action,
      category: systemLogs.category,
      details: systemLogs.details,
      createdAt: systemLogs.createdAt,
      organizationName: organizations.name,
    })
    .from(systemLogs)
    .leftJoin(organizations, eq(systemLogs.organizationId, organizations.id))
    .orderBy(desc(systemLogs.createdAt))
    .limit(5);

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-6 w-full h-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* 1. Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/70 p-6 rounded-2xl border border-white/80 shadow-sm backdrop-blur-md flex-shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#004aad] flex items-center gap-2">
            Merhaba, {user.firstName || 'Süper Admin'} 👋
          </h1>
          <p className="text-gray-500 text-sm font-medium mt-1">
            Süper Admin Kontrol Paneli • Birebir Eğitim Yönetim Sistemi Platformu
          </p>
        </div>

        {/* Action Buttons: Siteyi Ziyaret Et & Kurum Ekle */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-[#004aad]/40 hover:bg-blue-50/50 text-[#004aad] text-xs font-bold rounded-xl shadow-sm hover:shadow transition-all duration-200 group"
            title="Site ana sayfasını yeni sekmede aç"
          >
            <Globe className="w-4 h-4 text-[#ff914d] group-hover:scale-110 transition-transform" />
            <span>Siteyi Ziyaret Et</span>
            <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#004aad]" />
          </Link>

          <Link
            href="/organizations"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#004aad] hover:bg-[#003882] text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-md transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Kurum Yönetimi</span>
          </Link>
        </div>
      </div>

      {/* 2. Platform Overall Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Toplam Kurum</span>
            <div className="text-2xl font-black text-gray-900">{allOrgs.length} <span className="text-sm font-semibold text-gray-400">kurum</span></div>
          </div>
          <div className="p-2.5 bg-blue-50/60 text-[#004aad] rounded-xl border border-blue-100/50">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Toplam Öğrenci</span>
            <div className="text-2xl font-black text-gray-900">{Number(totalStudents[0]?.count || 0)} <span className="text-sm font-semibold text-gray-400">öğrenci</span></div>
          </div>
          <div className="p-2.5 bg-emerald-50/60 text-emerald-600 rounded-xl border border-emerald-100/50">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Toplam Öğretmen</span>
            <div className="text-2xl font-black text-gray-900">{Number(totalTeachers[0]?.count || 0)} <span className="text-sm font-semibold text-gray-400">öğretmen</span></div>
          </div>
          <div className="p-2.5 bg-purple-50/60 text-purple-600 rounded-xl border border-purple-100/50">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-wider block mb-1">Tamamlanan Ders</span>
            <div className="text-2xl font-black text-gray-900">{Number(totalCompletedLessons[0]?.count || 0)} <span className="text-sm font-semibold text-gray-400">ders</span></div>
          </div>
          <div className="p-2.5 bg-amber-50/60 text-amber-600 rounded-xl border border-amber-100/50">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Kurumlar Tablosu (Able / Tablo) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#004aad]" />
              Kayıtlı Kurumlar ve Durum Tablosu
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Platforma bağlı tüm eğitim kurumlarının güncel verileri ve erişim bağlantıları</p>
          </div>
          <Link
            href="/organizations"
            className="text-xs font-semibold text-[#004aad] hover:text-[#ff914d] flex items-center gap-1 transition-colors"
          >
            Tümünü Yönet
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto min-w-0 w-full pb-2">
          <table className="min-w-full divide-y divide-gray-200 text-left">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kurum & Logo</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kurum Yöneticisi</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Öğrenci & Öğretmen</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tamamlanan Ders</th>
                <th className="px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">İletişim</th>
                <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Kurumu Ziyaret Et</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {orgStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm text-gray-400">
                    Henüz kayıtlı kurum bulunmuyor.
                  </td>
                </tr>
              ) : (
                orgStats.map((org) => (
                  <tr key={org.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 p-1">
                          {org.logoUrl ? (
                            <img src={org.logoUrl} alt={org.name} className="w-full h-full object-contain" />
                          ) : (
                            <Building2 className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{org.name}</div>
                          <div className="text-[11px] text-gray-400">{org.scheduleStartTime} - {org.scheduleEndTime}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-700">
                      <div className="font-medium text-gray-900">{org.adminName}</div>
                      {org.adminEmail && (
                        <div className="text-[11px] text-gray-400 font-mono">
                          {org.adminEmail.startsWith('@') ? org.adminEmail : (org.adminEmail.includes('@') ? org.adminEmail : `@${org.adminEmail}`)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          {org.studentCount} Öğrenci
                        </span>
                        <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                          {org.teacherCount} Öğretmen
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-gray-900">
                      {org.lessonCount} Ders
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {org.phone || org.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <ImpersonateButton 
                          org={{
                            id: org.id,
                            name: org.name,
                            logoUrl: org.logoUrl,
                            adminName: org.adminName
                          }}
                        />
                        <Link
                          href={`/organizations`}
                          className="inline-flex items-center gap-1 p-1.5 text-gray-500 hover:text-[#004aad] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Kurum bilgilerini ve ayarlarını incele"
                        >
                          <Building2 className="w-4 h-4" />
                        </Link>
                        <Link
                          href="/"
                          target="_blank"
                          className="inline-flex items-center gap-1 p-1.5 text-gray-500 hover:text-[#ff914d] hover:bg-gray-50 rounded-lg transition-colors"
                          title="Siteyi Ziyaret Et"
                        >
                          <Globe className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Son Sistem Logları */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              Son Sistem ve Güvenlik Logları
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Platformda son gerçekleşen kullanıcı ve kurum hareketleri</p>
          </div>
          <Link
            href="/admin/logs"
            className="text-xs font-semibold text-[#004aad] hover:text-[#ff914d] flex items-center gap-1 transition-colors"
          >
            Tüm Logları İncele
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-gray-100">
          {recentLogs.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">Henüz kayıtlı log bulunmuyor.</div>
          ) : (
            recentLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gray-100 text-gray-600">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 flex items-center gap-2">
                      <span>{log.userName || 'Sistem'}</span>
                      <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{log.action}</span>
                      {log.organizationName && (
                        <span className="text-[11px] text-blue-600">({log.organizationName})</span>
                      )}
                    </div>
                    <div className="text-gray-500 text-[11px] mt-0.5">{log.details || '-'}</div>
                  </div>
                </div>
                <div className="text-right text-gray-400 text-[11px] whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • {new Date(log.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
