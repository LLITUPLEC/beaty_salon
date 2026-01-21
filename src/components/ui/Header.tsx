'use client';

import { Scissors } from 'lucide-react';

interface HeaderProps {
  onLogout?: () => void;
}

export function Header({ onLogout }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full gold-gradient">
            <Scissors className="h-5 w-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">BEAUTY SALON</span>
        </div>
        {onLogout && (
          <button
            onClick={onLogout}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Выйти
          </button>
        )}
      </div>
    </header>
  );
}

