'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear, subMonths } from 'date-fns';
import { tr } from 'date-fns/locale';

export function DateRangeFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Initialize with current month if no params exist
  const [startDate, setStartDate] = useState(() => {
    const paramDate = searchParams.get('startDate');
    return paramDate || format(startOfMonth(new Date()), 'yyyy-MM-dd');
  });
  
  const [endDate, setEndDate] = useState(() => {
    const paramDate = searchParams.get('endDate');
    return paramDate || format(endOfMonth(new Date()), 'yyyy-MM-dd');
  });

  const handleApply = () => {
    const params = new URLSearchParams(searchParams);
    params.set('startDate', startDate);
    params.set('endDate', endDate);
    router.push(`?${params.toString()}`);
  };

  // Optional: Auto-apply when dates change, or require a button click. Let's auto-apply for smoother UX.
  useEffect(() => {
    if (startDate && endDate) {
      handleApply();
    }
  }, [startDate, endDate]);

  const setShortcut = (type: 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'all') => {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (type) {
      case 'today':
        start = now;
        end = now;
        break;
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'month':
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case 'lastMonth': {
        const prev = subMonths(now, 1);
        start = startOfMonth(prev);
        end = endOfMonth(prev);
        break;
      }
      case 'year':
        start = startOfYear(now);
        end = endOfYear(now);
        break;
      case 'all':
        start = new Date(2025, 0, 1);
        end = new Date(2030, 11, 31);
        break;
    }

    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  const todayNow = new Date();
  const todayStr = format(todayNow, 'yyyy-MM-dd');
  const weekStartStr = format(startOfWeek(todayNow, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEndStr = format(endOfWeek(todayNow, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const monthStartStr = format(startOfMonth(todayNow), 'yyyy-MM-dd');
  const monthEndStr = format(endOfMonth(todayNow), 'yyyy-MM-dd');
  const lastMonthStartStr = format(startOfMonth(subMonths(todayNow, 1)), 'yyyy-MM-dd');
  const lastMonthEndStr = format(endOfMonth(subMonths(todayNow, 1)), 'yyyy-MM-dd');
  const yearStartStr = format(startOfYear(todayNow), 'yyyy-MM-dd');
  const yearEndStr = format(endOfYear(todayNow), 'yyyy-MM-dd');
  const allStartStr = '2025-01-01';
  const allEndStr = '2030-12-31';

  const isToday = startDate === todayStr && endDate === todayStr;
  const isWeek = startDate === weekStartStr && endDate === weekEndStr;
  const isMonth = startDate === monthStartStr && endDate === monthEndStr;
  const isLastMonth = startDate === lastMonthStartStr && endDate === lastMonthEndStr;
  const isYear = startDate === yearStartStr && endDate === yearEndStr;
  const isAll = startDate === allStartStr && endDate === allEndStr;

  return (
    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
      {/* Kısayol Butonları */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl shadow-sm border border-gray-200 overflow-x-auto max-w-full">
        <button 
          onClick={() => setShortcut('today')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            isToday 
              ? 'bg-primary text-white shadow-xs' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Bugün
        </button>
        <button 
          onClick={() => setShortcut('week')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            isWeek 
              ? 'bg-primary text-white shadow-xs' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Bu Hafta
        </button>
        <button 
          onClick={() => setShortcut('month')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            isMonth 
              ? 'bg-primary text-white shadow-xs' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Bu Ay
        </button>
        <button 
          onClick={() => setShortcut('lastMonth')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            isLastMonth 
              ? 'bg-primary text-white shadow-xs' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Geçen Ay
        </button>
        <button 
          onClick={() => setShortcut('year')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            isYear 
              ? 'bg-primary text-white shadow-xs' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Bu Yıl
        </button>
        <button 
          onClick={() => setShortcut('all')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
            isAll 
              ? 'bg-primary text-white shadow-xs' 
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          Tümü
        </button>
      </div>

      {/* Tarih Seçici */}
      <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
          <CalendarIcon className="w-4 h-4 text-gray-400 mr-2" />
          <input 
            type="date" 
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none"
          />
        </div>
        <span className="text-gray-400 font-bold">-</span>
        <div className="flex items-center bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-100">
          <input 
            type="date" 
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-transparent text-sm font-semibold text-gray-700 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
