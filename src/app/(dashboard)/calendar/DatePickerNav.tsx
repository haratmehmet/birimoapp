'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useRef } from 'react';

export function DatePickerNav({
  prevDate,
  nextDate,
  currentDate,
  displayDate,
}: {
  prevDate: string;
  nextDate: string;
  currentDate: string;
  displayDate: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const createQueryString = (name: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    return params.toString();
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      document.cookie = `lastCalendarDate=${e.target.value}; path=/; max-age=86400`; // 1 day
      router.push(`/calendar?${createQueryString('date', e.target.value)}`);
    }
  };

  const handleOpenPicker = () => {
    if (inputRef.current) {
      try {
        inputRef.current.showPicker();
      } catch (e) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button 
        onClick={() => {
          document.cookie = `lastCalendarDate=${prevDate}; path=/; max-age=86400`;
          router.push(`/calendar?${createQueryString('date', prevDate)}`);
        }}
        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-900"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      
      <div className="relative group flex items-center justify-center">
        <div 
          onClick={handleOpenPicker}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white rounded-xl text-gray-900 font-bold min-w-[180px] sm:min-w-[220px] justify-center cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200 hover:border-gray-300 shadow-sm overflow-hidden"
        >
          <CalendarIcon className="w-4 h-4 text-primary shrink-0" />
          <span className="whitespace-nowrap text-sm sm:text-base truncate">{displayDate}</span>
          <ChevronDown className="w-4 h-4 opacity-50 ml-1 shrink-0" />
        </div>
        
        {/* Hidden native input, triggered via showPicker() */}
        <input 
          ref={inputRef}
          type="date" 
          value={currentDate}
          onChange={handleDateChange}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 opacity-0 pointer-events-none"
          title="Tarih Seç"
          style={{ visibility: 'hidden' }}
        />
      </div>
      
      <button 
        onClick={() => {
          document.cookie = `lastCalendarDate=${nextDate}; path=/; max-age=86400`;
          router.push(`/calendar?${createQueryString('date', nextDate)}`);
        }}
        className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-500 hover:text-gray-900"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}
