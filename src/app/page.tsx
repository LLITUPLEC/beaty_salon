'use client';

import { useEffect, useState } from 'react';
import { Scissors } from 'lucide-react';
import { ClientDashboard, MasterDashboard, AdminDashboard } from '@/components';
import { UserRole, TelegramUser } from '@/types';
import {
  initTelegramApp,
  getTelegramUser,
  getMockUser,
  getInitData
} from '@/lib/telegram';
import { authenticateUser } from '@/lib/api-client';

interface AuthenticatedUser {
  id: number;
  telegramId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  role: UserRole;
  nickname?: string | null;
  canCreateServices?: boolean;
}

export default function Home() {
  const [user, setUser] = useState<TelegramUser | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
          // Fallback to client role if auth fails
          setUser(getMockUser('client'));
          setRole('client');
        }
      } else {
        // Development mode - no Telegram, default to client
        setUser(getMockUser('client'));
        setRole('client');
      }
      
      setIsLoading(false);
    }

    init();
  }, []);

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
  if (role === 'master' && authenticatedUser) {
    return (
      <MasterDashboard 
        masterName={authenticatedUser.nickname || userName} 
        masterId={authenticatedUser.id}
        canCreateServices={authenticatedUser.canCreateServices}
      />
    );
  }

  if (role === 'admin') {
    return <AdminDashboard />;
  }

  // Default: client dashboard
  return <ClientDashboard userName={userName} />;
}
