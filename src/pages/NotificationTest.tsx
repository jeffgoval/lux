/**
 * 📄 PÁGINA DE TESTE DO SISTEMA DE NOTIFICAÇÕES
 * 
 * Página para testar todas as funcionalidades do sistema de notificações
 */

import React from 'react';
import { NotificationDemo } from '@/components/notifications/NotificationDemo';

const NotificationTest: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <NotificationDemo />
    </div>
  );
};

export default NotificationTest;