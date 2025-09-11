import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  User, 
  Building2, 
  Users, 
  Star, 
  Clock, 
  CheckCircle, 
  ArrowLeft, 
  ArrowRight,
  Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingData {
  // Dados pessoais
  nomeCompleto: string;
  telefone: string;
  especialidade: string;
  
  // Multiple clinics question
  temMultiplasClinicas: boolean;
  
  // Rede de clínicas (only if multiple clinics)
  nomeRede: string;
  cnpjRede: string;
  
  // Dados da clínica
  nomeClinica: string;
  cnpj: string;
  enderecoRua: string;
  enderecoNumero: string;
  enderecoComplemento: string;
  enderecoBairro: string;
  enderecoCidade: string;
  enderecoEstado: string;
  enderecoCep: string;
  telefoneClinica: string;
  emailClinica: string;
  
  // Primeiro profissional
  souEuMesma: boolean;
  nomeProfissional: string;
  emailProfissional: string;
  especialidadeProfissional: string;
  
  // Primeiro serviço
  nomeServico: string;
  duracaoServico: number;
  precoServico: string;
  descricaoServico: string;
  
  // Configurações básicas
  horarioInicio: string;
  horarioFim: string;
}

const STEPS = [
  { id: 1, title: 'Dados Pessoais', icon: User },
  { id: 2, title: 'Sua Clínica', icon: Building2 },
  { id: 3, title: 'Primeiro Profissional', icon: Users },
  { id: 4, title: 'Primeiro Serviço', icon: Star },
  { id: 5, title: 'Configurações', icon: Clock },
];

