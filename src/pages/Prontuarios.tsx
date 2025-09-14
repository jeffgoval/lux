import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  FileText, 
  Plus, 
  Search, 
  Shield, 
  Camera, 
  Calendar,
  AlertTriangle,
  Eye,
  Edit,
  Download
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Prontuario, SessaoAtendimento, MetricasProntuario, StatusProntuario } from "@/types/prontuario";
import { ProntuarioForm } from "@/components/ProntuarioForm";
import { ProntuarioDetalhes } from "@/components/ProntuarioDetalhes";
import { GaleriaImagens } from "@/components/GaleriaImagens";
import { AuditoriaTimeline } from "@/components/AuditoriaTimeline";

export default function Prontuarios() {
  const [prontuarios, setProntuarios] = useState<Prontuario[]>([]);
  const [metricas, setMetricas] = useState<MetricasProntuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<StatusProntuario | "todos">("todos");
  const [selectedProntuario, setSelectedProntuario] = useState<Prontuario | null>(null);
  const [showNovoProntuario, setShowNovoProntuario] = useState(false);
  const [activeTab, setActiveTab] = useState("lista");

  useEffect(() => {
    carregarProntuarios();
    carregarMetricas();
  }, []);

  const carregarProntuarios = async () => {
    try {
      setLoading(true);
      // Mock data para demonstração
      setProntuarios([]);
    } catch (error) {

      toast.error('Erro ao carregar prontuários');
    } finally {
      setLoading(false);
    }
  };

  const carregarMetricas = async () => {
    try {
      // Mock data para demonstração
      setMetricas({
        total_prontuarios: 0,
        prontuarios_ativos: 0,
        sessoes_ultimo_mes: 0,
        satisfacao_media: 0,
        procedimentos_mais_realizados: []
      });
    } catch (error) {

    }
  };

  const getStatusBadgeVariant = (status: StatusProntuario) => {
    switch (status) {
      case 'ativo':
        return 'default';
      case 'arquivado':
        return 'secondary';
      case 'transferido':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: StatusProntuario) => {
    switch (status) {
      case 'ativo':
        return 'Ativo';
      case 'arquivado':
        return 'Arquivado';
      case 'transferido':
        return 'Transferido';
      default:
        return status;
    }
  };

  const prontuariosFiltrados = prontuarios.filter(prontuario => {
    const matchesSearch = prontuario.numero_prontuario.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "todos" || prontuario.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prontuários Digitais</h1>
          <p className="text-muted-foreground">Sistema seguro de prontuários médicos</p>
        </div>
        <Dialog open={showNovoProntuario} onOpenChange={setShowNovoProntuario}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Prontuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo Prontuário Digital</DialogTitle>
              <DialogDescription>
                Crie um novo prontuário médico com segurança enterprise
              </DialogDescription>
            </DialogHeader>
            <ProntuarioForm 
              onSalvar={(prontuario) => {
                setProntuarios(prev => [prontuario, ...prev]);
                setShowNovoProntuario(false);
                toast.success('Prontuário criado com sucesso');
              }}
              onCancelar={() => setShowNovoProntuario(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Métricas */}
      {metricas && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Prontuários</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.total_prontuarios}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prontuários Ativos</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{metricas.prontuarios_ativos}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sessões (30 dias)</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.sessoes_ultimo_mes}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfação Média</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metricas.satisfacao_media}/10</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">Lista de Prontuários</TabsTrigger>
          <TabsTrigger value="galeria">Galeria de Imagens</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="lista">
          {/* Filtros */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por número do prontuário..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={selectedStatus === "todos" ? "default" : "outline"}
                    onClick={() => setSelectedStatus("todos")}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={selectedStatus === "ativo" ? "default" : "outline"}
                    onClick={() => setSelectedStatus("ativo")}
                  >
                    Ativos
                  </Button>
                  <Button
                    variant={selectedStatus === "arquivado" ? "default" : "outline"}
                    onClick={() => setSelectedStatus("arquivado")}
                  >
                    Arquivados
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de Prontuários */}
          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Carregando prontuários...</div>
              </div>
            ) : prontuariosFiltrados.length === 0 ? (
              <Card>
                <CardContent className="py-8">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum prontuário encontrado</h3>
                    <p className="text-muted-foreground">
                      {searchTerm || selectedStatus !== "todos" 
                        ? "Tente ajustar os filtros de busca"
                        : "Crie o primeiro prontuário digital"
                      }
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              prontuariosFiltrados.map((prontuario) => (
                <Card key={prontuario.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          Prontuário #{prontuario.numero_prontuario}
                        </CardTitle>
                        <CardDescription>
                          Atualizado em {new Date(prontuario.atualizado_em).toLocaleDateString('pt-BR')}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getStatusBadgeVariant(prontuario.status)}>
                          {getStatusLabel(prontuario.status)}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedProntuario(prontuario)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-muted-foreground">Cliente ID</div>
                        <div>{prontuario.cliente_id.substring(0, 8)}...</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Responsável</div>
                        <div>{prontuario.medico_responsavel_id.substring(0, 8)}...</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Versão</div>
                        <div>v{prontuario.versao}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Criado em</div>
                        <div>{new Date(prontuario.criado_em).toLocaleDateString('pt-BR')}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="galeria">
          <GaleriaImagens />
        </TabsContent>

        <TabsContent value="auditoria">
          <AuditoriaTimeline />
        </TabsContent>
      </Tabs>

      {/* Dialog de detalhes do prontuário */}
      {selectedProntuario && (
        <Dialog open={!!selectedProntuario} onOpenChange={() => setSelectedProntuario(null)}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Prontuário #{selectedProntuario.numero_prontuario}
              </DialogTitle>
              <DialogDescription>
                Visualização completa do prontuário médico
              </DialogDescription>
            </DialogHeader>
            <ProntuarioDetalhes prontuario={selectedProntuario} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
