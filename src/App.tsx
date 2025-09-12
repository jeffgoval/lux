import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "./components/AuthGuard";
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
import { OnboardingWizard } from "./components/OnboardingWizard";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Protected routes */}
            <Route 
              path="/onboarding" 
              element={
                <AuthGuard>
                  <OnboardingWizard />
                </AuthGuard>
              } 
            />
            <Route 
              path="/perfil" 
              element={
                <AuthGuard>
                  <Perfil />
                </AuthGuard>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <AuthGuard>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </AuthGuard>
              } 
            />
            <Route 
              path="/agendamento" 
              element={
                <AuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente', 'recepcionistas']}>
                  <AppLayout>
                    <Index />
                  </AppLayout>
                </AuthGuard>
              } 
            />
            <Route 
              path="/clientes" 
              element={
                <AuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas']}>
                  <AppLayout>
                    <Clientes />
                  </AppLayout>
                </AuthGuard>
              } 
            />
            <Route 
              path="/clientes/:id" 
              element={
                <AuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas']}>
                  <AppLayout>
                    <ClienteDetalhes />
                  </AppLayout>
                </AuthGuard>
              } 
            />
            <Route 
              path="/servicos" 
              element={
                <AuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente', 'profissionais']}>
                  <AppLayout>
                    <Servicos />
                  </AppLayout>
                </AuthGuard>
              } 
            />
            <Route 
              path="/produtos" 
              element={
                <AuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente']}>
                  <AppLayout>
                    <Produtos />
                  </AppLayout>
                </AuthGuard>
              } 
            />
            <Route 
              path="/equipamentos" 
              element={
                <AuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente']}>
                  <AppLayout>
                    <Equipamentos />
                  </AppLayout>
                </AuthGuard>
              } 
            />
            <Route 
              path="/financeiro" 
              element={
                <AuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente']}>
                  <AppLayout>
                    <Financeiro />
                  </AppLayout>
                </AuthGuard>
              } 
            />
            <Route 
              path="/comunicacao" 
              element={
                <AuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente', 'recepcionistas']}>
                  <AppLayout>
                    <Comunicacao />
                  </AppLayout>
                </AuthGuard>
              } 
            />
            <Route 
              path="/prontuarios" 
              element={
                <AuthGuard requiredRoles={['super_admin', 'proprietaria', 'gerente', 'profissionais']}>
                  <AppLayout>
                    <Prontuarios />
                  </AppLayout>
                </AuthGuard>
              } 
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;