export function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sessionValid, setSessionValid] = useState(true);
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  
  const [data, setData] = useState<OnboardingData>({
    nomeCompleto: '',
    telefone: '',
    especialidade: '',
    temMultiplasClinicas: false,
    nomeRede: '',
    cnpjRede: '',
    nomeClinica: '',
    cnpj: '',
    enderecoRua: '',
    enderecoNumero: '',
    enderecoComplemento: '',
    enderecoBairro: '',
    enderecoCidade: '',
    enderecoEstado: '',
    enderecoCep: '',
    telefoneClinica: '',
    emailClinica: '',
    souEuMesma: false,
    nomeProfissional: '',
    emailProfissional: '',
    especialidadeProfissional: '',
    nomeServico: '',
    duracaoServico: 60,
    precoServico: '',
    descricaoServico: '',
    horarioInicio: '08:00',
    horarioFim: '18:00',
  });

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  // Function to validate session
  const validateSession = async (): Promise<boolean> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        console.error('Session validation failed:', error);
        setSessionValid(false);
        return false;
      }
      
      setSessionValid(true);
      return true;
    } catch (error) {
      console.error('Error validating session:', error);
      setSessionValid(false);
      return false;
    }
  };

  // Validate session on component mount and periodically
  useEffect(() => {
    validateSession();
    
    // Check session every 30 seconds during onboarding
    const interval = setInterval(validateSession, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Redirect to login if session becomes invalid
  useEffect(() => {
    if (!sessionValid) {
      toast.error('Sessão expirada', {
        description: 'Sua sessão expirou. Você será redirecionado para fazer login.'
      });
      
      setTimeout(() => {
        navigate('/auth', { 
          state: { from: '/onboarding' },
          replace: true 
        });
      }, 2000);
    }
  }, [sessionValid, navigate]);

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return !!(data.nomeCompleto && data.telefone && data.especialidade);
      case 2:
        const baseValidation = !!(data.nomeClinica && data.enderecoCidade && data.enderecoEstado);
        if (data.temMultiplasClinicas) {
          return baseValidation && !!data.nomeRede;
        }
        return baseValidation;
      case 3:
        return data.souEuMesma || !!(data.nomeProfissional && data.especialidadeProfissional);
      case 4:
        return !!(data.nomeServico && data.duracaoServico > 0 && data.precoServico);
      case 5:
        return !!(data.horarioInicio && data.horarioFim);
      default:
        return false;
    }
  };

  const finishOnboarding = async () => {
    if (!user || !validateCurrentStep() || loading) return;

    setLoading(true);
    
    // Verify session is still valid before starting
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      setLoading(false);
      toast.error('Sessão expirada', {
        description: 'Por favor, faça login novamente para continuar.'
      });
      navigate('/auth');
      return;
    }

    try {
      // 1. Atualizar profile usando a função do banco
      const { data: profileResult, error: profileError } = await supabase
        .rpc('update_user_profile', {
          p_user_id: user.id,
          p_nome_completo: data.nomeCompleto,
          p_telefone: data.telefone
        });

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw new Error(`Erro ao atualizar perfil: ${profileError.message}`);
      }

      if (profileResult?.error) {
        throw new Error(`Erro ao atualizar perfil: ${profileResult.error}`);
      }

      // 2. Criar organização (apenas se múltiplas clínicas)
      let orgData = null;
      if (data.temMultiplasClinicas) {
        try {
          const { data: organizacao, error: orgError } = await supabase
            .from('organizacoes')
            .insert({
              nome: data.nomeRede,
              cnpj: data.cnpjRede || null,
              proprietaria_id: user.id
            })
            .select()
            .single();

          if (orgError) {
            console.error('Organization creation error:', orgError);
            if (orgError.code === '23505') {
              throw new Error('Uma organização com este nome já existe.');
            } else if (orgError.code === '42501') {
              throw new Error('Erro de permissão ao criar organização. Tente fazer logout e login novamente.');
            }
            throw new Error(`Erro ao criar organização: ${orgError.message}`);
          }
          orgData = organizacao;
        } catch (error) {
          console.warn('Failed to create organization, proceeding with independent clinic:', error);
          // Continue without organization - create independent clinic
        }
      }

      // TEMPORARY: Skip organization creation for now to test basic clinic creation
      // TODO: Re-enable organization support once basic clinic creation works
      orgData = null;

      // 3. Criar clínica - versão simplificada
      const horarioFuncionamento = {
        segunda: { inicio: data.horarioInicio, fim: data.horarioFim, ativo: true },
        terca: { inicio: data.horarioInicio, fim: data.horarioFim, ativo: true },
        quarta: { inicio: data.horarioInicio, fim: data.horarioFim, ativo: true },
        quinta: { inicio: data.horarioInicio, fim: data.horarioFim, ativo: true },
        sexta: { inicio: data.horarioInicio, fim: data.horarioFim, ativo: true },
        sabado: { inicio: data.horarioInicio, fim: data.horarioFim, ativo: false },
        domingo: { inicio: data.horarioInicio, fim: data.horarioFim, ativo: false }
      };

      // Prepare clinic payload - minimal fields only
      const clinicaPayload: any = {
        nome: data.nomeClinica,
        cnpj: data.cnpj || null,
        endereco_rua: data.enderecoRua || null,
        endereco_numero: data.enderecoNumero || null,
        endereco_complemento: data.enderecoComplemento || null,
        endereco_bairro: data.enderecoBairro || null,
        endereco_cidade: data.enderecoCidade || null,
        endereco_estado: data.enderecoEstado || null,
        endereco_cep: data.enderecoCep || null,
        telefone: data.telefoneClinica || null,
        email: data.emailClinica || null,
        horario_funcionamento: horarioFuncionamento
      };

      // Only add organizacao_id if we have organization data
      if (orgData?.id) {
        clinicaPayload.organizacao_id = orgData.id;
      }

      console.log('Attempting to create clinic with payload:', clinicaPayload);
      
      // Use RPC function to bypass RLS for clinic creation
      const { data: clinicaId, error: clinicaError } = await supabase
        .rpc('create_clinic_for_onboarding', {
          p_nome: clinicaPayload.nome,
          p_cnpj: clinicaPayload.cnpj,
          p_endereco_rua: clinicaPayload.endereco_rua,
          p_endereco_numero: clinicaPayload.endereco_numero,
          p_endereco_complemento: clinicaPayload.endereco_complemento,
          p_endereco_bairro: clinicaPayload.endereco_bairro,
          p_endereco_cidade: clinicaPayload.endereco_cidade,
          p_endereco_estado: clinicaPayload.endereco_estado,
          p_endereco_cep: clinicaPayload.endereco_cep,
          p_telefone: clinicaPayload.telefone,
          p_email: clinicaPayload.email,
          p_horario_funcionamento: clinicaPayload.horario_funcionamento
        });

      if (clinicaError) {
        console.error('Clinic creation error:', clinicaError);
        console.error('Full error details:', JSON.stringify(clinicaError, null, 2));
        if (clinicaError.code === '23505') {
          throw new Error('Uma clínica com este nome já existe.');
        } else if (clinicaError.code === '42501') {
          throw new Error('Erro de permissão ao criar clínica. Verifique se você tem as permissões necessárias.');
        }
        throw new Error(`Erro ao criar clínica: ${clinicaError.message}`);
      }

      // 3.1. Atualizar user_roles com clinica_id imediatamente após criar a clínica
      console.log('Updating user role with clinic_id:', clinicaId);
      const { error: updateRoleError } = await supabase
        .from('user_roles')
        .update({
          clinica_id: clinicaId
        })
        .eq('user_id', user.id)
        .eq('role', 'proprietaria');

      if (updateRoleError) {
        console.error('Role update error:', updateRoleError);
        console.error('Full role update error:', JSON.stringify(updateRoleError, null, 2));
        if (updateRoleError.code === '42501') {
          throw new Error('Erro de permissão ao atualizar role. Tente fazer logout e login novamente.');
        }
        throw new Error(`Erro ao atualizar role: ${updateRoleError.message}`);
      }
      console.log('User role updated successfully');

      // 4. Criar profissional
      console.log('Creating professional...');
      const profissionalData = data.souEuMesma ? {
        nome: data.nomeCompleto,
        email: user.email,
        especialidade: data.especialidade,
        user_id: user.id
      } : {
        nome: data.nomeProfissional,
        email: data.emailProfissional || null,
        especialidade: data.especialidadeProfissional,
        user_id: null
      };

      const { error: profissionalError } = await supabase
        .from('profissionais')
        .insert({
          ...profissionalData,
          clinica_id: clinicaId
        });

      if (profissionalError) {
        console.error('Professional creation error:', profissionalError);
        console.error('Full professional error:', JSON.stringify(profissionalError, null, 2));
        if (profissionalError.code === '23505') {
          throw new Error('Este profissional já está cadastrado.');
        } else if (profissionalError.code === '42501') {
          throw new Error('Erro de permissão ao criar profissional.');
        }
        throw new Error(`Erro ao criar profissional: ${profissionalError.message}`);
      }
      console.log('Professional created successfully');

      // 5. Criar serviço
      console.log('Creating service...');
      const precoNumerico = parseFloat(data.precoServico.replace(/[^\d,]/g, '').replace(',', '.'));
      
      const { error: servicoError } = await supabase
        .from('servicos')
        .insert({
          nome: data.nomeServico,
          descricao: data.descricaoServico || null,
          duracao_minutos: data.duracaoServico,
          preco: precoNumerico || null,
          clinica_id: clinicaId
        });

      if (servicoError) {
        console.error('Service creation error:', servicoError);
        console.error('Full service error:', JSON.stringify(servicoError, null, 2));
        if (servicoError.code === '23505') {
          throw new Error('Um serviço com este nome já existe.');
        } else if (servicoError.code === '42501') {
          throw new Error('Erro de permissão ao criar serviço.');
        }
        throw new Error(`Erro ao criar serviço: ${servicoError.message}`);
      }
      console.log('Service created successfully');

      // 6. Marcar onboarding como completo
      console.log('Completing onboarding...');
      const { error: completeOnboardingError } = await supabase
        .from('profiles')
        .update({ primeiro_acesso: false })
        .eq('user_id', user.id);

      if (completeOnboardingError) {
        console.error('Error completing onboarding:', completeOnboardingError);
        console.error('Full onboarding completion error:', JSON.stringify(completeOnboardingError, null, 2));
        // Don't throw here, as the main setup is complete
        toast.warning('Configuração salva', {
          description: 'Dados salvos com sucesso, mas houve um problema ao finalizar. Você pode continuar usando o sistema.'
        });
      } else {
        console.log('Onboarding marked as complete');
        toast.success('Configuração inicial concluída com sucesso!');
      }
      
      // Atualizar o profile context
      console.log('Refreshing profile...');
      await refreshProfile();
      console.log('Profile refreshed');
      
      // Final session validation before redirect
      console.log('Validating final session...');
      const finalSessionCheck = await validateSession();
      console.log('Final session check result:', finalSessionCheck);
      
      if (finalSessionCheck) {
        console.log('Redirecting to dashboard...');
        navigate('/');
      } else {
        console.log('Session invalid, redirecting to auth...');
        toast.error('Sessão perdida', {
          description: 'Configuração salva, mas você precisa fazer login novamente.'
        });
        navigate('/auth');
      }
    } catch (error: any) {
      console.error('Erro no onboarding:', error);
      
      let errorMessage = 'Erro ao finalizar configuração';
      let errorDescription = 'Tente novamente.';
      let shouldRetry = true;
      
      // Handle specific error types
      if (error.message?.includes('Sessão expirada')) {
        errorMessage = 'Sessão expirada';
        errorDescription = 'Sua sessão expirou. Você será redirecionado para fazer login novamente.';
        shouldRetry = false;
      } else if (error.code === '23505' || error.message?.includes('já existe')) {
        errorMessage = 'Dados duplicados';
        errorDescription = error.message || 'Alguns dados já existem no sistema.';
      } else if (error.code === '42501' || error.message?.includes('permissão') || error.message?.includes('insufficient_privilege')) {
        errorMessage = 'Erro de permissão';
        errorDescription = 'Problema com permissões. Tente fazer logout e login novamente.';
        shouldRetry = false;
      } else if (error.code === 'PGRST301' || error.message?.includes('JWT')) {
        errorMessage = 'Sessão inválida';
        errorDescription = 'Sua sessão não é mais válida. Faça login novamente.';
        shouldRetry = false;
      } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        errorMessage = 'Erro de conexão';
        errorDescription = 'Problema de conexão. Verifique sua internet e tente novamente.';
      } else if (error.message) {
        errorDescription = error.message;
      }
      
      toast.error(errorMessage, {
        description: errorDescription,
        action: shouldRetry ? {
          label: 'Tentar novamente',
          onClick: () => finishOnboarding()
        } : undefined
      });

      // If session is invalid, redirect to login
      if (!shouldRetry && (error.message?.includes('Sessão') || error.message?.includes('JWT'))) {
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } finally {
      console.log('Onboarding process finished, setting loading to false');
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <User className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-2xl font-semibold">Seus dados pessoais</h2>
              <p className="text-muted-foreground">
                Vamos começar coletando algumas informações básicas sobre você.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomeCompleto">Nome completo *</Label>
                <Input
                  id="nomeCompleto"
                  value={data.nomeCompleto}
                  onChange={(e) => updateData('nomeCompleto', e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={data.telefone}
                  onChange={(e) => updateData('telefone', e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="especialidade">Especialidade *</Label>
                <Input
                  id="especialidade"
                  value={data.especialidade}
                  onChange={(e) => updateData('especialidade', e.target.value)}
                  placeholder="Ex: Dermatologia, Estética, Fisioterapia"
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Building2 className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-2xl font-semibold">Sobre sua clínica</h2>
              <p className="text-muted-foreground">
                Vamos começar entendendo sua estrutura clínica atual.
              </p>
            </div>

            <div className="grid gap-6">
              {/* Multiple Clinics Question */}
              <Card className="p-4 bg-muted/50">
                <div className="space-y-3">
                  <h3 className="font-medium">Estrutura da sua prática</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="temMultiplasClinicas"
                      checked={data.temMultiplasClinicas}
                      onCheckedChange={(checked) => updateData('temMultiplasClinicas', checked)}
                    />
                    <Label htmlFor="temMultiplasClinicas">
                      Possuo ou planejo ter múltiplas clínicas/filiais
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {data.temMultiplasClinicas 
                      ? "Vamos configurar sua rede de clínicas" 
                      : "Configuraremos apenas uma clínica"}
                  </p>
                </div>
              </Card>

              {/* Network/Organization Info - Only show if multiple clinics */}
              {data.temMultiplasClinicas && (
                <div className="space-y-4">
                  <h3 className="font-medium text-primary">Dados da Rede de Clínicas</h3>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nomeRede">Nome da rede/grupo *</Label>
                      <Input
                        id="nomeRede"
                        value={data.nomeRede}
                        onChange={(e) => updateData('nomeRede', e.target.value)}
                        placeholder="Ex: Grupo Beleza & Saúde"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpjRede">CNPJ da rede</Label>
                      <Input
                        id="cnpjRede"
                        value={data.cnpjRede}
                        onChange={(e) => updateData('cnpjRede', e.target.value)}
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                  </div>
                  <Separator />
                </div>
              )}

              {/* Primary Clinic Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-primary">
                  {data.temMultiplasClinicas ? "Clínica Principal" : "Dados da Clínica"}
                </h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeClinica">Nome da clínica *</Label>
                    <Input
                      id="nomeClinica"
                      value={data.nomeClinica}
                      onChange={(e) => updateData('nomeClinica', e.target.value)}
                      placeholder="Ex: Clínica Beleza & Saúde - Unidade Centro"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ da clínica</Label>
                    <Input
                      id="cnpj"
                      value={data.cnpj}
                      onChange={(e) => updateData('cnpj', e.target.value)}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="enderecoRua">Rua</Label>
                      <Input
                        id="enderecoRua"
                        value={data.enderecoRua}
                        onChange={(e) => updateData('enderecoRua', e.target.value)}
                        placeholder="Nome da rua"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="enderecoNumero">Número</Label>
                      <Input
                        id="enderecoNumero"
                        value={data.enderecoNumero}
                        onChange={(e) => updateData('enderecoNumero', e.target.value)}
                        placeholder="123"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="enderecoBairro">Bairro</Label>
                      <Input
                        id="enderecoBairro"
                        value={data.enderecoBairro}
                        onChange={(e) => updateData('enderecoBairro', e.target.value)}
                        placeholder="Nome do bairro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="enderecoCep">CEP</Label>
                      <Input
                        id="enderecoCep"
                        value={data.enderecoCep}
                        onChange={(e) => updateData('enderecoCep', e.target.value)}
                        placeholder="00000-000"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="enderecoCidade">Cidade *</Label>
                      <Input
                        id="enderecoCidade"
                        value={data.enderecoCidade}
                        onChange={(e) => updateData('enderecoCidade', e.target.value)}
                        placeholder="Nome da cidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="enderecoEstado">Estado *</Label>
                      <Input
                        id="enderecoEstado"
                        value={data.enderecoEstado}
                        onChange={(e) => updateData('enderecoEstado', e.target.value)}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="telefoneClinica">Telefone da clínica</Label>
                      <Input
                        id="telefoneClinica"
                        value={data.telefoneClinica}
                        onChange={(e) => updateData('telefoneClinica', e.target.value)}
                        placeholder="(11) 3333-3333"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emailClinica">E-mail da clínica</Label>
                      <Input
                        id="emailClinica"
                        type="email"
                        value={data.emailClinica}
                        onChange={(e) => updateData('emailClinica', e.target.value)}
                        placeholder="contato@clinica.com.br"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Users className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-2xl font-semibold">Primeiro profissional</h2>
              <p className="text-muted-foreground">
                Vamos cadastrar o primeiro profissional da clínica.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="souEuMesma"
                  checked={data.souEuMesma}
                  onCheckedChange={(checked) => updateData('souEuMesma', checked)}
                />
                <Label htmlFor="souEuMesma">Sou eu mesma</Label>
              </div>

              {!data.souEuMesma && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="nomeProfissional">Nome do profissional *</Label>
                    <Input
                      id="nomeProfissional"
                      value={data.nomeProfissional}
                      onChange={(e) => updateData('nomeProfissional', e.target.value)}
                      placeholder="Nome completo"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailProfissional">E-mail do profissional</Label>
                    <Input
                      id="emailProfissional"
                      type="email"
                      value={data.emailProfissional}
                      onChange={(e) => updateData('emailProfissional', e.target.value)}
                      placeholder="profissional@email.com"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="especialidadeProfissional">Especialidade *</Label>
                    <Input
                      id="especialidadeProfissional"
                      value={data.especialidadeProfissional}
                      onChange={(e) => updateData('especialidadeProfissional', e.target.value)}
                      placeholder="Ex: Dermatologia, Estética"
                    />
                  </div>
                </>
              )}

              {data.souEuMesma && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
                      <div>
                        <p className="font-medium text-primary">Perfeito!</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Seus dados pessoais serão utilizados como o primeiro profissional da clínica.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Star className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-2xl font-semibold">Primeiro serviço</h2>
              <p className="text-muted-foreground">
                Vamos cadastrar o primeiro serviço oferecido pela clínica.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomeServico">Nome do serviço *</Label>
                <Input
                  id="nomeServico"
                  value={data.nomeServico}
                  onChange={(e) => updateData('nomeServico', e.target.value)}
                  placeholder="Ex: Botox, Preenchimento, Limpeza de Pele"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duracaoServico">Duração (minutos) *</Label>
                  <Input
                    id="duracaoServico"
                    type="number"
                    min="15"
                    max="480"
                    value={data.duracaoServico}
                    onChange={(e) => updateData('duracaoServico', parseInt(e.target.value) || 60)}
                    placeholder="60"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="precoServico">Preço *</Label>
                  <Input
                    id="precoServico"
                    value={data.precoServico}
                    onChange={(e) => updateData('precoServico', e.target.value)}
                    placeholder="R$ 150,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricaoServico">Descrição do serviço</Label>
                <Textarea
                  id="descricaoServico"
                  value={data.descricaoServico}
                  onChange={(e) => updateData('descricaoServico', e.target.value)}
                  placeholder="Breve descrição do serviço oferecido..."
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Clock className="w-12 h-12 text-primary mx-auto" />
              <h2 className="text-2xl font-semibold">Configurações iniciais</h2>
              <p className="text-muted-foreground">
                Por último, vamos definir os horários de funcionamento da clínica.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="horarioInicio">Horário de abertura *</Label>
                  <Input
                    id="horarioInicio"
                    type="time"
                    value={data.horarioInicio}
                    onChange={(e) => updateData('horarioInicio', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="horarioFim">Horário de fechamento *</Label>
                  <Input
                    id="horarioFim"
                    type="time"
                    value={data.horarioFim}
                    onChange={(e) => updateData('horarioFim', e.target.value)}
                  />
                </div>
              </div>

              <Card className="bg-success/5 border-success/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                    <div>
                      <p className="font-medium text-success">Quase lá!</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Após finalizar, sua clínica estará pronta para receber os primeiros agendamentos.
                        Você poderá adicionar mais profissionais, serviços e fazer ajustes a qualquer momento.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  // Show session expired message if session is invalid
  if (!sessionValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Sessão Expirada</h2>
          <p className="text-muted-foreground">
            Redirecionando para a página de login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8 space-y-4">
          <h1 className="text-3xl font-bold heading-premium">
            Configuração Inicial
          </h1>
          <p className="text-muted-foreground">
            Vamos configurar sua clínica em apenas 5 passos simples
          </p>
          
          {/* Steps */}
          <div className="flex justify-center space-x-2 mb-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <Badge
                    variant={isActive ? "default" : isCompleted ? "secondary" : "outline"}
                    className="h-10 w-10 rounded-full p-0 flex items-center justify-center"
                  >
                    <Icon className="w-4 h-4" />
                  </Badge>
                  {step.id < STEPS.length && (
                    <div className="w-8 h-px bg-border mx-2" />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            Passo {currentStep} de {STEPS.length}
          </p>
        </div>

        {/* Content */}
        <Card className="mb-8">
          <CardContent className="p-8">
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1 || loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {currentStep === STEPS.length ? (
            <Button
              onClick={finishOnboarding}
              disabled={!validateCurrentStep() || loading}
              className="btn-premium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Finalizar Configuração
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={nextStep}
              disabled={!validateCurrentStep() || loading}
            >
              Próximo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}