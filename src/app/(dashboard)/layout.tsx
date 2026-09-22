import { ReactNode } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  CheckSquare, 
  DollarSign,
  FileBarChart,
  Settings,
  LogOut,
  Bell,
  MessageCircle,
  UserCheck,
  Building2,
  ShieldAlert,
  ArrowLeft
} from 'lucide-react';
import { db } from '@/db';
import { educationPackages } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getCurrentSession, deleteSessionTokenCookie } from '@/lib/session';
import { stopImpersonationAction } from '@/app/(dashboard)/organizations/actions';
import { redirect } from 'next/navigation';
import { MobileSidebar } from '@/components/layout/MobileSidebar';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { ScrollResetMain } from '@/components/layout/ScrollResetMain';
import { getUserModulePermissions } from '@/lib/permissions';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { session, user } = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  const isStaff = user.role === 'STAFF';
  const isTeacher = user.role === 'TEACHER';

  // Fetch dynamic permissions for this user & organization
  const userPerms = await getUserModulePermissions(user);


  // Calculate notifications (skip for teachers)
  let notificationCount = 0;
  if (user?.organizationId && !isTeacher) {
    const orgPackages = await db.select({
      totalMinutes: educationPackages.totalMinutes,
      consumedMinutes: educationPackages.consumedMinutes,
    })
    .from(educationPackages)
    .where(eq(educationPackages.organizationId, user.organizationId));
    
    orgPackages.forEach(pkg => {
      const remaining = Math.max(0, parseInt(pkg.totalMinutes || '0', 10) - parseInt(pkg.consumedMinutes || '0', 10));
      if (remaining <= 300) {
        notificationCount++;
      }
    });
  }

  const navigation = [
    { name: isTeacher ? 'Öğretmen Paneli' : 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true, divider: !isTeacher },
    { name: 'Öğretmen Durumum', href: user.teacherId ? `/teachers/${user.teacherId}` : '/profile', icon: UserCheck, show: isTeacher, divider: true },
    { name: 'Kurum Yönetimi', href: '/organizations', icon: Building2, show: user.organizationId === null },
    { 
      name: 'Kullanıcı Yönetimi', 
      href: '/admin/users', 
      icon: Users, 
      show: user.organizationId === null,
      subItems: [
        { name: 'Kullanıcı Listesi', href: '/admin/users' },
        { name: 'Yetkilendirme', href: '/admin/users/permissions' },
      ]
    },
    { name: 'Sistem Logları', href: '/admin/logs', icon: ShieldAlert, show: user.organizationId === null, divider: true },
    { name: 'Öğretmenler', href: '/teachers', icon: GraduationCap, show: user.organizationId !== null && !isTeacher && userPerms.teachers !== false },
    { name: isTeacher ? 'Öğrencilerim' : 'Öğrenciler', href: '/students', icon: Users, show: user.organizationId !== null && userPerms.students !== false },
    { name: 'Eğitim Talepleri', href: '/requests', icon: BookOpen, show: user.organizationId !== null && !isTeacher && userPerms.requests !== false },
    { 
      name: isTeacher ? 'Ders Programım' : 'Planlama ve Takvim', 
      href: '/calendar', 
      icon: Calendar, 
      show: user.organizationId !== null && userPerms.calendar !== false,
      subItems: isTeacher ? [
        { name: 'Ders Programım', href: '/calendar?tab=daily' },
        { name: 'Müsaitlik Durumum', href: '/calendar?tab=availability' },
        { name: 'Haftalık Ders Takibim', href: '/calendar?tab=weekly' }
      ] : [
        { name: 'Günlük Ders Programı', href: '/calendar?tab=daily' },
        { name: 'Müsaitlik Programı', href: '/calendar?tab=availability' },
        { name: 'Haftalık Ders Takibi', href: '/calendar?tab=weekly' }
      ]
    },
    { name: 'Yoklama', href: '/attendance', icon: CheckSquare, show: user.organizationId !== null && userPerms.attendance !== false, divider: true },
    { name: isTeacher ? 'Hakedişlerim' : 'Finans (Hakedişler)', href: '/payouts', icon: DollarSign, show: user.organizationId !== null && userPerms.payouts !== false },
    { name: isTeacher ? 'Raporlarım' : 'Raporlar', href: '/reports', icon: FileBarChart, show: user.organizationId !== null && userPerms.reports !== false },
    { name: 'Wpp Bilgilendirme', href: '/whatsapp', icon: MessageCircle, show: user.organizationId !== null && !isTeacher && userPerms.whatsapp !== false, divider: true },
    { name: 'Bildirimler', href: '/notifications', icon: Bell, show: user.organizationId !== null && !isTeacher && userPerms.notifications !== false },
    { name: 'Kurum Ayarları', href: '/settings', icon: Settings, show: user.organizationId !== null && userPerms.settings !== false },
  ].filter(item => item.show);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground font-sans print:block print:h-auto print:overflow-visible">
      {/* Impersonation Top Banner */}
      {Boolean((user as any).isImpersonating) && (
        <div className="bg-gradient-to-r from-[#002b66] via-[#004aad] to-[#003882] text-white px-5 py-2.5 flex items-center justify-between shadow-md z-50 print:hidden text-xs sm:text-sm flex-shrink-0 border-b border-blue-400/30">
          <div className="flex items-center gap-2.5 font-medium truncate mr-3">
            <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-200"></span>
            </span>
            <Building2 className="w-4 h-4 text-blue-200 flex-shrink-0" />
            <span className="truncate">
              Şu anda <strong>{(user as any).impersonatedOrgName}</strong> kurumunun yetkili panelindesiniz (Ziyaretçi Modu - Tam Yetki).
            </span>
          </div>
          <form action={stopImpersonationAction} className="flex-shrink-0">
            <button
              type="submit"
              className="px-3.5 py-1.5 bg-white text-[#004aad] hover:text-[#002b66] hover:bg-blue-50 font-bold text-xs rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#004aad]" />
              <span>Süper Admin Paneline Dön</span>
            </button>
          </form>
        </div>
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar - Floating Soft Glassmorphism */}
        <aside className="w-68 m-4 mr-0 rounded-2xl glass-panel flex-shrink-0 hidden lg:flex flex-col relative z-20 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden print:hidden">
        <div className="h-24 flex flex-col justify-center pl-10 pr-6 bg-white/40 border-b border-white/50 backdrop-blur-sm">
          <img src="/images/Logo.png" alt="birimO" className="h-11 w-auto object-contain object-left mb-1" />
          <span className="text-[10px] font-bold text-gray-500 tracking-tight">Birebir Eğitim Yönetim Sistemi</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar relative z-10">
          <nav className="space-y-0.5">
            {navigation.map((item) => (
              <div key={item.name} className="flex flex-col">
                <Link
                  href={item.href}
                  scroll={false}
                  className="group flex items-center px-3 py-2 text-[14px] font-medium rounded-xl transition-all duration-300 hover:bg-white hover:shadow-sm hover:-translate-y-0.5 hover:text-[#004aad] text-gray-600"
                >
                  {typeof item.icon === 'string' ? (
                    <img src={item.icon} alt={item.name} className="mr-3 flex-shrink-0 h-[18px] w-[18px] object-contain opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                  ) : (
                    <item.icon className="mr-3 flex-shrink-0 h-[18px] w-[18px] text-[#004aad]/70 group-hover:text-[#004aad] transition-colors duration-300" strokeWidth={2.5} />
                  )}
                  <span className="flex-1 truncate tracking-tight">{item.name}</span>
                </Link>
                {item.subItems && (
                  <div className="flex flex-col ml-9 mt-0.5 space-y-0.5 border-l-2 border-gray-100 pl-3">
                    {item.subItems.map(sub => (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        scroll={false}
                        className="text-[13px] font-medium text-gray-500 hover:text-[#004aad] transition-colors py-1"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                )}
                
                {/* İnce Çizgi Ayırıcı (Eğitim/Defter Temalı) */}
                {(item as any).divider && (
                  <div className="relative flex items-center py-2 mx-3">
                    <div className="w-full border-t border-dashed border-primary/25 rounded-full"></div>
                    <div className="absolute left-1/2 -translate-x-1/2 bg-white px-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/40 ring-2 ring-primary/5"></div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
        
        {/* Aesthetic Sketch at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-48 pointer-events-none mix-blend-multiply opacity-25 overflow-hidden z-0">
          <img src="/images/header_sketch_notext.jpg" alt="Education Theme" className="w-full h-full object-cover object-[left_bottom]" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-white/40 to-white" />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-full max-h-screen overflow-hidden relative print:block print:overflow-visible">
        
        {/* Mobile Header */}
        <div className="print:hidden">
          <MobileHeader 
            organizationId={user.organizationId} 
            userRole={user.role} 
            notificationCount={notificationCount} 
            teacherId={user.teacherId} 
            userPermissions={userPerms}
          />
        </div>
        
        {/* Background Decorative Blobs */}
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10 print:hidden" />
        <div className="absolute bottom-[-10%] left-[20%] w-[30rem] h-[30rem] bg-indigo-200/20 rounded-full blur-[120px] pointer-events-none -z-10 print:hidden" />

        {/* Topbar - Glassmorphism (Desktop only) - OUTSIDE scroll area so it never disappears */}
        <header className="hidden lg:flex h-20 mt-4 mx-6 rounded-2xl glass-panel items-center justify-between px-6 flex-shrink-0 sticky top-4 z-30 border border-white/60 shadow-sm transition-all duration-300 print:hidden">
          <div className="flex-1 h-full relative overflow-hidden mix-blend-multiply opacity-25 pointer-events-none mx-2 transition-opacity duration-300 hover:opacity-40">
            <img src="/images/header_sketch_notext.jpg" alt="Education Sketch" className="absolute inset-0 w-full h-full object-cover object-center" />
            {/* Fade out edges so it blends perfectly with the header */}
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white via-white/80 to-transparent" />
            <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-white via-white/80 to-transparent" />
          </div>
          <div className="flex items-center gap-6 z-10 relative">
            {!isTeacher && (
              <Link href="/notifications" className="relative p-2 text-gray-500 hover:text-primary transition-colors group">
                <Bell className="w-6 h-6 group-hover:scale-110 transition-transform" />
                {notificationCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </Link>
            )}
            
            <div className="w-px h-6 bg-gray-200 hidden sm:block" />

            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-gray-800">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="text-xs text-gray-500 font-medium">
                {user?.role === 'STAFF' ? 'Yetkili' : (user?.role === 'TEACHER' ? 'Öğretmen' : (user?.organizationId === null ? 'Süper Admin' : 'Kurum Yöneticisi'))}
              </span>
            </div>
            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 border border-white flex items-center justify-center shadow-sm">
              <span className="text-primary font-bold">{user?.firstName?.[0]}</span>
            </div>
            <div className="w-px h-6 bg-gray-200 mx-2" />
            <form action={async () => {
              'use server';
              await deleteSessionTokenCookie();
              redirect('/login');
            }}>
              <button type="submit" className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200" title="Çıkış Yap">
                <LogOut className="w-5 h-5" strokeWidth={2} />
              </button>
            </form>
          </div>
        </header>

        {/* Main Area - This is the ONLY scrollable area. ScrollResetMain resets scroll on route change. */}
        <ScrollResetMain className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 print:block print:overflow-visible print:p-0">
          <div className="w-full max-w-full mx-auto print:overflow-visible">
            {children}
          </div>
        </ScrollResetMain>
      </div>
    </div>
  </div>
  );
}
