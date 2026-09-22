'use server';

import { db } from '@/db';
import { students, educationPackages } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getCurrentSession } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export async function createStudentAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  
  if (!user || !user.organizationId) {
    return { error: 'Oturumunuz geçersiz veya yetkiniz yok.' };
  }

  const firstName = formData.get('firstName') as string;
  const lastName = formData.get('lastName') as string;
  const phone = formData.get('phone') as string;
  const gender = formData.get('gender') as string;
  const educationLevel = formData.get('educationLevel') as string;
  const grade = formData.get('grade') as string;
  const parentName = formData.get('parentName') as string;
  const parentPhone = formData.get('parentPhone') as string;
  const packageHoursStr = formData.get('packageHours') as string;
  const packageHourlyRate = formData.get('packageHourlyRate') as string;

  if (!firstName || !lastName || !educationLevel) {
    return { error: 'Lütfen zorunlu öğrenci alanlarını doldurun (Ad, Soyad, Öğrenim Durumu).' };
  }

  try {
    const [newStudent] = await db.insert(students).values({
      organizationId: user.organizationId,
      firstName,
      lastName,
      phone,
      gender,
      educationLevel,
      grade,
      parentName: parentName ? parentName.trim() : null,
      parentPhone: parentPhone ? parentPhone.trim() : null,
      status: 'ACTIVE'
    }).returning();

    const packageHours = parseInt(packageHoursStr, 10);
    if (!isNaN(packageHours) && packageHours > 0) {
      const totalMinutes = packageHours * 60;
      await db.insert(educationPackages).values({
        organizationId: user.organizationId,
        studentId: newStudent.id,
        title: `${packageHours} Saatlik Başlangıç Paketi`,
        totalMinutes: totalMinutes.toString(),
        consumedMinutes: '0',
        status: 'ACTIVE',
        hourlyRate: packageHourlyRate || null
      });
    }

    revalidatePath('/students', 'layout');
    return { success: 'Öğrenci başarıyla oluşturuldu.' };
  } catch (error: any) {
    console.error(error);
    return { error: 'Öğrenci oluşturulurken bir hata oluştu.' };
  }
}

