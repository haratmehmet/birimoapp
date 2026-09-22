'use client';

import { useRouter, usePathname } from 'next/navigation';
import { ChevronLeft, Bell } from 'lucide-react';
import { MobileSidebar } from './MobileSidebar';
import Link from 'next/link';

interface MobileHeaderProps {
  organizationId: string | null;
  userRole?: string | null;
  notificationCount?: number;
  teacherId?: string | null;
  userPermissions?: Record<string, boolean>;
}

export function MobileHeader({ organizationId, userRole, notificationCount = 0, teacherId, userPermissions }: MobileHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Show back button if we are not on the main dashboard home
  const showBack = pathname !== '/dashboard';

  return (
    <header className="lg:hidden h-16 bg-white border-b border-gray-200 flex items-center justify-between px-2 z-20 flex-shrink-0 relative">
      {/* LEFT: Menu & Back Button */}
      <div className="flex items-center gap-1 z-10 w-1/3">
        <MobileSidebar 
          organizationId={organizationId} 
          userRole={userRole} 
          teacherId={teacherId} 
          userPermissions={userPermissions} 
        />
        {showBack && (
          <button 
            onClick={() => router.back()} 
            className="p-1.5 text-gray-500 hover:text-gray-900 bg-gray-50 rounded-lg border border-gray-100"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* CENTER: Logo (Absolute to ensure perfect centering) */}
      <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
        <img src="/images/Logo.png" alt="birimO" className="h-6 sm:h-7 w-auto object-contain" />
        <span className="text-[8px] sm:text-[9px] font-bold text-gray-500 tracking-wider uppercase mt-0.5">Birebir Eğitim Yönetimi</span>
      </div>

      {/* RIGHT: Notifications */}
      <div className="flex items-center justify-end gap-2 z-10 w-1/3 pr-2">
        {userRole !== 'TEACHER' && (
          <Link href="/notifications" className="relative p-2 text-gray-500 hover:text-primary transition-colors">
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-pulse" />
            )}
          </Link>
        )}
      </div>
    </header>
  );
}
