import { db } from '@/db';
import { organizations, students, teachers, lessons, users, userRoles, roles } from '@/db/schema';
import { getCurrentSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { OrganizationsClient } from './OrganizationsClient';
import { desc, eq, and, sql, isNull } from 'drizzle-orm';

export default async function OrganizationsPage() {
  const { user } = await getCurrentSession();

  // Only SUPER_ADMIN (organizationId === null) can view this page
  if (!user || user.organizationId !== null) {
    redirect('/dashboard');
  }

  const orgs = await db.select().from(organizations).orderBy(desc(organizations.createdAt));

  // Compute stats and administrator info for each organization
  const orgsWithDetails = await Promise.all(
    orgs.map(async (org) => {
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
          phone: users.phone,
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
      let adminFirstName: string | null = null;
      let adminLastName: string | null = null;
      let adminEmail: string | null = null;
      let adminPhone: string | null = null;

      if (explicitAdmins.length > 0) {
        const a = explicitAdmins[0];
        adminFirstName = a.firstName;
        adminLastName = a.lastName;
        adminName = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.username;
        adminEmail = a.username;
        adminPhone = a.phone;
      } else {
        // Fallback: any user in the organization who is NOT a teacher
        const nonTeacherUsers = await db
          .select({
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
            phone: users.phone,
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
          adminFirstName = a.firstName;
          adminLastName = a.lastName;
          adminName = `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.username;
          adminEmail = a.username;
          adminPhone = a.phone;
        }
      }

      // Fetch all staff members & managers in this organization (excluding teachers)
      const rawStaff = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username,
          phone: users.phone,
          roleName: roles.name,
        })
        .from(users)
        .leftJoin(userRoles, eq(userRoles.userId, users.id))
        .leftJoin(roles, eq(userRoles.roleId, roles.id))
        .leftJoin(teachers, eq(teachers.userId, users.id))
        .where(
          and(
            eq(users.organizationId, org.id),
            isNull(teachers.id)
          )
        );

      const staffMap = new Map<string, any>();
      for (const s of rawStaff) {
        if (!staffMap.has(s.id)) {
          staffMap.set(s.id, {
            id: s.id,
            firstName: s.firstName,
            lastName: s.lastName,
            username: s.username,
            phone: s.phone,
            role: s.roleName === 'ORG_ADMIN' ? 'Kurum Yöneticisi' : (s.roleName === 'STAFF' ? 'Yetkili / Personel' : 'Yönetici'),
          });
        }
      }
      const staffMembers = Array.from(staffMap.values());

      // Annual & Overview tracking statistics
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);

      const [lessonsThisYear] = await db
        .select({
          total: sql<number>`count(*)`,
          completed: sql<number>`count(case when ${lessons.status} = 'COMPLETED' then 1 end)`,
          planned: sql<number>`count(case when ${lessons.status} = 'PLANNED' then 1 end)`,
          cancelled: sql<number>`count(case when ${lessons.status} = 'CANCELLED' then 1 end)`,
        })
        .from(lessons)
        .where(
          and(
            eq(lessons.organizationId, org.id),
            sql`${lessons.startTime} >= ${startOfYear}`
          )
        );

      const [archivedStudents] = await db
        .select({ count: sql<number>`count(*)` })
        .from(students)
        .where(and(eq(students.organizationId, org.id), eq(students.isArchived, true)));

      const annualStats = {
        year: currentYear,
        totalLessonsThisYear: Number(lessonsThisYear?.total || 0),
        completedLessonsThisYear: Number(lessonsThisYear?.completed || 0),
        plannedLessonsThisYear: Number(lessonsThisYear?.planned || 0),
        cancelledLessonsThisYear: Number(lessonsThisYear?.cancelled || 0),
        allTimeCompletedLessons: Number(lessonCount?.count || 0),
        activeStudents: Number(studentCount?.count || 0),
        archivedStudents: Number(archivedStudents?.count || 0),
        activeTeachers: Number(teacherCount?.count || 0),
      };

      return {
        ...org,
        studentCount: Number(studentCount?.count || 0),
        teacherCount: Number(teacherCount?.count || 0),
        lessonCount: Number(lessonCount?.count || 0),
        adminName,
        adminFirstName,
        adminLastName,
        adminEmail,
        adminPhone,
        staffMembers,
        annualStats,
      };
    })
  );

  return <OrganizationsClient organizations={orgsWithDetails} />;
}
