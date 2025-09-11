import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Shield, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Search, 
  Download,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import type { AuditoriaMedica } from "@/types/prontuario";

export function AuditoriaTimeline() {
  const [auditorias, setAuditorias] = useState<AuditoriaMedica[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroOperacao, setFiltroOperacao] = useState<string>("todos");
  const [filtroCriticidade, setFiltroCriticidade] = useState<string>("todos");

  useEffect(() => {
    carregarAuditorias();
  }, []);

  const carregarAuditorias = async () => {
    try {
      setLoading(true);
      
      // Simular dados de auditoria
      const mockAuditorias: AuditoriaMedica[] = [
        {
          id: "audit-1",
          tabela_origem: "prontuarios",
          registro_id: "prontuario-123",
          operacao: "INSERT",
          dados_novos: { numero_prontuario: "PRN-001", cliente_id: "client-123" },
          usuario_id: "user-123",
          ip_origem: "192.168.1.100",
          user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
          justificativa: "Criação de novo prontuário médico",
          nivel_criticidade: "normal",
          executado_em: new Date().toISOString()
        },
        {
          id: "audit-2",
          tabela_origem: "imagens_medicas",
          registro_id: "img-456",
          operacao: "SELECT",
          usuario_id: "user-456",
          ip_origem: "192.168.1.200",
          user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)",
          justificativa: "Visualização de imagem para consulta",
          nivel_criticidade: "baixo",
          executado_em: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: "audit-3",
          tabela_origem: "sessoes_atendimento",
          registro_id: "sessao-789",
          operacao: "UPDATE",
          dados_anteriores: { satisfacao_paciente: 8 },
          dados_novos: { satisfacao_paciente: 9 },
          usuario_id: "user-789",
          ip_origem: "192.168.1.150",
          justificativa: "Correção da avaliação de satisfação",
          nivel_criticidade: "alto",
          executado_em: new Date(Date.now() - 7200000).toISOString()
        }
      ];

      setAuditorias(mockAuditorias);
    } catch (error) {
      console.error('Erro ao carregar auditoria:', error);
      toast.error('Erro ao carregar dados de auditoria');
    } finally {
      setLoading(false);
    }
  };

  const getOperacaoIcon = (operacao: string) => {
    switch (operacao) {
      case 'INSERT':
        return <Plus className="h-4 w-4" />;
      case 'UPDATE':
        return <Edit className="h-4 w-4" />;
      case 'DELETE':
        return <Trash2 className="h-4 w-4" />;
      case 'SELECT':
        return <Eye className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getOperacaoVariant = (operacao: string) => {
    switch (operacao) {
      case 'INSERT':
        return 'default';
      case 'UPDATE':
        return 'secondary';
      case 'DELETE':
        return 'destructive';
      case 'SELECT':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getCriticidadeIcon = (nivel: string) => {
    switch (nivel) {
      case 'alto':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'normal':
        return <CheckCircle className="h-4 w-4 text-yellow-500" />;
      case 'baixo':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const auditoriasFiltradas = auditorias.filter(auditoria => {
    const matchesSearch = auditoria.tabela_origem.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         auditoria.justificativa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         auditoria.usuario_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesOperacao = filtroOperacao === "todos" || auditoria.operacao === filtroOperacao;
    const matchesCriticidade = filtroCriticidade === "todos" || auditoria.nivel_criticidade === filtroCriticidade;
    return matchesSearch && matchesOperacao && matchesCriticidade;
  });

  const exportarAuditoria = () => {
    const dados = auditoriasFiltradas.map(audit => ({
      'Data/Hora': new Date(audit.executado_em).toLocaleString('pt-BR'),
      'Tabela': audit.tabela_origem,
      'Operação': audit.operacao,
      'Usuário': audit.usuario_id,
      'IP': audit.ip_origem,
      'Criticidade': audit.nivel_criticidade,
      'Justificativa': audit.justificativa || 'N/A'
    }));

    const csv = [
      Object.keys(dados[0]).join(','),
      ...dados.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Relatório de auditoria exportado');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Auditoria Médica</h2>
          <p className="text-muted-foreground">
            Timeline completa de todas as operações no sistema
          </p>
        </div>
        <Button onClick={exportarAuditoria}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Auditoria</CardTitle>
          <CardDescription>
            Filtre os registros de auditoria por critérios específicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por tabela, usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Select value={filtroOperacao} onValueChange={setFiltroOperacao}>
              <SelectTrigger>
                <SelectValue placeholder="Operação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as operações</SelectItem>
                <SelectItem value="INSERT">Criação (INSERT)</SelectItem>
                <SelectItem value="UPDATE">Atualização (UPDATE)</SelectItem>
                <SelectItem value="DELETE">Exclusão (DELETE)</SelectItem>
                <SelectItem value="SELECT">Visualização (SELECT)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filtroCriticidade} onValueChange={setFiltroCriticidade}>
              <SelectTrigger>
                <SelectValue placeholder="Criticidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as criticidades</SelectItem>
                <SelectItem value="alto">Alto</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="baixo">Baixo</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground flex items-center">
              Total: {auditoriasFiltradas.length} registros
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
        {loading ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Carregando auditoria...</div>
        </div>
      ) : auditoriasFiltradas.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Shield className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-medium mb-2">Nenhum registro encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm || filtroOperacao !== "todos" || filtroCriticidade !== "todos"
                  ? "Tente ajustar os filtros de busca"
                  : "Nenhuma atividade de auditoria registrada"
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {auditoriasFiltradas.map((auditoria, index) => (
            <Card key={auditoria.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Timeline indicator */}
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {getOperacaoIcon(auditoria.operacao)}
                    </div>
                    {index < auditoriasFiltradas.length - 1 && (
                      <div className="w-px h-12 bg-border mt-2"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getOperacaoVariant(auditoria.operacao)}>
                            {auditoria.operacao}
                          </Badge>
                          <span className="text-sm font-medium">
                            {auditoria.tabela_origem}
                          </span>
                          {getCriticidadeIcon(auditoria.nivel_criticidade)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {auditoria.justificativa || 'Operação realizada no sistema'}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(auditoria.executado_em).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="font-medium text-muted-foreground">Usuário</div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {auditoria.usuario_id}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">IP de Origem</div>
                        <div>{auditoria.ip_origem}</div>
                      </div>
                      <div>
                        <div className="font-medium text-muted-foreground">Registro ID</div>
                        <div className="font-mono text-xs">{auditoria.registro_id}</div>
                      </div>
                    </div>

                    {/* Dados modificados */}
                    {(auditoria.dados_anteriores || auditoria.dados_novos) && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <h4 className="font-medium mb-2 text-sm">Dados Modificados</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {auditoria.dados_anteriores && (
                            <div>
                              <div className="font-medium text-muted-foreground mb-1">Antes:</div>
                              <pre className="bg-background p-2 rounded overflow-x-auto">
                                {JSON.stringify(auditoria.dados_anteriores, null, 2)}
                              </pre>
                            </div>
                          )}
                          {auditoria.dados_novos && (
                            <div>
                              <div className="font-medium text-muted-foreground mb-1">Depois:</div>
                              <pre className="bg-background p-2 rounded overflow-x-auto">
                                {JSON.stringify(auditoria.dados_novos, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* User Agent (se disponível) */}
                    {auditoria.user_agent && (
                      <div className="text-xs text-muted-foreground">
                        <strong>Navegador:</strong> {auditoria.user_agent}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}