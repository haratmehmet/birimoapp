'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { ArrowLeft, Archive, RotateCcw, Search, User, BookOpen, Phone, Mail } from 'lucide-react';
import { restoreTeacherAction } from '../actions';
import { useRouter } from 'next/navigation';
import { formatPhoneNumber } from '@/lib/utils';

export function PoolClient({ teachers }: { teachers: any[] }) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTeachers = teachers.filter(t => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return `${t.firstName || ''} ${t.lastName || ''}`.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/teachers"
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="p-2.5 bg-indigo-100 rounded-xl">
              <Archive className="w-6 h-6 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-extrabold text-[#004aad] tracking-tight">Eğitimci Havuzu</h1>
          </div>
          <p className="mt-1 text-gray-500 font-medium ml-12">
            Kurum havuzuna gönderilen (arşivlenen) öğretmenler burada listelenir. İstediğiniz zaman geri yükleyebilirsiniz.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all sm:text-sm"
            placeholder="İsim, soyisim veya kullanıcı adı ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Teacher List */}
      {filteredTeachers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
            <Archive className="w-10 h-10 text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Havuz Boş</h3>
          <p className="text-sm text-gray-500 max-w-sm">
            Henüz kurum havuzuna gönderilmiş öğretmen bulunmuyor.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-0">
          <div className="md:hidden space-y-4 p-4">
            {filteredTeachers.map(teacher => (
              <PoolCard key={"card-"+teacher.id} teacher={teacher} router={router} />
            ))}
          </div>
          <div className="hidden md:block overflow-x-auto min-w-0 w-full pb-2">
            <table className="w-full text-sm align-middle">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100">
                  <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Öğretmen Bilgisi</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">İletişim</th>
                  <th className="px-6 py-4 text-left font-semibold text-gray-500 uppercase tracking-wider text-[11px]">Branş</th>
                  <th className="px-6 py-4 text-right font-semibold text-gray-500 uppercase tracking-wider text-[11px]">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {filteredTeachers.map(teacher => (
                  <PoolRow key={teacher.id} teacher={teacher} router={router} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function PoolRow({ teacher, router }: { teacher: any, router: any }) {
  const [isPending, startTransition] = useTransition();
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  const confirmRestore = () => {
    startTransition(async () => {
      await restoreTeacherAction(teacher.id, teacher.userId);
      setIsRestoreModalOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <tr 
        onClick={() => router.push(`/teachers/${teacher.id}`)}
        className="hover:bg-gray-50/50 transition-colors cursor-pointer"
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-white flex-shrink-0 ${teacher.gender === 'FEMALE' ? 'bg-pink-100 text-pink-700' : teacher.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
              {teacher.firstName?.charAt(0)}{teacher.lastName?.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-gray-900">{teacher.firstName} {teacher.lastName}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" />
                {teacher.gender === 'MALE' ? 'Erkek' : 'Kadın'}
              </div>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs">{teacher.email}</span>
            </div>
            {teacher.phone && (
              <div className="flex items-center gap-1.5 text-gray-600">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs">{formatPhoneNumber(teacher.phone)}</span>
              </div>
            )}
          </div>
        </td>
        <td className="px-6 py-4">
          {teacher.subjectName ? (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
              style={{
                backgroundColor: `${teacher.subjectColor}15`,
                color: teacher.subjectColor || '#6366f1',
                borderColor: `${teacher.subjectColor}30`,
              }}
            >
              <BookOpen className="w-3 h-3" />
              {teacher.subjectName}
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">Belirtilmemiş</span>
          )}
        </td>
        <td className="px-6 py-4 text-right">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsRestoreModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl transition-colors border border-emerald-200/50 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Geri Yükle
          </button>
        </td>
      </tr>

      {/* Restore Modal */}
      {isRestoreModalOpen && (
        <tr>
          <td colSpan={4} className="p-0">
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
              <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsRestoreModalOpen(false)} />
              <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200 p-6 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <RotateCcw className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Öğretmeni Geri Yükle</h3>
                <p className="text-sm text-gray-500 mb-6">
                  <span className="font-bold">{teacher.firstName} {teacher.lastName}</span> adlı öğretmeni aktif kadroya geri yüklemek istediğinize emin misiniz?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsRestoreModalOpen(false)}
                    className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    disabled={isPending}
                  >
                    İptal
                  </button>
                  <button
                    onClick={confirmRestore}
                    className="flex-1 px-4 py-2.5 text-white bg-emerald-600 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                    disabled={isPending}
                  >
                    {isPending ? 'Yükleniyor...' : 'Evet, Geri Yükle'}
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}


function PoolCard({ teacher, router }: { teacher: any, router: any }) {
  const [isPending, startTransition] = require('react').useTransition();
  const [isRestoreModalOpen, setIsRestoreModalOpen] = require('react').useState(false);
  const { Mail, Phone, RotateCcw, User, BookOpen } = require('lucide-react');
  const { formatPhoneNumber } = require('@/lib/utils');

  const confirmRestore = () => {
    startTransition(async () => {
      await require('../actions').restoreTeacherAction(teacher.id, teacher.userId);
      setIsRestoreModalOpen(false);
      router.refresh();
    });
  };

  return (
    <>
      <div 
        onClick={() => router.push(`/teachers/${teacher.id}`)}
        className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm relative overflow-hidden transition-colors cursor-pointer active:scale-[0.99]"
      >
        <div className="flex items-start justify-between mb-3 border-b border-gray-50 pb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border border-white flex-shrink-0 ${teacher.gender === 'FEMALE' ? 'bg-pink-100 text-pink-700' : teacher.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
              {teacher.firstName?.charAt(0)}{teacher.lastName?.charAt(0)}
            </div>
            <div>
              <div className="font-bold text-gray-900">{teacher.firstName} {teacher.lastName}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" />
                {teacher.gender === 'MALE' ? 'Erkek' : 'Kadın'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">E-posta</p>
            <p className="font-semibold text-gray-600 text-xs truncate max-w-[120px]" title={teacher.email}>@{teacher.email.split('@')[0]}</p>
          </div>
          <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100/50">
            <p className="text-[10px] uppercase font-bold text-gray-400 mb-0.5">Telefon</p>
            <p className="font-semibold text-gray-600 text-xs">{teacher.phone ? formatPhoneNumber(teacher.phone) : '-'}</p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-3 border-t border-gray-50">
          <div>
            {teacher.subjectName ? (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border"
                style={{
                  backgroundColor: `${teacher.subjectColor}15`,
                  color: teacher.subjectColor || '#6366f1',
                  borderColor: `${teacher.subjectColor}30`,
                }}
              >
                <BookOpen className="w-3 h-3" />
                {teacher.subjectName}
              </span>
            ) : (
              <span className="text-xs text-gray-400 italic">Belirtilmemiş</span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsRestoreModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded-xl transition-colors border border-emerald-200/50 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Geri Yükle
          </button>
        </div>
      </div>

      {isRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsRestoreModalOpen(false)} />
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 fade-in duration-200 p-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <RotateCcw className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Öğretmeni Geri Yükle</h3>
            <p className="text-sm text-gray-500 mb-6">
              <span className="font-bold">{teacher.firstName} {teacher.lastName}</span> adlı öğretmeni aktif kadroya geri yüklemek istediğinize emin misiniz?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsRestoreModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                disabled={isPending}
              >
                İptal
              </button>
              <button
                onClick={confirmRestore}
                className="flex-1 px-4 py-2.5 text-white bg-emerald-600 rounded-xl font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                disabled={isPending}
              >
                {isPending ? 'Yükleniyor...' : 'Evet, Geri Yükle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
