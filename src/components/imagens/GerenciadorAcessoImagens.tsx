/**
 * Image Access Manager Component
 * Provides UI for managing image access permissions and visibility
 * Requirements: 6.3, 9.2
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Eye, 
  EyeOff, 
  Download, 
  Share2, 
  Shield, 
  Clock, 
  User, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Settings,
  History
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { imagemAcessoService, PermissaoAcessoImagem, ConfiguracaoVisibilidade, LogAcessoDetalhado } from '@/services/imagem-acesso.service';
import { ImagemMedica } from '@/types/imagem-medica';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GerenciadorAcessoImagensProps {
  imagem: ImagemMedica;
  onPermissoesAtualizadas?: () => void;
}

export const GerenciadorAcessoImagens: React.FC<GerenciadorAcessoImagensProps> = ({
  imagem,
  onPermissoesAtualizadas
}) => {
  const { toast } = useToast();
  
  // Estado
  const [permissoes, setPermissoes] = useState<PermissaoAcessoImagem | null>(null);
  const [configuracao, setConfiguracao] = useState<ConfiguracaoVisibilidade>({
    visivel_paciente: imagem.visivel_paciente,
    visivel_outros_profissionais: imagem.visivel_outros_profissionais,
    requer_aprovacao_admin: true,
    permite_download_paciente: false,
    watermark_obrigatorio: imagem.watermark_aplicado
  });
  const [logs, setLogs] = useState<LogAcessoDetalhado[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [urlTemporaria, setUrlTemporaria] = useState<string | null>(null);
  const [motivoRevogacao, setMotivoRevogacao] = useState('');

  // Carregar permissões ao montar
  useEffect(() => {
    carregarPermissoes();
  }, [imagem.id]);

  /**
   * Carrega permissões do usuário atual
   */
  const carregarPermissoes = async () => {
    try {
      const perms = await imagemAcessoService.verificarPermissoes(imagem.id);
      setPermissoes(perms);
    } catch (error) {
      console.error('Erro ao carregar permissões:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar permissões de acesso',
        variant: 'destructive'
      });
    }
  };

  /**
   * Carrega logs de acesso
   */
  const carregarLogs = async () => {
    setLoadingLogs(true);
    try {
      const logsData = await imagemAcessoService.listarLogsAcesso({
        imagem_id: imagem.id,
        limite: 50
      });
      setLogs(logsData);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar histórico de acessos',
        variant: 'destructive'
      });
    } finally {
      setLoadingLogs(false);
    }
  };

  /**
   * Atualiza configurações de visibilidade
   */
  const atualizarVisibilidade = async () => {
    if (!permissoes?.pode_aprovar) {
      toast({
        title: 'Acesso Negado',
        description: 'Você não tem permissão para alterar configurações de visibilidade',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const resultado = await imagemAcessoService.configurarVisibilidade(
        imagem.id,
        configuracao
      );

      if (resultado.success) {
        toast({
          title: 'Sucesso',
          description: 'Configurações de visibilidade atualizadas'
        });
        onPermissoesAtualizadas?.();
      } else {
        toast({
          title: 'Erro',
          description: resultado.error || 'Erro ao atualizar configurações',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro interno ao atualizar configurações',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Gera URL de acesso temporário
   */
  const gerarUrlTemporaria = async (permitirDownload: boolean = false) => {
    setLoading(true);
    try {
      const resultado = await imagemAcessoService.gerarUrlAcessoTemporario(
        imagem.id,
        3600, // 1 hora
        permitirDownload
      );

      if (resultado.url) {
        setUrlTemporaria(resultado.url);
        toast({
          title: 'URL Gerada',
          description: 'URL de acesso temporário criada (válida por 1 hora)'
        });
      } else {
        toast({
          title: 'Erro',
          description: resultado.error || 'Erro ao gerar URL',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro interno ao gerar URL',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Revoga acesso à imagem
   */
  const revogarAcesso = async () => {
    if (!motivoRevogacao.trim()) {
      toast({
        title: 'Motivo Obrigatório',
        description: 'Informe o motivo da revogação de acesso',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const resultado = await imagemAcessoService.revogarAcesso(
        imagem.id,
        motivoRevogacao
      );

      if (resultado.success) {
        toast({
          title: 'Acesso Revogado',
          description: 'Acesso à imagem foi revogado com sucesso'
        });
        setMotivoRevogacao('');
        onPermissoesAtualizadas?.();
      } else {
        toast({
          title: 'Erro',
          description: resultado.error || 'Erro ao revogar acesso',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro interno ao revogar acesso',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Renderiza status de permissão
   */
  const renderStatusPermissao = (permitido: boolean, label: string) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm">{label}</span>
      {permitido ? (
        <Badge variant="default" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Permitido
        </Badge>
      ) : (
        <Badge variant="secondary" className="bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Negado
        </Badge>
      )}
    </div>
  );

  /**
   * Renderiza log de acesso
   */
  const renderLogAcesso = (log: LogAcessoDetalhado) => (
    <div key={log.id} className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <User className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium">{log.acao}</span>
        </div>
        <span className="text-xs text-gray-500">
          {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </span>
      </div>
      
      {log.contexto_adicional && Object.keys(log.contexto_adicional).length > 0 && (
        <div className="text-xs text-gray-600">
          <strong>Contexto:</strong> {JSON.stringify(log.contexto_adicional, null, 2)}
        </div>
      )}
      
      <div className="text-xs text-gray-500">
        IP: {log.ip_address} | User-Agent: {log.user_agent?.substring(0, 50)}...
      </div>
    </div>
  );

  if (!permissoes) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="w-5 h-5" />
          <span>Controle de Acesso</span>
        </CardTitle>
        <CardDescription>
          Gerencie permissões e visibilidade da imagem médica
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="permissoes" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="permissoes">Permissões</TabsTrigger>
            <TabsTrigger value="visibilidade">Visibilidade</TabsTrigger>
            <TabsTrigger value="acesso">Acesso</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          {/* Aba de Permissões */}
          <TabsContent value="permissoes" className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Suas Permissões</h4>
              
              {!permissoes.pode_visualizar && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {permissoes.motivo_negacao || 'Acesso negado a esta imagem'}
                  </AlertDescription>
                </Alert>
              )}

              {permissoes.pode_visualizar && (
                <div className="space-y-1">
                  {renderStatusPermissao(permissoes.pode_visualizar, 'Visualizar')}
                  {renderStatusPermissao(permissoes.pode_baixar, 'Baixar')}
                  {renderStatusPermissao(permissoes.pode_compartilhar, 'Compartilhar')}
                  {renderStatusPermissao(permissoes.pode_editar_metadados, 'Editar Metadados')}
                  {renderStatusPermissao(permissoes.pode_aprovar, 'Aprovar/Configurar')}
                  {renderStatusPermissao(permissoes.pode_revogar_consentimento, 'Gerenciar Consentimento')}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Status da Imagem</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Consentimento:</span>
                  <Badge variant={imagem.consentimento_obtido ? "default" : "secondary"} className="ml-2">
                    {imagem.consentimento_obtido ? 'Obtido' : 'Pendente'}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600">Watermark:</span>
                  <Badge variant={imagem.watermark_aplicado ? "default" : "secondary"} className="ml-2">
                    {imagem.watermark_aplicado ? 'Aplicado' : 'Pendente'}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600">Visível Paciente:</span>
                  <Badge variant={imagem.visivel_paciente ? "default" : "secondary"} className="ml-2">
                    {imagem.visivel_paciente ? 'Sim' : 'Não'}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-600">Processamento:</span>
                  <Badge variant="outline" className="ml-2">
                    {imagem.status_processamento}
                  </Badge>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Aba de Visibilidade */}
          <TabsContent value="visibilidade" className="space-y-4">
            {permissoes.pode_aprovar ? (
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="visivel-paciente">Visível para o Paciente</Label>
                    <Switch
                      id="visivel-paciente"
                      checked={configuracao.visivel_paciente}
                      onCheckedChange={(checked) => 
                        setConfiguracao(prev => ({ ...prev, visivel_paciente: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="visivel-profissionais">Visível para Outros Profissionais</Label>
                    <Switch
                      id="visivel-profissionais"
                      checked={configuracao.visivel_outros_profissionais}
                      onCheckedChange={(checked) => 
                        setConfiguracao(prev => ({ ...prev, visivel_outros_profissionais: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="download-paciente">Permitir Download pelo Paciente</Label>
                    <Switch
                      id="download-paciente"
                      checked={configuracao.permite_download_paciente}
                      onCheckedChange={(checked) => 
                        setConfiguracao(prev => ({ ...prev, permite_download_paciente: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="watermark-obrigatorio">Watermark Obrigatório</Label>
                    <Switch
                      id="watermark-obrigatorio"
                      checked={configuracao.watermark_obrigatorio}
                      onCheckedChange={(checked) => 
                        setConfiguracao(prev => ({ ...prev, watermark_obrigatorio: checked }))
                      }
                    />
                  </div>
                </div>

                <Button 
                  onClick={atualizarVisibilidade} 
                  disabled={loading}
                  className="w-full"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {loading ? 'Atualizando...' : 'Atualizar Configurações'}
                </Button>

                <Separator />

                <div className="space-y-3">
                  <Label htmlFor="motivo-revogacao">Revogar Acesso</Label>
                  <Textarea
                    id="motivo-revogacao"
                    placeholder="Motivo da revogação de acesso..."
                    value={motivoRevogacao}
                    onChange={(e) => setMotivoRevogacao(e.target.value)}
                  />
                  <Button 
                    onClick={revogarAcesso}
                    disabled={loading || !motivoRevogacao.trim()}
                    variant="destructive"
                    className="w-full"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Revogar Acesso
                  </Button>
                </div>
              </div>
            ) : (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Você não tem permissão para alterar configurações de visibilidade desta imagem.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          {/* Aba de Acesso */}
          <TabsContent value="acesso" className="space-y-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Gerar URL de Acesso Temporário</h4>
              
              <div className="flex space-x-2">
                <Button
                  onClick={() => gerarUrlTemporaria(false)}
                  disabled={loading || !permissoes.pode_visualizar}
                  variant="outline"
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Visualização
                </Button>
                
                <Button
                  onClick={() => gerarUrlTemporaria(true)}
                  disabled={loading || !permissoes.pode_baixar}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              {urlTemporaria && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">URL Temporária:</span>
                    <Badge variant="outline">
                      <Clock className="w-3 h-3 mr-1" />
                      1h
                    </Badge>
                  </div>
                  <div className="text-xs font-mono bg-white p-2 rounded border break-all">
                    {urlTemporaria}
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(urlTemporaria);
                      toast({ title: 'Copiado!', description: 'URL copiada para a área de transferência' });
                    }}
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Copiar URL
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Aba de Histórico */}
          <TabsContent value="historico" className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Histórico de Acessos</h4>
              <Button
                onClick={carregarLogs}
                disabled={loadingLogs}
                variant="outline"
                size="sm"
              >
                <History className="w-4 h-4 mr-2" />
                {loadingLogs ? 'Carregando...' : 'Atualizar'}
              </Button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum acesso registrado</p>
                </div>
              ) : (
                logs.map(renderLogAcesso)
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default GerenciadorAcessoImagens;