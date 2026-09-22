import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  boolean,
  unique,
  index,
  text,
} from 'drizzle-orm/pg-core';

// Common helper for tracking timestamps
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
};

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  logoUrl: text('logo_url'),
  faviconUrl: text('favicon_url'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  taxOffice: varchar('tax_office', { length: 255 }),
  taxNumber: varchar('tax_number', { length: 100 }),
  description: text('description'),
  scheduleStartTime: varchar('schedule_start_time', { length: 10 }).default('08:00').notNull(),
  scheduleEndTime: varchar('schedule_end_time', { length: 10 }).default('18:00').notNull(),
  lessonDurationMinutes: varchar('lesson_duration_minutes', { length: 10 }).default('50').notNull(),
  breakDurationMinutes: varchar('break_duration_minutes', { length: 10 }).default('10').notNull(),
  lunchBreakStartTime: varchar('lunch_break_start_time', { length: 10 }),
  lunchBreakEndTime: varchar('lunch_break_end_time', { length: 10 }),
  activeDays: varchar('active_days', { length: 50 }).default('1,2,3,4,5,6,7').notNull(),
  ...timestamps,
});

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id), // Nullable for global system roles
  name: varchar('name', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }),
  ...timestamps,
});

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: varchar('description', { length: 500 }),
  ...timestamps,
});

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  roleId: uuid('role_id')
    .references(() => roles.id, { onDelete: 'cascade' })
    .notNull(),
  permissionId: uuid('permission_id')
    .references(() => permissions.id, { onDelete: 'cascade' })
    .notNull(),
  ...timestamps,
}, (table) => [
  unique('role_permission_unique').on(table.roleId, table.permissionId)
]);

export const roleModulePermissions = pgTable('role_module_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' }), // Nullable for global default
  role: varchar('role', { length: 50 }).notNull(), // 'STAFF', 'TEACHER', 'ORG_ADMIN'
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' }), // Nullable for individual user override
  moduleKey: varchar('module_key', { length: 100 }).notNull(), // e.g. 'teachers', 'payouts', etc.
  isEnabled: boolean('is_enabled').default(true).notNull(),
  ...timestamps,
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id), // Nullable for SUPER_ADMIN
  username: varchar('username', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  gender: varchar('gender', { length: 50 }), // MALE, FEMALE
  isActive: boolean('is_active').default(true).notNull(),
  ...timestamps,
});

export const userRoles = pgTable('user_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  roleId: uuid('role_id')
    .references(() => roles.id, { onDelete: 'cascade' })
    .notNull(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  ...timestamps,
}, (table) => [
  unique('user_role_org_unique').on(table.userId, table.roleId, table.organizationId)
]);

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 255 }).primaryKey(), // Session token
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ...timestamps,
});

// ==========================================
// SPRINT 2: Öğrenci, Veli ve Öğretmen Modülleri
// ==========================================

export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  gender: varchar('gender', { length: 50 }), // MALE, FEMALE
  educationLevel: varchar('education_level', { length: 50 }), // LGS, YKS, MEZUN
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(),
  schoolName: varchar('school_name', { length: 255 }),
  grade: varchar('grade', { length: 50 }),
  notes: varchar('notes', { length: 1000 }),
  isArchived: boolean('is_archived').default(false).notNull(),
  parentName: varchar('parent_name', { length: 255 }),
  parentPhone: varchar('parent_phone', { length: 50 }),
  ...timestamps,
}, (table) => [
  index('students_org_idx').on(table.organizationId)
]);

export const parents = pgTable('parents', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  ...timestamps,
});

export const studentParents = pgTable('student_parents', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  studentId: uuid('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  parentId: uuid('parent_id')
    .references(() => parents.id, { onDelete: 'cascade' })
    .notNull(),
  relationType: varchar('relation_type', { length: 50 }), // Anne, Baba, vb.
  ...timestamps,
}, (table) => [
  unique('student_parent_org_unique').on(table.studentId, table.parentId, table.organizationId)
]);

