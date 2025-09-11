import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  FileText, 
  Calendar,
  Camera,
  Shield,
  User,
  Clock,
  Lock,
  History
} from "lucide-react";
import type { Prontuario, SessaoAtendimento } from "@/types/prontuario";

interface ProntuarioDetalhesProps {
  prontuario: Prontuario;
}

export function ProntuarioDetalhes({ prontuario }: ProntuarioDetalhesProps) {
  const [sessoes, setSessoes] = useState<SessaoAtendimento[]>([]);
  const [activeTab, setActiveTab] = useState("dados");

  useEffect(() => {
    // Simular carregamento de sessões
    setSessoes([]);
  }, [prontuario.id]);

  const getStatusBadgeVariant = (status: string) => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prontuário #{prontuario.numero_prontuario}</h2>
          <p className="text-muted-foreground">
            Criado em {new Date(prontuario.criado_em).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <Badge variant={getStatusBadgeVariant(prontuario.status)}>
          {prontuario.status.charAt(0).toUpperCase() + prontuario.status.slice(1)}
        </Badge>
      </div>

      {/* Informações básicas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Informações de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground">Hash de Integridade</div>
              <div className="font-mono text-xs">{prontuario.hash_integridade}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Versão</div>
              <div>v{prontuario.versao}</div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Última Atualização</div>
              <div>{new Date(prontuario.atualizado_em).toLocaleString('pt-BR')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dados">Dados Médicos</TabsTrigger>
          <TabsTrigger value="sessoes">Sessões</TabsTrigger>
          <TabsTrigger value="imagens">Imagens</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Anamnese
                </CardTitle>
              </CardHeader>
              <CardContent>
                {prontuario.anamnese_criptografada ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Dados criptografados
                    </div>
                    <p className="text-sm bg-muted p-3 rounded">
                      {prontuario.anamnese_criptografada}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhuma anamnese registrada</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Histórico Médico
                </CardTitle>
              </CardHeader>
              <CardContent>
                {prontuario.historico_medico_criptografado ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Dados criptografados
                    </div>
                    <p className="text-sm bg-muted p-3 rounded">
                      {prontuario.historico_medico_criptografado}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum histórico médico registrado</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Medicamentos Atuais</CardTitle>
              </CardHeader>
              <CardContent>
                {prontuario.medicamentos_atuais_criptografado ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      Dados criptografados
                    </div>
                    <p className="text-sm bg-muted p-3 rounded">
                      {prontuario.medicamentos_atuais_criptografado}
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhum medicamento registrado</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alergias e Contraindicações</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Alergias</h4>
                  {prontuario.alergias_criptografado ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        Dados criptografados
                      </div>
                      <p className="text-sm bg-muted p-3 rounded">
                        {prontuario.alergias_criptografado}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhuma alergia registrada</p>
                  )}
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Contraindicações</h4>
                  {prontuario.contraindicacoes_criptografado ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Lock className="h-3 w-3" />
                        Dados criptografados
                      </div>
                      <p className="text-sm bg-muted p-3 rounded">
                        {prontuario.contraindicacoes_criptografado}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Nenhuma contraindicação registrada</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sessoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Sessões de Atendimento
              </CardTitle>
              <CardDescription>
                Histórico de procedimentos realizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessoes.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma sessão registrada</h3>
                  <p className="text-muted-foreground">
                    As sessões de atendimento aparecerão aqui quando forem realizadas
                  </p>
                  <Button className="mt-4">
                    <Calendar className="h-4 w-4 mr-2" />
                    Nova Sessão
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessoes.map((sessao) => (
                    <Card key={sessao.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{sessao.tipo_procedimento}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(sessao.data_atendimento).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Badge>Concluída</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imagens" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Galeria de Imagens Médicas
              </CardTitle>
              <CardDescription>
                Fotos antes/durante/depois dos procedimentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Nenhuma imagem disponível</h3>
                <p className="text-muted-foreground">
                  As imagens dos procedimentos aparecerão aqui
                </p>
                <Button className="mt-4">
                  <Camera className="h-4 w-4 mr-2" />
                  Adicionar Imagem
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico de Modificações
              </CardTitle>
              <CardDescription>
                Auditoria completa das alterações no prontuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Prontuário criado</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(prontuario.criado_em).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Prontuário médico criado por {prontuario.criado_por}
                    </p>
                  </div>
                </div>

                {prontuario.versao > 1 && (
                  <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Prontuário atualizado</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(prontuario.atualizado_em).toLocaleString('pt-BR')}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Atualizado por {prontuario.atualizado_por} - Versão {prontuario.versao}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}