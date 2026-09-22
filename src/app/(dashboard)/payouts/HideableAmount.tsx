'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function HideableAmount({ amount, className }: { amount: string | number, className?: string }) {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('mentoros_show_earnings');
    if (saved !== null) {
      setShow(saved === 'true');
    }
  }, []);

  const handleToggle = () => {
    const nextState = !show;
    setShow(nextState);
    localStorage.setItem('mentoros_show_earnings', String(nextState));
  };

  const displayValue = (!mounted || !show) ? '*** ₺' : amount;

  return (
    <div className="flex items-center gap-2">
      <h3 className={className}>{displayValue}</h3>
      <button 
        onClick={handleToggle} 
        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
        title={show ? 'Gizle' : 'Göster'}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