export const studentAvailability = pgTable('student_availability', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  studentId: uuid('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  dayOfWeek: varchar('day_of_week', { length: 20 }).notNull(), // MONDAY, TUESDAY vb.
  startTime: varchar('start_time', { length: 10 }).notNull(), // HH:MM
  endTime: varchar('end_time', { length: 10 }).notNull(), // HH:MM
  ...timestamps,
});

export const teachers = pgTable('teachers', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  compensationModel: varchar('compensation_model', { length: 50 }).notNull(), // HOURLY, MONTHLY vb.
  compensationRate: varchar('compensation_rate', { length: 50 }), // Ücret tutarı (decimal yerine şimdilik varchar)
  isArchived: boolean('is_archived').default(false).notNull(),
  ...timestamps,
});

export const subjects = pgTable('subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  color: varchar('color', { length: 50 }), // UI için renk
  ...timestamps,
});

export const teacherSubjects = pgTable('teacher_subjects', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  teacherId: uuid('teacher_id')
    .references(() => teachers.id, { onDelete: 'cascade' })
    .notNull(),
  subjectId: uuid('subject_id')
    .references(() => subjects.id, { onDelete: 'cascade' })
    .notNull(),
  ...timestamps,
}, (table) => [
  unique('teacher_subject_org_unique').on(table.teacherId, table.subjectId, table.organizationId)
]);

export const teacherAvailability = pgTable('teacher_availability', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  teacherId: uuid('teacher_id')
    .references(() => teachers.id, { onDelete: 'cascade' })
    .notNull(),
  dayOfWeek: varchar('day_of_week', { length: 20 }).notNull(), // MONDAY, vb.
  startTime: varchar('start_time', { length: 10 }).notNull(), // HH:MM
  endTime: varchar('end_time', { length: 10 }).notNull(), // HH:MM
  ...timestamps,
});

// ==========================================
// SPRINT 3: Eğitim Talep ve Paket Yönetimi
// ==========================================

export const educationRequests = pgTable('education_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  studentId: uuid('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, APPROVED, REJECTED
  notes: varchar('notes', { length: 1000 }),
  ...timestamps,
});

export const educationRequestItems = pgTable('education_request_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  requestId: uuid('request_id')
    .references(() => educationRequests.id, { onDelete: 'cascade' })
    .notNull(),
  subjectId: uuid('subject_id')
    .references(() => subjects.id, { onDelete: 'cascade' })
    .notNull(),
  ...timestamps,
});

export const educationPackages = pgTable('education_packages', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  studentId: uuid('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  requestId: uuid('request_id') // Hangi talepten dönüştürüldü (opsiyonel)
    .references(() => educationRequests.id),
  title: varchar('title', { length: 255 }).notNull(), // Örn: 100 Saatlik YKS Paketi
  totalMinutes: varchar('total_minutes', { length: 20 }).notNull(), // Örn: "6000"
  consumedMinutes: varchar('consumed_minutes', { length: 20 }).default('0').notNull(),
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, COMPLETED, CANCELLED
  hourlyRate: varchar('hourly_rate', { length: 50 }), // Saatlik Ders Ücreti (TL)
  paidAmount: varchar('paid_amount', { length: 50 }).default('0').notNull(), // Ödenen Tutar (TL)
  ...timestamps,
}, (table) => [
  index('packages_org_idx').on(table.organizationId),
  index('packages_student_idx').on(table.studentId)
]);

export const packageBalanceTransactions = pgTable('package_balance_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  packageId: uuid('package_id')
    .references(() => educationPackages.id, { onDelete: 'cascade' })
    .notNull(),
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // ADD, DEDUCT, ADJUSTMENT
  amountMinutes: varchar('amount_minutes', { length: 20 }).notNull(), // İşlem yapılan dakika (pozitif veya negatif)
  idempotentKey: varchar('idempotent_key', { length: 255 }).unique(), // LessonID veya başka bir benzersiz değer
  notes: varchar('notes', { length: 500 }),
  ...timestamps,
});

