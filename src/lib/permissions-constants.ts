export interface ModuleDef {
  key: string;
  name: string;
  description: string;
  href: string;
  category: 'core' | 'academic' | 'operations' | 'management';
}

export const MODULE_DEFINITIONS: ModuleDef[] = [
  {
    key: 'teachers',
    name: 'Öğretmenler',
    description: 'Öğretmen listesi, profiller, branşlar ve öğretmen havuzu yönetimi.',
    href: '/teachers',
    category: 'academic',
  },
  {
    key: 'students',
    name: 'Öğrenciler',
    description: 'Öğrenci kayıtları, ders paketleri, öğrenci havuzu ve öğrenci profilleri.',
    href: '/students',
    category: 'academic',
  },
  {
    key: 'requests',
    name: 'Eğitim Talepleri',
    description: 'Yeni ders talepleri, öğretmen atamaları ve talep durum takibi.',
    href: '/requests',
    category: 'academic',
  },
  {
    key: 'calendar',
    name: 'Planlama ve Takvim',
    description: 'Günlük ders programı, öğretmen müsaitlikleri ve haftalık ders takibi.',
    href: '/calendar',
    category: 'academic',
  },
  {
    key: 'attendance',
    name: 'Yoklama',
    description: 'Günlük ders yoklamaları, katılım durumları ve telafi takibi.',
    href: '/attendance',
    category: 'operations',
  },
  {
    key: 'payouts',
    name: 'Finans (Hakedişler)',
    description: 'Öğretmen ders saat ücretleri, hakediş hesaplama, ödemeler ve finansal raporlar.',
    href: '/payouts',
    category: 'operations',
  },
  {
    key: 'reports',
    name: 'Raporlar',
    description: 'Kurumsal ders analizleri, öğrenci/öğretmen performans ve istatistik raporları.',
    href: '/reports',
    category: 'operations',
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp Bilgilendirme',
    description: 'Veli ve öğrencilere ders hatırlatmaları ve otomatik WhatsApp mesajlaşma.',
    href: '/whatsapp',
    category: 'operations',
  },
  {
    key: 'notifications',
    name: 'Bildirimler',
    description: 'Eğitim paketleri, sistem uyarıları ve yaklaşan ders bildirimleri.',
    href: '/notifications',
    category: 'operations',
  },
  {
    key: 'settings',
    name: 'Kurum Ayarları',
    description: 'Mesai saatleri, ders süreleri, kurum bilgileri ve kurum içi kullanıcı yönetimi.',
    href: '/settings',
    category: 'management',
  },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, boolean>> = {
  'SUPER_ADMIN': {
    teachers: true,
    students: true,
    requests: true,
    calendar: true,
    attendance: true,
    payouts: true,
    reports: true,
    whatsapp: true,
    notifications: true,
    settings: true,
  },
  'ORG_ADMIN': {
    teachers: true,
    students: true,
    requests: true,
    calendar: true,
    attendance: true,
    payouts: true,
    reports: true,
    whatsapp: true,
    notifications: true,
    settings: true,
  },
  'STAFF': {
    teachers: true,
    students: true,
    requests: true,
    calendar: true,
    attendance: true,
    payouts: false, // Default: Yetkili cannot see finance unless allowed
    reports: true,
    whatsapp: true,
    notifications: true,
    settings: false, // Default: Yetkili cannot see org settings unless allowed
  },
  'TEACHER': {
    teachers: false,
    students: true,
    requests: false,
    calendar: true,
    attendance: true,
    payouts: true, // Teacher sees own payouts
    reports: true,
    whatsapp: false,
    notifications: false,
    settings: false,
  },
};
