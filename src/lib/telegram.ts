import { TelegramUser, UserRole } from '@/types';

// Telegram WebApp types
declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setText: (text: string) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
  };
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  platform: string;
  version: string;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text?: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

export function initTelegramApp(): void {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#fafafa');
    tg.setBackgroundColor('#fafafa');
  }
}

export function getTelegramUser(): TelegramUser | null {
  const tg = getTelegramWebApp();
  if (tg?.initDataUnsafe?.user) {
    return tg.initDataUnsafe.user;
  }
  return null;
}

export function getInitData(): string | null {
  const tg = getTelegramWebApp();
  return tg?.initData || null;
}

export function showMainButton(text: string, onClick: () => void): void {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.MainButton.setText(text);
    tg.MainButton.onClick(onClick);
    tg.MainButton.show();
  }
}

export function hideMainButton(): void {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.MainButton.hide();
  }
}

export function showBackButton(onClick: () => void): void {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.BackButton.onClick(onClick);
    tg.BackButton.show();
  }
}

export function hideBackButton(): void {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.BackButton.hide();
  }
}

// Check if Telegram version supports a feature (showAlert requires 6.2+)
function isVersionAtLeast(version: string, minVersion: string): boolean {
  const v1 = version.split('.').map(Number);
  const v2 = minVersion.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const num1 = v1[i] || 0;
    const num2 = v2[i] || 0;
    if (num1 > num2) return true;
    if (num1 < num2) return false;
  }
  return true;
}

export function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning'): void {
  const tg = getTelegramWebApp();
  if (tg) {
    try {
      if (['light', 'medium', 'heavy'].includes(type)) {
        tg.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy');
      } else {
        tg.HapticFeedback.notificationOccurred(type as 'success' | 'error' | 'warning');
      }
    } catch {
      // Haptic feedback not supported, silently ignore
    }
  }
}

export function showAlert(message: string): Promise<void> {
  return new Promise((resolve) => {
    const tg = getTelegramWebApp();
    // showAlert requires Telegram Web App version 6.2+
    if (tg && isVersionAtLeast(tg.version, '6.2')) {
      try {
        tg.showAlert(message, resolve);
      } catch {
        alert(message);
        resolve();
      }
    } else {
      alert(message);
      resolve();
    }
  });
}

export function showConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const tg = getTelegramWebApp();
    // showConfirm requires Telegram Web App version 6.2+
    if (tg && isVersionAtLeast(tg.version, '6.2')) {
      try {
        tg.showConfirm(message, (confirmed) => resolve(confirmed));
      } catch {
        resolve(confirm(message));
      }
    } else {
      resolve(confirm(message));
    }
  });
}

export function closeTelegramApp(): void {
  const tg = getTelegramWebApp();
  if (tg) {
    tg.close();
  }
}

// Mock function for development without Telegram
export function getMockUser(role: UserRole = 'client'): TelegramUser {
  return {
    id: 123456789,
    first_name: role === 'admin' ? 'Администратор' : role === 'master' ? 'Мастер' : 'Клиент',
    last_name: 'Тестовый',
    username: role === 'admin' ? 'admin_test' : role === 'master' ? 'master_test' : 'client_test'
  };
}