// ==========================================
// SPRINT 4: Planlama Motoru ve Dersler
// ==========================================

export const classrooms = pgTable('classrooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  capacity: varchar('capacity', { length: 10 }),
  ...timestamps,
});

export const lessons = pgTable('lessons', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  studentId: uuid('student_id')
    .references(() => students.id, { onDelete: 'cascade' })
    .notNull(),
  subjectId: uuid('subject_id')
    .references(() => subjects.id, { onDelete: 'cascade' })
    .notNull(),
  packageId: uuid('package_id')
    .references(() => educationPackages.id, { onDelete: 'cascade' })
    .notNull(),
  teacherId: uuid('teacher_id')
    .references(() => teachers.id, { onDelete: 'cascade' })
    .notNull(),
  classroomId: uuid('classroom_id')
    .references(() => classrooms.id, { onDelete: 'set null' }),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  durationMinutes: varchar('duration_minutes', { length: 20 }).notNull(),
  status: varchar('status', { length: 50 }).default('PLANNED').notNull(), // PLANNED, COMPLETED, CANCELLED, POSTPONED
  teacherCompensationModelSnapshot: varchar('teacher_compensation_model_snapshot', { length: 50 }),
  teacherRateSnapshot: varchar('teacher_rate_snapshot', { length: 50 }),
  teacherFeeAmount: varchar('teacher_fee_amount', { length: 50 }),
  seriesId: varchar('series_id', { length: 255 }), // Tekrarlayan dersleri bağlamak için
  ...timestamps,
}, (table) => [
  index('lessons_org_idx').on(table.organizationId),
  index('lessons_teacher_idx').on(table.teacherId),
  index('lessons_student_idx').on(table.studentId),
  index('lessons_date_idx').on(table.startTime)
]);

export const lessonAttendance = pgTable('lesson_attendance', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  lessonId: uuid('lesson_id')
    .references(() => lessons.id, { onDelete: 'cascade' })
    .notNull(),
  status: varchar('status', { length: 50 }).notNull(), // PRESENT, EXCUSED, UNEXCUSED
  excuseReason: varchar('excuse_reason', { length: 1000 }),
  excuseReportedAt: timestamp('excuse_reported_at', { withTimezone: true }),
  ...timestamps,
});

// ==========================================
// SPRINT 6: Finans ve Hakediş (Payouts)
// ==========================================

export const teacherPayouts = pgTable('teacher_payouts', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  teacherId: uuid('teacher_id')
    .references(() => teachers.id, { onDelete: 'cascade' })
    .notNull(),
  totalAmount: varchar('total_amount', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).default('PAID').notNull(), // PAID, CANCELLED
  ...timestamps,
});

export const teacherPayoutItems = pgTable('teacher_payout_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  payoutId: uuid('payout_id')
    .references(() => teacherPayouts.id, { onDelete: 'cascade' })
    .notNull(),
  lessonId: uuid('lesson_id')
    .references(() => lessons.id, { onDelete: 'cascade' })
    .notNull()
    .unique(), // Duplicate payout prevention
  amount: varchar('amount', { length: 50 }).notNull(),
  ...timestamps,
});

export const systemLogs = pgTable('system_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id').references(() => organizations.id, { onDelete: 'set null' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  userName: varchar('user_name', { length: 255 }),
  action: varchar('action', { length: 100 }).notNull(),
  category: varchar('category', { length: 100 }).default('SYSTEM').notNull(),
  panel: varchar('panel', { length: 100 }), // Örn: 'Giriş Paneli', 'Yönetici Paneli', 'Öğretmen Paneli', 'Süper Admin Paneli'
  status: varchar('status', { length: 50 }).default('SUCCESS').notNull(), // 'SUCCESS' | 'ERROR' | 'WARNING'
  details: text('details'),
  errorDetails: text('error_details'), // Hatanın ayrıntısı, hata mesajı, yaşanan sorun
  ipAddress: varchar('ip_address', { length: 100 }),
  userAgent: varchar('user_agent', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

