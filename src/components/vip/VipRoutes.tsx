/**
 * VipRoutes - Roteamento para Sistema VIP
 * Configuração de rotas exclusivas para clientes VIP
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import VipLayout from './VipLayout';
import VipDashboard from './VipDashboard';
import VipConcierge from './VipConcierge';

// Lazy loading dos outros componentes VIP
const VipAgendamentos = React.lazy(() => import('./VipAgendamentos'));
const VipCreditos = React.lazy(() => import('./VipCreditos'));
const VipBeneficios = React.lazy(() => import('./VipBeneficios'));
const VipHistorico = React.lazy(() => import('./VipHistorico'));

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

export const VipRoutes: React.FC = () => {
  return (
    <VipLayout>
      <React.Suspense 
        fallback={
          <div className="min-h-screen p-8 flex items-center justify-center">
            <div className="text-yellow-400">Carregando...</div>
          </div>
        }
      >
        <Routes>
          <Route path="/" element={<VipDashboard />} />
          <Route path="/agendamentos" element={<VipAgendamentos />} />
          <Route path="/creditos" element={<VipCreditos />} />
          <Route path="/concierge" element={<VipConcierge />} />
          <Route path="/beneficios" element={<VipBeneficios />} />
          <Route path="/historico" element={<VipHistorico />} />
          <Route path="*" element={<Navigate to="/vip" replace />} />
        </Routes>
      </React.Suspense>
    </VipLayout>
  );
};

export default VipRoutes;