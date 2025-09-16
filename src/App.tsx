import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";

import { NavigationProvider } from "@/contexts/NavigationContext";
import { PostAuthRedirectHandler } from "@/components/auth/PostAuthRedirectHandler";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { LogoutHandler } from "@/components/auth/LogoutHandler";
// Guards removidos - sistema sem autenticação
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { AppLayout } from "./components/AppLayout";
import { LandingPage } from "./components/LandingPage";
import { FEATURE_FLAGS, logFeatureFlags } from "@/config/feature-flags";
import { NotificationProvider, GlobalLoadingIndicator } from "./components/notifications/NotificationSystem";
import Dashboard from "./pages/Dashboard";
import Index from "./pages/Index";
import Clientes from "./pages/Clientes";
import ClienteDetalhes from "./pages/ClienteDetalhes";
import Servicos from "./pages/Servicos";
import Produtos from "./pages/Produtos";
import Equipamentos from "./pages/Equipamentos";
import Financeiro from "./pages/Financeiro";
import Comunicacao from "./pages/Comunicacao";
import Prontuarios from "./pages/Prontuarios";
import SecureAuth from "./pages/SecureAuth";
import Perfil from "./pages/Perfil";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import { DashboardExecutivo } from "./components/executive/DashboardExecutivo";
import { AlertsDashboard } from "./components/alerts/AlertsDashboard";
import { OnboardingWizard } from "./components/OnboardingWizard";
import TestAuthPage from "./pages/TestAuth";
import NotificationTest from "./pages/NotificationTest";
const queryClient = new QueryClient();

const App = () => {
  // Log feature flags on app start
  logFeatureFlags();

  // Validate that we're using the unified auth system
  if (!FEATURE_FLAGS.USE_UNIFIED_AUTH) {
    console.error('❌ Unified auth system is disabled. This version requires unified auth.');
    throw new Error('Unified auth system is required');
  }

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <NotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <GlobalLoadingIndicator />
              <BrowserRouter>
                <PostAuthRedirectHandler>
                  <LogoutHandler />
                  <NavigationProvider>
                    <Routes>
            {/* Protected Routes - Require Authentication */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout><Dashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/agendamento" element={
              <ProtectedRoute>
                <AppLayout><Index /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/clientes" element={
              <ProtectedRoute>
                <AppLayout><Clientes /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/clientes/:id" element={
              <ProtectedRoute>
                <AppLayout><ClienteDetalhes /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/servicos" element={
              <ProtectedRoute>
                <AppLayout><Servicos /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/produtos" element={
              <ProtectedRoute>
                <AppLayout><Produtos /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/equipamentos" element={
              <ProtectedRoute>
                <AppLayout><Equipamentos /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/financeiro" element={
              <ProtectedRoute>
                <AppLayout><Financeiro /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/comunicacao" element={
              <ProtectedRoute>
                <AppLayout><Comunicacao /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/prontuarios" element={
              <ProtectedRoute>
                <AppLayout><Prontuarios /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/executivo" element={
              <ProtectedRoute>
                <AppLayout title="Dashboard Executivo"><DashboardExecutivo /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/alertas" element={
              <ProtectedRoute>
                <AppLayout title="Alertas Inteligentes"><AlertsDashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/perfil" element={
              <ProtectedRoute>
                <Perfil />
              </ProtectedRoute>
            } />
            
            {/* Test routes - Protected */}
            <Route path="/test-auth" element={
              <ProtectedRoute>
                <TestAuthPage />
              </ProtectedRoute>
            } />
            <Route path="/test-notifications" element={
              <ProtectedRoute>
                <NotificationTest />
              </ProtectedRoute>
            } />
            
            {/* Public Routes - Landing page for unauthenticated users */}
            <Route path="/" element={<Landing />} />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
                    </Routes>
                  </NavigationProvider>
                </PostAuthRedirectHandler>
              </BrowserRouter>
            </TooltipProvider>
        </NotificationProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
