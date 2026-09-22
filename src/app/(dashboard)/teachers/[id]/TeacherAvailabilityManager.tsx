'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { CalendarClock, Check, Save, Plus, X, Clock } from 'lucide-react';
import { updateTeacherAvailabilityAction } from './actions';
import { useRouter } from 'next/navigation';
import { parse, addMinutes, format, isBefore, isEqual } from 'date-fns';

const ALL_DAYS = [
  { id: 'MONDAY', numId: '1', label: 'Pazartesi' },
  { id: 'TUESDAY', numId: '2', label: 'Salı' },
  { id: 'WEDNESDAY', numId: '3', label: 'Çarşamba' },
  { id: 'THURSDAY', numId: '4', label: 'Perşembe' },
  { id: 'FRIDAY', numId: '5', label: 'Cuma' },
  { id: 'SATURDAY', numId: '6', label: 'Cumartesi' },
  { id: 'SUNDAY', numId: '7', label: 'Pazar' },
];

export function TeacherAvailabilityManager({ 
  teacherId, 
  initialAvailabilities = [], 
  orgSettings 
}: { 
  teacherId: string; 
  initialAvailabilities: any[]; 
  orgSettings: any; 
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  const activeDaysArr = orgSettings.activeDays ? orgSettings.activeDays.split(',') : ['1','2','3','4','5','6','7'];
  const DAYS = ALL_DAYS.filter(d => activeDaysArr.includes(d.numId));

  // Generate Time Slots based on settings
  const timeSlots = useMemo(() => {
    const slots = [];
    const baseDate = new Date();
    let current = parse(orgSettings.startHour || '09:00', 'HH:mm', baseDate);
    const end = parse(orgSettings.endHour || '18:00', 'HH:mm', baseDate);
    const lessonDur = parseInt(orgSettings.lessonDurationMinutes || '60');
    const breakDur = parseInt(orgSettings.breakDurationMinutes || '0');

    let lunchStart: Date | null = null;
    let lunchEnd: Date | null = null;
    if (orgSettings.lunchBreakStartTime && orgSettings.lunchBreakEndTime) {
      lunchStart = parse(orgSettings.lunchBreakStartTime, 'HH:mm', baseDate);
      lunchEnd = parse(orgSettings.lunchBreakEndTime, 'HH:mm', baseDate);
    }

    while (isBefore(current, end) || isEqual(current, end)) {
      const slotEnd = addMinutes(current, lessonDur);
      
      const isOverlapWithLunch = lunchStart && lunchEnd && (
        (isBefore(current, lunchEnd) && isBefore(lunchStart, slotEnd))
      );

      if (isOverlapWithLunch) {
        current = lunchEnd!;
        continue;
      }

      if (isBefore(slotEnd, end) || isEqual(slotEnd, end)) {
        slots.push({
          start: format(current, 'HH:mm'),
          end: format(slotEnd, 'HH:mm'),
          label: `${format(current, 'HH:mm')} - ${format(slotEnd, 'HH:mm')}`
        });
      }
      current = addMinutes(slotEnd, breakDur);
    }
    return slots;
  }, [orgSettings]);

  // Initialize state from db
  // schedule is now Record<string, { active: boolean; slots: {start: string, end: string}[] }>
  const [schedule, setSchedule] = useState(() => {
    const s: Record<string, { active: boolean; slots: {start: string, end: string}[] }> = {};
    DAYS.forEach(d => {
      const existing = initialAvailabilities.filter(a => a.dayOfWeek === d.id);
      if (existing.length > 0) {
        s[d.id] = { active: true, slots: existing.map(e => ({ start: e.startTime, end: e.endTime })) };
      } else {
        s[d.id] = { active: false, slots: [] };
      }
    });
    return s;
  });

  const [dropdownOpenFor, setDropdownOpenFor] = useState<string | null>(null);

  const handleSave = async () => {
    setPending(true);
    setSuccess(false);

    const payload: { dayOfWeek: string; startTime: string; endTime: string }[] = [];
    Object.keys(schedule).forEach(day => {
      if (schedule[day].active) {
        schedule[day].slots.forEach(slot => {
          payload.push({
            dayOfWeek: day,
            startTime: slot.start,
            endTime: slot.end,
          });
        });
      }
    });

    const res = await updateTeacherAvailabilityAction(teacherId, payload);
    setPending(false);
    if (res.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } else {
      alert("Hata: " + res.error);
    }
  };

  const toggleDay = (dayId: string) => {
    setSchedule(prev => {
      const current = prev[dayId];
      if (!current.active) {
        // Turning ON -> maybe add all slots by default or leave empty? Let's leave empty.
        return { ...prev, [dayId]: { active: true, slots: [] } };
      } else {
        // Turning OFF -> clear slots
        return { ...prev, [dayId]: { active: false, slots: [] } };
      }
    });
  };

  const addSlot = (dayId: string, slot: {start: string, end: string}) => {
    setSchedule(prev => {
      const currentSlots = prev[dayId].slots;
      if (currentSlots.some(s => s.start === slot.start)) return prev; // already exists
      // add and sort by start time
      const newSlots = [...currentSlots, slot].sort((a, b) => a.start.localeCompare(b.start));
      return { ...prev, [dayId]: { ...prev[dayId], slots: newSlots } };
    });
    setDropdownOpenFor(null);
  };

  const removeSlot = (dayId: string, start: string) => {
    setSchedule(prev => ({
      ...prev,
      [dayId]: { ...prev[dayId], slots: prev[dayId].slots.filter(s => s.start !== start) }
    }));
  };

  return (
    <div className="mt-8 bg-white border border-gray-100 rounded-2xl shadow-sm relative">
      <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-50/50 to-white border-b border-indigo-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h4 className="text-gray-900 font-bold text-base sm:text-lg flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-indigo-500" />
          Haftalık Müsaitlik
        </h4>
        
        <button 
          onClick={handleSave}
          disabled={pending}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {pending ? 'Kaydediliyor...' : success ? <><Check className="w-4 h-4"/> Kaydedildi</> : <><Save className="w-4 h-4" /> Değişiklikleri Kaydet</>}
        </button>
      </div>
      
      <div className="p-6">
        <div className="space-y-4">
          {DAYS.map((day) => {
            const data = schedule[day.id];
            if (!data) return null;
            return (
              <div key={day.id} className={`flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 rounded-xl border transition-colors ${data.active ? 'bg-white border-indigo-100 shadow-sm' : 'bg-gray-50 border-gray-100/50 opacity-70'}`}>
                
                <div className="w-full sm:w-32 flex items-center justify-between sm:justify-start gap-3 shrink-0">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => toggleDay(day.id)}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center cursor-pointer transition-colors ${data.active ? 'bg-primary border-primary' : 'bg-white border-gray-300'}`}
                    >
                      {data.active && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <span className={`font-semibold ${data.active ? 'text-gray-900' : 'text-gray-400'}`}>
                      {day.label}
                    </span>
                  </div>
                  {!data.active && <span className="sm:hidden text-xs text-gray-400 italic font-medium">Kapalı</span>}
                </div>

                {data.active ? (
                  <div className="flex-1 flex flex-wrap items-center gap-2">
                    {data.slots.map(slot => (
                      <div key={slot.start} className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm group">
                        <Clock className="w-3.5 h-3.5 opacity-70" />
                        <span>{slot.start} - {slot.end}</span>
                        <button 
                          onClick={() => removeSlot(day.id, slot.start)}
                          className="ml-1 p-0.5 rounded-md hover:bg-indigo-200 text-indigo-500 hover:text-indigo-800 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    
                    <div className="relative">
                      <button 
                        onClick={() => setDropdownOpenFor(dropdownOpenFor === day.id ? null : day.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 rounded-lg text-sm font-bold text-gray-600 transition-colors shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Saat Ekle
                      </button>

                      {dropdownOpenFor === day.id && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl z-[60] overflow-hidden flex flex-col max-h-60 overflow-y-auto custom-scrollbar">
                          <div className="p-2 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase">
                            Müsait Saat Seçin
                          </div>
                          {timeSlots.map(slot => {
                            const isSelected = data.slots.some(s => s.start === slot.start);
                            if (isSelected) return null;
                            return (
                              <button
                                key={slot.start}
                                onClick={() => addSlot(day.id, slot)}
                                className="text-left px-4 py-2 text-sm font-medium hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-gray-50 last:border-0"
                              >
                                {slot.label}
                              </button>
                            );
                          })}
                          {timeSlots.every(slot => data.slots.some(s => s.start === slot.start)) && (
                            <div className="p-3 text-xs text-gray-400 text-center italic">
                              Tüm saatler eklendi
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="hidden sm:flex flex-1 text-sm text-gray-400 font-medium italic items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                    Müsait Değil / Dersi Var
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Overlay for dropdown to close when clicked outside */}
      {dropdownOpenFor && (
        <div 
          className="fixed inset-0 z-[50]" 
          onClick={() => setDropdownOpenFor(null)}
        />
      )}
    </div>
  );
}
