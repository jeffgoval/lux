import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SecureAuthProvider } from "@/contexts/SecureAuthContext";
import { NavigationProvider } from "@/contexts/NavigationContext";
import { SecureAuthGuard } from "./components/SecureAuthGuard";
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
import SecureAuth from "./pages/SecureAuth";
import Perfil from "./pages/Perfil";
import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import { DashboardExecutivo } from "./components/executive/DashboardExecutivo";
import { AlertsDashboard } from "./components/alerts/AlertsDashboard";
import { OnboardingWizard } from "./components/OnboardingWizard";
const queryClient = new QueryClient();

const App = () => (
  <GlobalErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <SecureAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <NavigationProvider>
              <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<SecureAuth />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Protected routes */}
            <Route
              path="/onboarding"
              element={
                <SecureAuthGuard allowOnboarding={true}>
                  <OnboardingWizard />
                </SecureAuthGuard>
              }
            />
            <Route
              path="/perfil"
              element={
                <SecureAuthGuard>
                  <Perfil />
                </SecureAuthGuard>
              }
            />
            <Route
              path="/dashboard"
              element={
                <SecureAuthGuard>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </SecureAuthGuard>
              }
            />
            <Route
              path="/agendamento"
              element={
                <SecureAuthGuard requiredRoles={['super_admin', 'clinic_owner', 'clinic_manager', 'receptionist']}>
                  <AppLayout>
                    <Index />
                  </AppLayout>
                </SecureAuthGuard>
              }
            />
            <Route
              path="/clientes"
              element={
                <SecureAuthGuard requiredRoles={['super_admin', 'clinic_owner', 'clinic_manager', 'professional', 'receptionist']}>
                  <AppLayout>
                    <Clientes />
                  </AppLayout>
                </SecureAuthGuard>
              }
            />
            <Route
              path="/clientes/:id"
              element={
                <SecureAuthGuard requiredRoles={['super_admin', 'clinic_owner', 'clinic_manager', 'professional', 'receptionist']}>
                  <AppLayout>
                    <ClienteDetalhes />
                  </AppLayout>
                </SecureAuthGuard>
              }
            />
            <Route
              path="/servicos"
              element={
                <SecureAuthGuard requiredRoles={['super_admin', 'clinic_owner', 'clinic_manager', 'professional']}>
                  <AppLayout>
                    <Servicos />
                  </AppLayout>
                </SecureAuthGuard>
              }
            />
            <Route
              path="/produtos"
              element={
                <SecureAuthGuard requiredRoles={['super_admin', 'clinic_owner', 'clinic_manager']}>
                  <AppLayout>
                    <Produtos />
                  </AppLayout>
                </SecureAuthGuard>
              }
            />
            <Route
              path="/equipamentos"
              element={
                <SecureAuthGuard requiredRoles={['super_admin', 'clinic_owner', 'clinic_manager']}>
                  <AppLayout>
                    <Equipamentos />
                  </AppLayout>
                </SecureAuthGuard>
              }
            />
            <Route
              path="/financeiro"
              element={
                <SecureAuthGuard requiredRoles={['super_admin', 'clinic_owner', 'clinic_manager']}>
                  <AppLayout>
                    <Financeiro />
                  </AppLayout>
                </SecureAuthGuard>
              }
            />
            <Route
              path="/comunicacao"
              element={
                <SecureAuthGuard requiredRoles={['super_admin', 'clinic_owner', 'clinic_manager', 'receptionist']}>
                  <AppLayout>
                    <Comunicacao />
                  </AppLayout>
                </SecureAuthGuard>
              }
            />
            <Route
              path="/prontuarios"
              element={
                <SecureAuthGuard requiredRoles={['super_admin', 'clinic_owner', 'clinic_manager', 'professional']}>
                  <AppLayout>
                    <Prontuarios />
                  </AppLayout>
                </SecureAuthGuard>
              }
            />
            <Route
              path="/executivo"
              element={
                <SecureAuthGuard requiredRoles={['super_admin', 'clinic_owner', 'clinic_manager']}>
                  <AppLayout title="Dashboard Executivo">
                    <DashboardExecutivo />
                  </AppLayout>
                </SecureAuthGuard>
              }
            />
            <Route
              path="/alertas"
              element={
                <SecureAuthGuard requiredRoles={['super_admin', 'clinic_owner', 'clinic_manager']}>
                  <AppLayout title="Alertas Inteligentes">
                    <AlertsDashboard />
                  </AppLayout>
                </SecureAuthGuard>
              }
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
            </NavigationProvider>
          </BrowserRouter>
        </TooltipProvider>
      </SecureAuthProvider>
    </QueryClientProvider>
  </GlobalErrorBoundary>
);

export default App;