export async function importStudentsFromExcelAction(prevState: any, formData: FormData) {
  const { user } = await getCurrentSession();
  
  if (!user || !user.organizationId) {
    return { error: 'Oturumunuz geçersiz veya yetkiniz yok.' };
  }

  const file = formData.get('file') as File | null;
  if (!file) {
    return { error: 'Lütfen bir dosya seçin.' };
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const XLSX = await import('xlsx');
    
    const workbook = XLSX.read(arrayBuffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows = XLSX.utils.sheet_to_json(worksheet) as any[];

    if (!rows || rows.length === 0) {
      return { error: 'Dosya boş veya geçerli veri bulunamadı.' };
    }

    let successCount = 0;
    
    for (const row of rows) {
      const firstName = row['Ad'] || row['Adı'] || row['İlk Adı'];
      const lastName = row['Soyad'] || row['Soyadı'];
      
      if (!firstName || !lastName) continue;

      let educationLevel = row['Öğrenim Durumu'] || row['ÖğrenimDurumu'] || 'MEZUN';
      let phone = row['Telefon'] || row['Telefon Numarası'] || null;
      let grade = row['Sınıf'] || row['Sınıfı'] || null;
      let genderStr = row['Cinsiyet']?.toString().toLowerCase() || '';
      let gender = genderStr.includes('erkek') ? 'MALE' : (genderStr.includes('kız') || genderStr.includes('kadın') ? 'FEMALE' : null);
      let packageHours = parseInt(row['Paket Saati'], 10) || 0;
      let hourlyRate = row['Saatlik Ücret']?.toString() || null;

      let formattedEdLevel = educationLevel.toString().toUpperCase();
      if (!['LGS', 'YKS', 'MEZUN'].includes(formattedEdLevel)) {
        formattedEdLevel = 'MEZUN';
      }

      const [newStudent] = await db.insert(students).values({
        organizationId: user.organizationId,
        firstName: firstName.toString().trim(),
        lastName: lastName.toString().trim(),
        phone: phone ? phone.toString().trim() : null,
        gender,
        educationLevel: formattedEdLevel,
        grade: grade ? grade.toString().trim() : null,
        status: 'ACTIVE'
      }).returning();

      if (packageHours > 0) {
        const totalMinutes = packageHours * 60;
        await db.insert(educationPackages).values({
          organizationId: user.organizationId,
          studentId: newStudent.id,
          title: `${packageHours} Saatlik Başlangıç Paketi (Excel)`,
          totalMinutes: totalMinutes.toString(),
          consumedMinutes: '0',
          status: 'ACTIVE',
          hourlyRate: hourlyRate
        });
      }
      successCount++;
    }

    revalidatePath('/students', 'layout');
    return { success: `${successCount} öğrenci başarıyla içe aktarıldı.` };
  } catch (error: any) {
    console.error('Excel Import Error:', error);
    return { error: 'Excel dosyası okunurken bir hata oluştu. Dosyanın bozuk olmadığından emin olun.' };
  }
}

export async function deleteStudentAction(studentId: string) {
  const { user } = await getCurrentSession();
  
  if (!user || !user.organizationId) {
    return { error: 'Oturumunuz geçersiz veya yetkiniz yok.' };
  }

  try {
    await db.update(students)
      .set({ isArchived: true })
      .where(and(
        eq(students.id, studentId),
        eq(students.organizationId, user.organizationId)
      ));
    
    revalidatePath('/students', 'layout');
    revalidatePath('/students/pool', 'layout');
    revalidatePath('/dashboard');
    revalidatePath('/calendar');
    return { success: 'Öğrenci başarıyla kurum havuzuna gönderildi.' };
  } catch (error) {
    console.error('Öğrenci Arşivleme Hatası:', error);
    return { error: 'Öğrenci havuza gönderilirken bir hata oluştu.' };
  }
}

export async function restoreStudentAction(studentId: string) {
  const { user } = await getCurrentSession();
  
  if (!user || !user.organizationId) {
    return { error: 'Oturumunuz geçersiz veya yetkiniz yok.' };
  }

  try {
    await db.update(students)
      .set({ isArchived: false })
      .where(and(
        eq(students.id, studentId),
        eq(students.organizationId, user.organizationId)
      ));
    
    revalidatePath('/students', 'layout');
    revalidatePath('/students/pool', 'layout');
    revalidatePath('/dashboard');
    revalidatePath('/calendar');
    return { success: 'Öğrenci başarıyla aktif listeye geri yüklendi.' };
  } catch (error) {
    console.error('Öğrenci Geri Yükleme Hatası:', error);
    return { error: 'Öğrenci geri yüklenirken bir hata oluştu.' };
  }
}

export async function addPackageAction(studentId: string, packageHours: number, hourlyRate: string) {
  const { user } = await getCurrentSession();
  
  if (!user || !user.organizationId) {
    return { error: 'Oturumunuz geçersiz veya yetkiniz yok.' };
  }

  if (isNaN(packageHours) || packageHours <= 0) {
    return { error: 'Geçerli bir saat giriniz.' };
  }

  try {
    const totalMinutes = packageHours * 60;
    
    await db.insert(educationPackages).values({
      organizationId: user.organizationId,
      studentId: studentId,
      title: `${packageHours} Saatlik Ek Paket`,
      totalMinutes: totalMinutes.toString(),
      consumedMinutes: '0',
      status: 'ACTIVE',
      hourlyRate: hourlyRate || null
    });
    
    revalidatePath('/students', 'layout');
    return { success: 'Paket başarıyla eklendi.' };
  } catch (error) {
    console.error(error);
    return { error: 'Paket eklenirken bir hata oluştu.' };
  }
}

export async function deletePackageAction(packageId: string) {
  const { user } = await getCurrentSession();

  if (!user || !user.organizationId) {
    return { error: 'Oturumunuz geçersiz veya yetkiniz yok.' };
  }

  try {
    await db.delete(educationPackages)
      .where(and(
        eq(educationPackages.id, packageId),
        eq(educationPackages.organizationId, user.organizationId)
      ));
    
    revalidatePath('/students', 'layout');
    return { success: 'Paket başarıyla silindi.' };
  } catch (error) {
    console.error(error);
    return { error: 'Paket silinirken bir hata oluştu.' };
  }
}

export async function updatePackageHoursAction(packageId: string, packageHours: number) {
  const { user } = await getCurrentSession();

  if (!user || !user.organizationId) {
    return { error: 'Oturumunuz geçersiz veya yetkiniz yok.' };
  }

  if (isNaN(packageHours) || packageHours < 0) {
    return { error: 'Geçerli bir saat giriniz.' };
  }

  try {
    const totalMinutes = packageHours * 60;
    
    const result = await db.update(educationPackages)
      .set({
        totalMinutes: totalMinutes.toString(),
        title: `${packageHours} Saatlik Paket`
      })
      .where(and(
        eq(educationPackages.id, packageId),
        eq(educationPackages.organizationId, user.organizationId)
      ))
      .returning();
      
    if (result.length === 0) {
      return { error: 'Güncellenecek paket bulunamadı veya yetkiniz yok.' };
    }
    
    revalidatePath('/students', 'layout');
    return { success: 'Paket saati başarıyla güncellendi.' };
  } catch (error: any) {
    console.error(error);
    return { error: 'Paket saati güncellenirken sistemsel bir hata oluştu. Lütfen tekrar deneyin.' };
  }
}

export async function addPaymentAction(packageId: string, paymentAmount: number) {
  const { user } = await getCurrentSession();

  if (!user || !user.organizationId) {
    return { error: 'Oturumunuz geçersiz veya yetkiniz yok.' };
  }

  if (isNaN(paymentAmount) || paymentAmount <= 0) {
    return { error: 'Geçerli bir ödeme tutarı giriniz.' };
  }

  try {
    // Önce mevcut paketi bul
    const [pkg] = await db.select()
      .from(educationPackages)
      .where(and(
        eq(educationPackages.id, packageId),
        eq(educationPackages.organizationId, user.organizationId)
      ));
      
    if (!pkg) {
      return { error: 'Paket bulunamadı.' };
    }

    const currentPaid = parseFloat(pkg.paidAmount || '0');
    const newPaidAmount = currentPaid + paymentAmount;
    
    await db.update(educationPackages)
      .set({
        paidAmount: newPaidAmount.toString()
      })
      .where(and(
        eq(educationPackages.id, packageId),
        eq(educationPackages.organizationId, user.organizationId)
      ));
    
    revalidatePath('/students', 'layout');
    return { success: 'Tahsilat başarıyla kaydedildi.' };
  } catch (error) {
    console.error(error);
    return { error: 'Tahsilat kaydedilirken bir hata oluştu.' };
  }
}
