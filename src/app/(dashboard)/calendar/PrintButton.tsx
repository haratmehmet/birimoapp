'use client';

import { Printer } from 'lucide-react';

export function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="p-2 hover:bg-indigo-50 text-indigo-600 rounded-xl transition-colors flex items-center gap-2 font-medium text-sm print:hidden"
      title="Yazdır veya PDF olarak kaydet (Yatay formatta önerilir)"
    >
      <Printer className="w-5 h-5" />
      <span className="hidden sm:inline">Yazdır / PDF</span>
    </button>
  );
}
