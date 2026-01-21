'use client';

import { useEffect, useState } from 'react';
import { Scissors, User, Crown } from 'lucide-react';
import { ClientDashboard, MasterDashboard, AdminDashboard } from '@/components';
import { UserRole, TelegramUser } from '@/types';
import {
  initTelegramApp,
  getTelegramUser,
  getMockUser,
  getInitData
} from '@/lib/telegram';
import { authenticateUser } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface AuthenticatedUser {
  id: number;
  telegramId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  role: UserRole;
}

export default function Home() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    async function init() {
      // Initialize Telegram Web App
      initTelegramApp();

      // Get user from Telegram
      const tgUser = getTelegramUser();
      const initData = getInitData();
      
      if (tgUser && initData) {
        setUser(tgUser);
        
        // Authenticate with backend
        const authResult = await authenticateUser();
        
        if (authResult.success && authResult.data) {
          setAuthenticatedUser({
            ...authResult.data,
            role: authResult.data.role as UserRole
          });
          setRole(authResult.data.role as UserRole);
        } else {
          // Fallback to dev mode if auth fails
          setIsDevMode(true);
          setUser(getMockUser('client'));
        }
      } else {
        // Development mode - no Telegram
        setIsDevMode(true);
        setUser(getMockUser('client'));
      }
      
      setIsLoading(false);
    }

    init();
  }, []);

  const handleSelectRole = (selectedRole: UserRole) => {
    setRole(selectedRole);
  };

  const handleLogout = () => {
    if (isDevMode) {
      setRole(null);
    } else {
      // В production можно закрыть приложение
      setRole(null);
    }
  };

  const userName = authenticatedUser
    ? `${authenticatedUser.firstName}${authenticatedUser.lastName ? ' ' + authenticatedUser.lastName : ''}`
    : user
    ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
    : 'Гость';

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full gold-gradient mx-auto mb-4 flex items-center justify-center animate-pulse">
            <Scissors className="h-6 w-6 text-white" />
          </div>
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Show dashboard based on role
  if (role === 'client') {
    return <ClientDashboard userName={userName} onLogout={handleLogout} />;
  }

  if (role === 'master') {
    return <MasterDashboard masterName={userName} onLogout={handleLogout} />;
  }

  if (role === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  // Role selection screen (for dev mode or when role not determined)
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container mx-auto flex h-14 items-center justify-center px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full gold-gradient">
              <Scissors className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">BEAUTY SALON</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Добро пожаловать
          </h1>
          <p className="text-gray-500">
            {userName}, выберите роль для демонстрации
          </p>
        </div>

        <div className="space-y-4">
          {/* Client role */}
          <button
            onClick={() => handleSelectRole('client')}
            className={cn(
              'w-full p-6 rounded-2xl border-2 bg-white text-left transition-all',
              'hover:border-amber-500 hover:shadow-md'
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center">
                <User className="h-7 w-7 text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Клиент</h3>
                <p className="text-sm text-gray-500">
                  Запись на услуги, просмотр записей
                </p>
              </div>
            </div>
          </button>

          {/* Master role */}
          <button
            onClick={() => handleSelectRole('master')}
            className={cn(
              'w-full p-6 rounded-2xl border-2 bg-white text-left transition-all',
              'hover:border-amber-500 hover:shadow-md'
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center">
                <Scissors className="h-7 w-7 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Мастер</h3>
                <p className="text-sm text-gray-500">
                  Управление записями и услугами
                </p>
              </div>
            </div>
          </button>

          {/* Admin role */}
          <button
            onClick={() => handleSelectRole('admin')}
            className={cn(
              'w-full p-6 rounded-2xl border-2 bg-white text-left transition-all',
              'hover:border-amber-500 hover:shadow-md'
            )}
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center">
                <Crown className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Администратор</h3>
                <p className="text-sm text-gray-500">
                  Полное управление салоном
                </p>
              </div>
            </div>
          </button>
        </div>

        {isDevMode && (
          <div className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <p className="text-sm text-amber-800 text-center">
              <strong>Демо-режим:</strong> В реальном приложении роль определяется
              автоматически по вашему Telegram ID
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white py-4">
        <p className="text-center text-sm text-gray-400">
          Beauty Salon © {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
