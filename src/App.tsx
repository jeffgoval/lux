import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Clientes from "./pages/Clientes";
import ClienteDetalhes from "./pages/ClienteDetalhes";
import Servicos from "./pages/Servicos";
import Produtos from "./pages/Produtos";
import Equipamentos from "./pages/Equipamentos";
import Financeiro from "./pages/Financeiro";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/clientes/:id" element={<ClienteDetalhes />} />
          <Route path="/servicos" element={<Servicos />} />
          <Route path="/produtos" element={<Produtos />} />
          <Route path="/equipamentos" element={<Equipamentos />} />
          <Route path="/financeiro" element={<Financeiro />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
