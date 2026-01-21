'use client';

import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
  /** Если true, кнопки будут занимать равную ширину (для 2-3 табов у клиента/мастера) */
  fullWidth?: boolean;
}

export function Tabs({ tabs, activeTab, onTabChange, className, fullWidth = false }: TabsProps) {
  // Если мало табов (2-3) и fullWidth - делаем их равной ширины
  const shouldUseFullWidth = fullWidth && tabs.length <= 3;
  
  return (
    <div className={cn(shouldUseFullWidth ? '' : 'overflow-x-auto -mx-4 px-4', className)}>
      <div className={cn(
        'flex rounded-lg border bg-white p-1',
        shouldUseFullWidth ? 'w-full' : 'min-w-max'
      )}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-all duration-200',
              shouldUseFullWidth && 'flex-1 text-center',
              activeTab === tab.id
                ? 'gold-gradient text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface TabContentProps {
  children: React.ReactNode;
  className?: string;
}

export function TabContent({ children, className }: TabContentProps) {
  return (
    <div className={cn('animate-fade-in', className)}>
      {children}
    </div>
  );
}
