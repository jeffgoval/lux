/**
 * 🧪 DEMO DO SISTEMA DE NOTIFICAÇÕES
 * 
 * Componente para testar e demonstrar todas as funcionalidades do sistema de notificações
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/enhanced-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle, SuccessAlert, ErrorAlert, WarningAlert, InfoAlert, LoadingAlert } from '@/components/ui/alert';
import { InlineFeedback, StatusBadge, ActionFeedback, EmptyState, useFeedbackState } from '@/components/ui/feedback-system';
import { LoadingSpinner, SectionLoader } from '@/components/ui/loading-spinner';
import { LoadingOverlay, SectionLoadingOverlay } from '@/components/ui/loading-overlay';
import { useNotificationSystem, useFormNotifications, useCrudNotifications } from '@/hooks/useNotificationSystem';
import { CheckCircle, XCircle, AlertCircle, Info, Package, Plus } from 'lucide-react';

export const NotificationDemo: React.FC = () => {
  const notifications = useNotificationSystem();
  const formNotifications = useFormNotifications();
  const crudNotifications = useCrudNotifications();
  const feedback = useFeedbackState();
  
  const [loading, setLoading] = React.useState(false);
  const [sectionLoading, setSectionLoading] = React.useState(false);
  const [actionState, setActionState] = React.useState<{
    loading?: boolean;
    success?: string;
    error?: string;
  }>({});

  // Simular ação assíncrona
  const simulateAsyncAction = async (duration = 2000) => {
    await new Promise(resolve => setTimeout(resolve, duration));
    if (Math.random() > 0.7) {
      throw new Error('Erro simulado');
    }
  };

  const handleToastDemo = (type: 'success' | 'error' | 'warning' | 'info' | 'loading') => {
    const messages = {
      success: 'Operação realizada com sucesso!',
      error: 'Ocorreu um erro na operação',
      warning: 'Atenção: verifique os dados',
      info: 'Informação importante',
      loading: 'Processando dados...'
    };

    notifications[type](messages[type]);
  };

  const handleAsyncDemo = async () => {
    try {
      await notifications.executeAsync(
        () => simulateAsyncAction(),
        {
          loadingMessage: 'Executando operação...',
          successMessage: 'Operação concluída!',
          errorMessage: 'Falha na operação',
        }
      );
    } catch (error) {
      // Erro já tratado pelo executeAsync
    }
  };

  const handleFormDemo = async () => {
    const toastId = formNotifications.notifySubmitting('Salvando formulário...');
    
    try {
      await simulateAsyncAction();
      formNotifications.dismiss(toastId);
      formNotifications.notifySuccess('Formulário salvo!');
    } catch (error) {
      formNotifications.dismiss(toastId);
      formNotifications.notifyError('Erro ao salvar formulário');
    }
  };

  const handleCrudDemo = async (operation: 'create' | 'update' | 'delete') => {
    try {
      switch (operation) {
        case 'create':
          await crudNotifications.executeCreate(() => simulateAsyncAction(), 'Cliente');
          break;
        case 'update':
          await crudNotifications.executeUpdate(() => simulateAsyncAction(), 'Cliente');
          break;
        case 'delete':
          await crudNotifications.executeDelete(() => simulateAsyncAction(), 'Cliente');
          break;
      }
    } catch (error) {
      // Erro já tratado pelos métodos CRUD
    }
  };

  const handleActionFeedback = async () => {
    setActionState({ loading: true });
    
    try {
      await simulateAsyncAction();
      setActionState({ success: 'Ação executada com sucesso!' });
      setTimeout(() => setActionState({}), 3000);
    } catch (error) {
      setActionState({ error: 'Erro ao executar ação' });
      setTimeout(() => setActionState({}), 3000);
    }
  };

  const handleFeedbackState = (type: 'success' | 'error' | 'warning' | 'info' | 'loading') => {
    const messages = {
      success: 'Estado de sucesso ativo',
      error: 'Estado de erro ativo',
      warning: 'Estado de aviso ativo',
      info: 'Estado de informação ativo',
      loading: 'Estado de carregamento ativo'
    };

    feedback[`show${type.charAt(0).toUpperCase() + type.slice(1)}`](messages[type]);
    
    if (type !== 'loading') {
      setTimeout(() => feedback.clearFeedback(), 3000);
    }
  };

  return (
    <div className="space-y-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Sistema de Notificações</h1>
        <p className="text-muted-foreground">
          Demonstração completa do sistema unificado de notificações e feedback visual
        </p>
      </div>

      {/* Toast Notifications */}
      <Card>
        <CardHeader>
          <CardTitle>Toast Notifications</CardTitle>
          <CardDescription>
            Notificações temporárias que aparecem no canto da tela
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleToastDemo('success')} variant="default">
              Sucesso
            </Button>
            <Button onClick={() => handleToastDemo('error')} variant="destructive">
              Erro
            </Button>
            <Button onClick={() => handleToastDemo('warning')} variant="outline">
              Aviso
            </Button>
            <Button onClick={() => handleToastDemo('info')} variant="secondary">
              Info
            </Button>
            <Button onClick={() => handleToastDemo('loading')} variant="outline">
              Loading
            </Button>
            <Button onClick={() => notifications.dismiss()} variant="ghost">
              Limpar Todos
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Async Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Assíncronas</CardTitle>
          <CardDescription>
            Execução de ações com feedback automático
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleAsyncDemo}>
              Executar Ação Assíncrona
            </Button>
            <Button onClick={handleFormDemo}>
              Simular Formulário
            </Button>
            <Button onClick={() => handleCrudDemo('create')}>
              Criar Item
            </Button>
            <Button onClick={() => handleCrudDemo('update')}>
              Atualizar Item
            </Button>
            <Button onClick={() => handleCrudDemo('delete')} variant="destructive">
              Excluir Item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alert Components */}
      <Card>
        <CardHeader>
          <CardTitle>Componentes de Alerta</CardTitle>
          <CardDescription>
            Alertas contextuais para diferentes situações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SuccessAlert>
            <AlertTitle>Sucesso!</AlertTitle>
            <AlertDescription>
              Operação realizada com sucesso.
            </AlertDescription>
          </SuccessAlert>

          <ErrorAlert dismissible onDismiss={() => console.log('Error dismissed')}>
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>
              Ocorreu um erro durante a operação. Clique no X para dispensar.
            </AlertDescription>
          </ErrorAlert>

          <WarningAlert>
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              Verifique os dados antes de continuar.
            </AlertDescription>
          </WarningAlert>

          <InfoAlert>
            <AlertTitle>Informação</AlertTitle>
            <AlertDescription>
              Esta é uma informação importante para o usuário.
            </AlertDescription>
          </InfoAlert>

          <LoadingAlert>
            <AlertTitle>Carregando</AlertTitle>
            <AlertDescription>
              Processando dados, aguarde...
            </AlertDescription>
          </LoadingAlert>
        </CardContent>
      </Card>

      {/* Feedback Components */}
      <Card>
        <CardHeader>
          <CardTitle>Componentes de Feedback</CardTitle>
          <CardDescription>
            Feedback visual inline e badges de status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Feedback Inline</h4>
            <div className="space-y-2">
              <InlineFeedback type="success" message="Dados salvos com sucesso" />
              <InlineFeedback type="error" message="Erro de validação" />
              <InlineFeedback type="warning" message="Campos obrigatórios" />
              <InlineFeedback type="info" message="Informação adicional" />
              <InlineFeedback type="loading" message="Carregando dados..." />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Status Badges</h4>
            <div className="flex flex-wrap gap-2">
              <StatusBadge type="success" message="Ativo" />
              <StatusBadge type="error" message="Erro" />
              <StatusBadge type="warning" message="Pendente" />
              <StatusBadge type="info" message="Info" />
              <StatusBadge type="loading" message="Processando" />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Feedback de Ação</h4>
            <div className="space-y-2">
              <Button onClick={handleActionFeedback}>
                Executar Ação com Feedback
              </Button>
              <ActionFeedback {...actionState} />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Estados de Feedback</h4>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button onClick={() => handleFeedbackState('success')} size="sm">
                Sucesso
              </Button>
              <Button onClick={() => handleFeedbackState('error')} size="sm">
                Erro
              </Button>
              <Button onClick={() => handleFeedbackState('warning')} size="sm">
                Aviso
              </Button>
              <Button onClick={() => handleFeedbackState('info')} size="sm">
                Info
              </Button>
              <Button onClick={() => handleFeedbackState('loading')} size="sm">
                Loading
              </Button>
              <Button onClick={feedback.clearFeedback} size="sm" variant="ghost">
                Limpar
              </Button>
            </div>
            {feedback.feedback.type && (
              <InlineFeedback 
                type={feedback.feedback.type} 
                message={feedback.feedback.message} 
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Loading Components */}
      <Card>
        <CardHeader>
          <CardTitle>Componentes de Loading</CardTitle>
          <CardDescription>
            Indicadores de carregamento e overlays
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Loading Spinners</h4>
            <div className="flex items-center gap-4">
              <LoadingSpinner size="xs" />
              <LoadingSpinner size="sm" />
              <LoadingSpinner size="md" />
              <LoadingSpinner size="lg" />
              <LoadingSpinner size="xl" />
            </div>
            <div className="flex items-center gap-4">
              <LoadingSpinner variant="dots" />
              <LoadingSpinner variant="pulse" />
              <LoadingSpinner variant="bars" />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Loading com Texto</h4>
            <LoadingSpinner size="lg" text="Carregando dados..." />
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Botões com Loading</h4>
            <div className="flex gap-2">
              <LoadingButton 
                loading={loading} 
                loadingText="Salvando..."
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => setLoading(false), 3000);
                }}
              >
                Salvar
              </LoadingButton>
              <Button onClick={() => setLoading(!loading)}>
                Toggle Loading
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Section Loading</h4>
            <div className="flex gap-2 mb-2">
              <Button onClick={() => setSectionLoading(!sectionLoading)}>
                Toggle Section Loading
              </Button>
            </div>
            <SectionLoadingOverlay isLoading={sectionLoading} text="Carregando seção...">
              <div className="p-6 border rounded-lg">
                <h5 className="font-medium mb-2">Conteúdo da Seção</h5>
                <p className="text-muted-foreground">
                  Este conteúdo fica com overlay quando está carregando.
                </p>
              </div>
            </SectionLoadingOverlay>
          </div>
        </CardContent>
      </Card>

      {/* Empty State */}
      <Card>
        <CardHeader>
          <CardTitle>Estado Vazio</CardTitle>
          <CardDescription>
            Componente para quando não há dados para exibir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Nenhum item encontrado"
            description="Não há itens para exibir no momento. Clique no botão abaixo para adicionar o primeiro item."
            icon={<Package className="h-16 w-16" />}
            action={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Item
              </Button>
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};