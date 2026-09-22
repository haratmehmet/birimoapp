'use client';

import { useState } from 'react';
import { toggleSubjectAction } from './actions';
import { BookOpen, Check, Loader2 } from 'lucide-react';

export const PREDEFINED_SUBJECTS = [
  { name: 'Matematik', color: '#3B82F6' }, // Blue
  { name: 'Türkçe', color: '#EF4444' }, // Red
  { name: 'Tarih', color: '#8B5CF6' }, // Violet
  { name: 'Fizik', color: '#0EA5E9' }, // Sky
  { name: 'Coğrafya', color: '#F59E0B' }, // Amber
  { name: 'Kimya', color: '#10B981' }, // Emerald
  { name: 'Biyoloji', color: '#84CC16' }, // Lime
  { name: 'Edebiyat', color: '#F43F5E' }, // Rose
  { name: 'Fen Bilimleri', color: '#14B8A6' }, // Teal
  { name: 'İnkılap', color: '#D946EF' }, // Fuchsia
  { name: 'Felsefe', color: '#6366F1' }, // Indigo
  { name: 'İngilizce', color: '#F97316' }, // Orange
  { name: 'Din Kültürü', color: '#22C55E' }, // Green
  { name: 'Geometri', color: '#64748B' }, // Slate
];

export function SubjectList({ activeSubjects }: { activeSubjects: { name: string }[] }) {
  const [loadingSubject, setLoadingSubject] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeNames = activeSubjects.map(s => s.name);

  const handleToggle = async (name: string, color: string) => {
    setLoadingSubject(name);
    setError(null);
    const result = await toggleSubjectAction(name, color);
    if (result.error) {
      setError(result.error);
    }
    setLoadingSubject(null);
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {PREDEFINED_SUBJECTS.map((subject) => {
          const isActive = activeNames.includes(subject.name);
          const isLoading = loadingSubject === subject.name;

          return (
            <button
              key={subject.name}
              onClick={() => handleToggle(subject.name, subject.color)}
              disabled={isLoading}
              className={`relative overflow-hidden group flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${
                isActive 
                  ? 'bg-white border-gray-200 shadow-sm hover:shadow-md' 
                  : 'bg-gray-50 border-gray-100 opacity-60 hover:opacity-100 grayscale hover:grayscale-0'
              }`}
            >
              {/* Background Tint if active */}
              {isActive && (
                <div 
                  className="absolute inset-0 opacity-10" 
                  style={{ backgroundColor: subject.color }} 
                />
              )}

              <div className="flex items-center gap-3 relative z-10">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110"
                  style={{ backgroundColor: isActive ? subject.color : '#9CA3AF' }}
                >
                  <BookOpen className="w-5 h-5" />
                </div>
                <span className={`font-bold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>
                  {subject.name}
                </span>
              </div>

              <div className="relative z-10">
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : isActive ? (
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: subject.color }}
                  >
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
