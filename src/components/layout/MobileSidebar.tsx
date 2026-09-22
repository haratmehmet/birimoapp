'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Bell,
  MessageCircle,
  Menu,
  UserCheck,
  Building2,
  ShieldAlert,
  LogOut,
  X
} from 'lucide-react';

interface MobileSidebarProps {
  organizationId: string | null;
  userRole?: string | null;
  teacherId?: string | null;
  userPermissions?: Record<string, boolean>;
}

export function MobileSidebar({ organizationId, userRole, teacherId, userPermissions }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isStaff = userRole === 'STAFF';
  const isTeacher = userRole === 'TEACHER';

  const navigation = [
    { name: isTeacher ? 'Öğretmen Paneli' : 'Dashboard', href: '/dashboard', icon: LayoutDashboard, show: true, divider: !isTeacher },
    { name: 'Öğretmen Durumum', href: teacherId ? `/teachers/${teacherId}` : '/profile', icon: UserCheck, show: isTeacher, divider: true },
    { name: 'Kurum Yönetimi', href: '/organizations', icon: Building2, show: organizationId === null },
    { 
      name: 'Kullanıcı Yönetimi', 
      href: '/admin/users', 
      icon: Users, 
      show: organizationId === null,
      subItems: [
        { name: 'Kullanıcı Listesi', href: '/admin/users' },
        { name: 'Yetkilendirme', href: '/admin/users/permissions' },
      ]
    },
    { name: 'Sistem Logları', href: '/admin/logs', icon: ShieldAlert, show: organizationId === null, divider: true },
    { name: 'Öğretmenler', href: '/teachers', icon: GraduationCap, show: organizationId !== null && !isTeacher && userPermissions?.teachers !== false },
    { name: isTeacher ? 'Öğrencilerim' : 'Öğrenciler', href: '/students', icon: Users, show: organizationId !== null && userPermissions?.students !== false },
    { name: 'Eğitim Talepleri', href: '/requests', icon: BookOpen, show: organizationId !== null && !isTeacher && userPermissions?.requests !== false },
    { 
      name: isTeacher ? 'Ders Programım' : 'Planlama ve Takvim', 
      href: '/calendar', 
      icon: Calendar, 
      show: organizationId !== null && userPermissions?.calendar !== false,
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
    { name: 'Yoklama', href: '/attendance', icon: CheckSquare, show: organizationId !== null && userPermissions?.attendance !== false, divider: true },
    { name: isTeacher ? 'Hakedişlerim' : 'Finans (Hakedişler)', href: '/payouts', icon: DollarSign, show: organizationId !== null && userPermissions?.payouts !== false },
    { name: isTeacher ? 'Raporlarım' : 'Raporlar', href: '/reports', icon: FileBarChart, show: organizationId !== null && userPermissions?.reports !== false },
    { name: 'Wpp Bilgilendirme', href: '/whatsapp', icon: MessageCircle, show: organizationId !== null && !isTeacher && userPermissions?.whatsapp !== false, divider: true },
    { name: 'Bildirimler', href: '/notifications', icon: Bell, show: organizationId !== null && !isTeacher && userPermissions?.notifications !== false },
    { name: 'Kurum Ayarları', href: '/settings', icon: Settings, show: organizationId !== null && userPermissions?.settings !== false },
  ].filter(item => item.show);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 -mr-2 text-gray-600 hover:text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#004aad]"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-900/50 backdrop-blur-sm transition-opacity" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Panel */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/90 backdrop-blur-md shadow-2xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Decorative background image (Bottom) */}
        <div className="absolute bottom-0 left-0 w-full h-[60%] overflow-hidden mix-blend-multiply opacity-[0.08] pointer-events-none -z-10">
          <img src="/images/header_sketch_notext.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-bottom" />
          {/* Fade out smoothly towards the top */}
          <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-white via-white/80 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-3/4 bg-gradient-to-l from-white/90 via-transparent to-transparent" />
        </div>

        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100 relative">
          <img src="/images/Logo.png" alt="birimO" className="h-8 w-auto object-contain" />
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-900 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-4 custom-scrollbar">
          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <div key={item.name} className="flex flex-col">
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`group flex items-center px-3 py-2.5 text-[15px] font-medium rounded-xl transition-all duration-200 ${
                      isActive 
                        ? 'bg-[#004aad]/10 text-[#004aad] shadow-sm' 
                        : 'hover:bg-gray-50 text-gray-700 hover:text-[#004aad]'
                    }`}
                  >
                  {typeof item.icon === 'string' ? (
                    <img src={item.icon} alt={item.name} className={`mr-3 flex-shrink-0 h-[20px] w-[20px] object-contain transition-opacity duration-200 ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`} />
                  ) : (
                    <item.icon 
                      className={`mr-3 flex-shrink-0 h-[20px] w-[20px] transition-colors duration-200 ${
                        isActive ? 'text-[#004aad]' : 'text-gray-400 group-hover:text-[#004aad]'
                      }`} 
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  )}
                    <span className="flex-1 truncate tracking-tight">{item.name}</span>
                  </Link>
                  {item.subItems && (
                    <div className="flex flex-col ml-9 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
                      {item.subItems.map(sub => (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          onClick={() => setIsOpen(false)}
                          className="text-[14px] font-medium text-gray-500 hover:text-[#004aad] transition-colors py-1.5"
                        >
                          {sub.name}
                        </Link>
                      ))}
                    </div>
                  )}
                  {item.divider && <div className="my-2 border-t border-gray-100" />}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 shrink-0 mb-4 pb-8">
          <form action={async () => {
            // Import and call the server action here to avoid importing server functions at the top of a client component
            const { logoutAction } = await import('@/app/(auth)/login/actions');
            await logoutAction();
          }}>
            <button 
              type="submit" 
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-red-600 hover:bg-red-50 hover:border-red-200 rounded-xl font-bold transition-colors shadow-sm"
            >
              <LogOut className="w-5 h-5" />
              <span>Çıkış Yap</span>
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
