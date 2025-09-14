import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSecureAuth } from '@/contexts/SecureAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useForceProfile } from '@/hooks/useForceProfile';
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
  const { user, refreshProfile } = useSecureAuth();
  const navigate = useNavigate();
  const { creating } = useForceProfile();

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

        setSessionValid(false);
        return false;
      }

      setSessionValid(true);
      return true;
    } catch (error) {

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
      // Silently redirect without showing error toast
      navigate('/auth', {
        state: { from: '/onboarding' },
        replace: true
      });
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
      // Silently redirect without showing error toast
      navigate('/auth');
      return;
    }

    try {
      // 1. Criar/atualizar profile diretamente

      // Primeiro, verificar se o profile já existe
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existingProfile) {
        // Atualizar profile existente - apenas campos básicos
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            nome_completo: data.nomeCompleto
          })
          .eq('id', user.id);

        if (profileError) {
          throw new Error(`Erro ao atualizar perfil: ${profileError.message}`);
        }
      } else {
        // Criar novo profile - apenas campos básicos que sabemos que existem
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            nome_completo: data.nomeCompleto,
            email: user.email || ''
          });

        if (profileError) {
          throw new Error(`Erro ao criar perfil: ${profileError.message}`);
        }
      }

      // 1.1. Criar/verificar role de proprietária

      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', user.id)
        .eq('role', 'proprietaria')
        .maybeSingle();

      if (!existingRole) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: user.id,
            role: 'proprietaria',
            ativo: true,
            criado_por: user.id
          });

        if (roleError) {
          throw new Error(`Erro ao criar role: ${roleError.message}`);
        }
      }

      // Simplified onboarding - no organization support

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

      // Prepare clinic payload using correct table structure
      const enderecoJson = {
        rua: data.enderecoRua || null,
        numero: data.enderecoNumero || null,
        complemento: data.enderecoComplemento || null,
        bairro: data.enderecoBairro || null,
        cidade: data.enderecoCidade || null,
        estado: data.enderecoEstado || null,
        cep: data.enderecoCep || null
      };

      const clinicaPayload: any = {
        nome: data.nomeClinica,
        cnpj: data.cnpj || null,
        endereco: enderecoJson,
        telefone_principal: data.telefoneClinica || null,
        email_contato: data.emailClinica || null,
        horario_funcionamento: horarioFuncionamento
      };


      // Create clinic directly
      const { data: clinicaResponse, error: clinicaError } = await supabase
        .from('clinicas')
        .insert(clinicaPayload)
        .select('id')
        .single();

      if (clinicaError) {
        throw new Error(`Erro ao criar clínica: ${clinicaError.message}`);
      }

      const clinicaId = clinicaResponse.id;

      // 3.1. Atualizar user_roles com clinica_id imediatamente após criar a clínica
      const { error: updateRoleError } = await supabase
        .from('user_roles')
        .update({
          clinica_id: clinicaId
        })
        .eq('user_id', user.id)
        .eq('role', 'proprietaria');

      if (updateRoleError) {
        if (updateRoleError.code === '42501') {
          throw new Error('Erro de permissão ao atualizar role. Tente fazer logout e login novamente.');
        }
        throw new Error(`Erro ao atualizar role: ${updateRoleError.message}`);
      }

      // 4. Criar profissional e vincular à clínica

      if (data.souEuMesma) {
        // Se é o próprio usuário, criar entrada na tabela profissionais
        const { error: profissionalError } = await supabase
          .from('profissionais')
          .insert({
            user_id: user.id,
            registro_profissional: 'TEMP-' + Date.now(), // Registro temporário
          });

        if (profissionalError && profissionalError.code !== '23505') {
          throw new Error(`Erro ao criar profissional: ${profissionalError.message}`);
        }

        // Criar relação na tabela clinica_profissionais
        const { error: clinicaProfissionalError } = await supabase
          .from('clinica_profissionais')
          .insert({
            clinica_id: clinicaId,
            user_id: user.id,
            cargo: 'Proprietário',
            especialidades: [data.especialidade],
            pode_criar_prontuarios: true,
            pode_editar_prontuarios: true,
            pode_visualizar_financeiro: true,
            ativo: true
          });

        if (clinicaProfissionalError) {
          throw new Error(`Erro ao vincular profissional à clínica: ${clinicaProfissionalError.message}`);
        }
      } else {
        // Para outros profissionais, criar apenas a relação
        const { error: clinicaProfissionalError } = await supabase
          .from('clinica_profissionais')
          .insert({
            clinica_id: clinicaId,
            user_id: null, // Será preenchido quando o profissional se cadastrar
            cargo: 'Profissional',
            especialidades: [data.especialidadeProfissional],
            ativo: true
          });

        if (clinicaProfissionalError) {
          throw new Error(`Erro ao criar vínculo do profissional: ${clinicaProfissionalError.message}`);
        }
      }
      
      // 5. Criar template de procedimento

      const precoNumerico = parseFloat(data.precoServico.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
      
      const { error: templateError } = await supabase
        .from('templates_procedimentos')
        .insert({
          tipo_procedimento: 'consulta', // Padrão para onboarding
          nome_template: data.nomeServico,
          descricao: data.descricaoServico || null,
          duracao_padrao_minutos: data.duracaoServico,
          valor_base: precoNumerico,
          campos_obrigatorios: {
            duracao_minutos: { type: "number", required: true, default: data.duracaoServico },
            valor_procedimento: { type: "number", required: true, default: precoNumerico }
          },
          campos_opcionais: {
            observacoes: { type: "text" },
            retorno_recomendado: { type: "date" }
          }
        });

      if (templateError) {

        if (templateError.code === '23505') {
          throw new Error('Um template com este nome já existe.');
        } else if (templateError.code === '42501') {
          throw new Error('Erro de permissão ao criar template.');
        }
        throw new Error(`Erro ao criar template de procedimento: ${templateError.message}`);
      }

      // 6. Marcar onboarding como completo - OBRIGATÓRIO
      const { data: updateData, error: completeOnboardingError } = await supabase
        .from('profiles')
        .update({ primeiro_acesso: false })
        .eq('id', user.id)
        .select();

      if (completeOnboardingError) {
        throw new Error(`Erro ao finalizar onboarding: ${completeOnboardingError.message}`);
      }

      // Verificar se realmente atualizou
      const { data: verifyData, error: verifyError } = await supabase
        .from('profiles')
        .select('primeiro_acesso')
        .eq('id', user.id)
        .single();

      if (verifyError) {
        console.log('⚠️ Erro ao verificar atualização:', verifyError);
      } else if (verifyData.primeiro_acesso !== false) {
        throw new Error('Falha ao marcar onboarding como completo');
      }

      toast.success('Configuração inicial concluída com sucesso!');

      // Aguardar um pouco para garantir que os dados foram salvos
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast.success('Configuração inicial concluída com sucesso!');

      // Forçar atualização do contexto
      if (typeof refreshProfile === 'function') {
        await refreshProfile();
      }

      // Aguardar um pouco para o contexto ser atualizado
      await new Promise(resolve => setTimeout(resolve, 500));

      // Navegação simples para dashboard
      navigate('/dashboard', { replace: true });
    } catch (error: any) {

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

      // Log error silently instead of showing toast
      console.error('Erro no onboarding:', errorMessage, errorDescription);

      // If session is invalid, redirect to login
      if (!shouldRetry && (error.message?.includes('Sessão') || error.message?.includes('JWT'))) {
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } finally {

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

  // Show profile creation message
  if (creating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Configurando seu perfil</h2>
          <p className="text-muted-foreground">
            Preparando seu ambiente de onboarding...
          </p>
        </div>
      </div>
    );
  }

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

