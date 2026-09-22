'use client';

import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { ImpersonateModal, ImpersonateTargetOrg } from './ImpersonateModal';

interface ImpersonateButtonProps {
  org: ImpersonateTargetOrg;
  className?: string;
}

export function ImpersonateButton({ org, className }: ImpersonateButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={className || "inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#004aad] to-[#003882] hover:from-[#003882] hover:to-[#002250] text-white rounded-lg transition-all font-bold text-xs shadow-sm hover:shadow active:scale-95 cursor-pointer"}
        title="Kurumu Ziyaret Et (Kurum yetkilisi olarak sisteme bağlan ve yönet)"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Ziyaret Et</span>
      </button>

      <ImpersonateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        org={org}
      />
    </>
  );
}
