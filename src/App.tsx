import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { FastAuthGuard } from "./components/FastAuthGuard";
import { GlobalErrorBoundary } from "./components/GlobalErrorBoundary";
import { AppLayout } from "./components/AppLayout";
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
import Auth from "./pages/Auth";
import Perfil from "./pages/Perfil";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import { DashboardExecutivo } from "./components/executive/DashboardExecutivo";
import { AlertsDashboard } from "./components/alerts/AlertsDashboard";
import { OnboardingWizard } from "./components/OnboardingWizard";
import { LoadingDebugPanel } from "./components/LoadingDebugPanel";
const queryClient = new QueryClient();

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <NavigationProvider>
              <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Protected routes */}
            <Route 
              path="/onboarding" 
              element={
                <FastAuthGuard>
                  <OnboardingWizard />
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/perfil" 
              element={
                <FastAuthGuard>
                  <Perfil />
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <FastAuthGuard>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/agendamento" 
              element={
                <FastAuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente', 'recepcionistas']}>
                  <AppLayout>
                    <Index />
                  </AppLayout>
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/clientes" 
              element={
                <FastAuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas']}>
                  <AppLayout>
                    <Clientes />
                  </AppLayout>
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/clientes/:id" 
              element={
                <FastAuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas']}>
                  <AppLayout>
                    <ClienteDetalhes />
                  </AppLayout>
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/servicos" 
              element={
                <FastAuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente', 'profissionais']}>
                  <AppLayout>
                    <Servicos />
                  </AppLayout>
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/produtos" 
              element={
                <FastAuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente']}>
                  <AppLayout>
                    <Produtos />
                  </AppLayout>
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/equipamentos" 
              element={
                <FastAuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente']}>
                  <AppLayout>
                    <Equipamentos />
                  </AppLayout>
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/financeiro" 
              element={
                <FastAuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente']}>
                  <AppLayout>
                    <Financeiro />
                  </AppLayout>
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/comunicacao" 
              element={
                <FastAuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente', 'recepcionistas']}>
                  <AppLayout>
                    <Comunicacao />
                  </AppLayout>
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/prontuarios" 
              element={
                <FastAuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente', 'profissionais']}>
                  <AppLayout>
                    <Prontuarios />
                  </AppLayout>
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/executivo" 
              element={
                <FastAuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente']}>
                  <AppLayout title="Dashboard Executivo">
                    <DashboardExecutivo />
                  </AppLayout>
                </FastAuthGuard>
              } 
            />
            <Route 
              path="/alertas" 
              element={
                <FastAuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente']}>
                  <AppLayout title="Alertas Inteligentes">
                    <AlertsDashboard />
                  </AppLayout>
                </FastAuthGuard>
              } 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
              <LoadingDebugPanel />
            </NavigationProvider>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;