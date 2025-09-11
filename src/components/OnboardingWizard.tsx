import { useState } from 'react';
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
  telefone: string;
  especialidade: string;
  
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
  intervaloConsultas: number;
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
  const [data, setData] = useState<OnboardingData>({
    telefone: '',
    especialidade: '',
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
    souEuMesma: true,
    nomeProfissional: '',
    emailProfissional: '',
    especialidadeProfissional: '',
    nomeServico: '',
    duracaoServico: 60,
    precoServico: '',
    descricaoServico: '',
    horarioInicio: '08:00',
    horarioFim: '18:00',
    intervaloConsultas: 15
  });

  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const updateData = (field: keyof OnboardingData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

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
        return data.telefone && data.especialidade;
      case 2:
        return data.nomeClinica && data.enderecoRua && data.enderecoCidade;
      case 3:
        return data.souEuMesma || (data.nomeProfissional && data.emailProfissional);
      case 4:
        return data.nomeServico && data.duracaoServico && data.precoServico;
      case 5:
        return data.horarioInicio && data.horarioFim;
      default:
        return true;
    }
  };

  const finishOnboarding = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // 1. Atualizar profile
      const { error: profileError } = await supabase.rpc('update_user_profile', {
        p_user_id: user.id,
        p_nome_completo: profile?.nome_completo || '',
        p_telefone: data.telefone
      });

      if (profileError) throw profileError;

      // 2. Criar organização
      const { data: orgData, error: orgError } = await supabase
        .from('organizacoes')
        .insert({
          nome: data.nomeClinica,
          cnpj: data.cnpj || null,
          proprietaria_id: user.id
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 3. Criar clínica
      const { data: clinicaData, error: clinicaError } = await supabase
        .from('clinicas')
        .insert({
          organizacao_id: orgData.id,
          nome: data.nomeClinica,
          cnpj: data.cnpj || null,
          endereco_rua: data.enderecoRua,
          endereco_numero: data.enderecoNumero,
          endereco_complemento: data.enderecoComplemento,
          endereco_bairro: data.enderecoBairro,
          endereco_cidade: data.enderecoCidade,
          endereco_estado: data.enderecoEstado,
          endereco_cep: data.enderecoCep,
          telefone: data.telefoneClinica,
          email: data.emailClinica,
          horario_funcionamento: {
            inicio: data.horarioInicio,
            fim: data.horarioFim,
            intervalo: data.intervaloConsultas
          }
        })
        .select()
        .single();

      if (clinicaError) throw clinicaError;

      // 4. Criar profissional
      const { error: profError } = await supabase
        .from('profissionais')
        .insert({
          user_id: data.souEuMesma ? user.id : null,
          clinica_id: clinicaData.id,
          nome: data.souEuMesma ? (profile?.nome_completo || '') : data.nomeProfissional,
          email: data.souEuMesma ? (profile?.email || '') : data.emailProfissional,
          telefone: data.souEuMesma ? data.telefone : '',
          especialidade: data.souEuMesma ? data.especialidade : data.especialidadeProfissional
        });

      if (profError) throw profError;

      // 5. Criar primeiro serviço
      const { error: servicoError } = await supabase
        .from('servicos')
        .insert({
          clinica_id: clinicaData.id,
          nome: data.nomeServico,
          descricao: data.descricaoServico,
          duracao_minutos: data.duracaoServico,
          preco: parseFloat(data.precoServico)
        });

      if (servicoError) throw servicoError;

      // 6. Atualizar user_roles com organizacao_id e clinica_id
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({
          organizacao_id: orgData.id,
          clinica_id: clinicaData.id
        })
        .eq('user_id', user.id);

      if (roleError) throw roleError;

      toast.success('Configuração concluída com sucesso!', {
        description: 'Sua clínica está pronta para uso. Bem-vinda ao sistema!'
      });

      navigate('/');
    } catch (error: any) {
      console.error('Erro no onboarding:', error);
      toast.error('Erro ao finalizar configuração', {
        description: error.message || 'Tente novamente.'
      });
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
                Vamos completar algumas informações básicas sobre você
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    value={profile?.nome_completo || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone *</Label>
                  <Input
                    id="telefone"
                    value={data.telefone}
                    onChange={(e) => updateData('telefone', e.target.value)}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="especialidade">Sua especialidade/formação *</Label>
                <Input
                  id="especialidade"
                  value={data.especialidade}
                  onChange={(e) => updateData('especialidade', e.target.value)}
                  placeholder="Ex: Dermatologia, Fisioterapia, Estética..."
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
              <h2 className="text-2xl font-semibold">Dados da sua clínica</h2>
              <p className="text-muted-foreground">
                Agora vamos configurar as informações da sua clínica
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nomeClinica">Nome da Clínica *</Label>
                  <Input
                    id="nomeClinica"
                    value={data.nomeClinica}
                    onChange={(e) => updateData('nomeClinica', e.target.value)}
                    placeholder="Clínica de Estética Avançada"
                  />
                </div>
                <div>
                  <Label htmlFor="cnpj">CNPJ (opcional)</Label>
                  <Input
                    id="cnpj"
                    value={data.cnpj}
                    onChange={(e) => updateData('cnpj', e.target.value)}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
              </div>

              <Separator />
              <h3 className="font-medium text-lg">Endereço</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="enderecoRua">Rua/Avenida *</Label>
                  <Input
                    id="enderecoRua"
                    value={data.enderecoRua}
                    onChange={(e) => updateData('enderecoRua', e.target.value)}
                    placeholder="Rua das Flores"
                  />
                </div>
                <div>
                  <Label htmlFor="enderecoNumero">Número</Label>
                  <Input
                    id="enderecoNumero"
                    value={data.enderecoNumero}
                    onChange={(e) => updateData('enderecoNumero', e.target.value)}
                    placeholder="123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="enderecoBairro">Bairro</Label>
                  <Input
                    id="enderecoBairro"
                    value={data.enderecoBairro}
                    onChange={(e) => updateData('enderecoBairro', e.target.value)}
                    placeholder="Centro"
                  />
                </div>
                <div>
                  <Label htmlFor="enderecoCidade">Cidade *</Label>
                  <Input
                    id="enderecoCidade"
                    value={data.enderecoCidade}
                    onChange={(e) => updateData('enderecoCidade', e.target.value)}
                    placeholder="São Paulo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="enderecoEstado">Estado</Label>
                  <Input
                    id="enderecoEstado"
                    value={data.enderecoEstado}
                    onChange={(e) => updateData('enderecoEstado', e.target.value)}
                    placeholder="SP"
                  />
                </div>
                <div>
                  <Label htmlFor="enderecoCep">CEP</Label>
                  <Input
                    id="enderecoCep"
                    value={data.enderecoCep}
                    onChange={(e) => updateData('enderecoCep', e.target.value)}
                    placeholder="01234-567"
                  />
                </div>
                <div>
                  <Label htmlFor="telefoneClinica">Telefone</Label>
                  <Input
                    id="telefoneClinica"
                    value={data.telefoneClinica}
                    onChange={(e) => updateData('telefoneClinica', e.target.value)}
                    placeholder="(11) 3333-4444"
                  />
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
                Quem será o primeiro profissional da sua clínica?
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-4">
                <Button
                  variant={data.souEuMesma ? 'default' : 'outline'}
                  onClick={() => updateData('souEuMesma', true)}
                  className="flex-1"
                >
                  <User className="w-4 h-4 mr-2" />
                  Sou eu mesma
                </Button>
                <Button
                  variant={!data.souEuMesma ? 'default' : 'outline'}
                  onClick={() => updateData('souEuMesma', false)}
                  className="flex-1"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Outro profissional
                </Button>
              </div>

              {data.souEuMesma ? (
                <Card className="bg-muted/50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-success" />
                      <div>
                        <p className="font-medium">Você será cadastrada como profissional</p>
                        <p className="text-sm text-muted-foreground">
                          Nome: {profile?.nome_completo} • Especialidade: {data.especialidade}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nomeProfissional">Nome do Profissional *</Label>
                      <Input
                        id="nomeProfissional"
                        value={data.nomeProfissional}
                        onChange={(e) => updateData('nomeProfissional', e.target.value)}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="emailProfissional">Email *</Label>
                      <Input
                        id="emailProfissional"
                        type="email"
                        value={data.emailProfissional}
                        onChange={(e) => updateData('emailProfissional', e.target.value)}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="especialidadeProfissional">Especialidade</Label>
                    <Input
                      id="especialidadeProfissional"
                      value={data.especialidadeProfissional}
                      onChange={(e) => updateData('especialidadeProfissional', e.target.value)}
                      placeholder="Ex: Fisioterapeuta, Esteticista..."
                    />
                  </div>
                </div>
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
                Vamos cadastrar o primeiro serviço da sua clínica
              </p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="nomeServico">Nome do Serviço *</Label>
                <Input
                  id="nomeServico"
                  value={data.nomeServico}
                  onChange={(e) => updateData('nomeServico', e.target.value)}
                  placeholder="Ex: Limpeza de Pele, Drenagem Linfática..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="duracaoServico">Duração (minutos) *</Label>
                  <Input
                    id="duracaoServico"
                    type="number"
                    value={data.duracaoServico}
                    onChange={(e) => updateData('duracaoServico', parseInt(e.target.value) || 60)}
                    placeholder="60"
                  />
                </div>
                <div>
                  <Label htmlFor="precoServico">Preço (R$) *</Label>
                  <Input
                    id="precoServico"
                    value={data.precoServico}
                    onChange={(e) => updateData('precoServico', e.target.value)}
                    placeholder="150.00"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="descricaoServico">Descrição</Label>
                <Textarea
                  id="descricaoServico"
                  value={data.descricaoServico}
                  onChange={(e) => updateData('descricaoServico', e.target.value)}
                  placeholder="Descreva brevemente o serviço..."
                  rows={3}
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
              <h2 className="text-2xl font-semibold">Configurações básicas</h2>
              <p className="text-muted-foreground">
                Últimos ajustes para deixar tudo pronto!
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium">Horário de funcionamento</h3>
              <div className="grid grid-cols-2 gap-4">
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

              <div>
                <Label htmlFor="intervaloConsultas">Intervalo entre consultas (minutos)</Label>
                <Input
                  id="intervaloConsultas"
                  type="number"
                  value={data.intervaloConsultas}
                  onChange={(e) => updateData('intervaloConsultas', parseInt(e.target.value) || 15)}
                  placeholder="15"
                />
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Configuração da sua clínica
          </h1>
          <p className="text-muted-foreground">
            Vamos configurar tudo em poucos passos para você começar a usar o sistema
          </p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              
              return (
                <div key={step.id} className="flex flex-col items-center">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors
                    ${isActive ? 'bg-primary text-primary-foreground' : ''}
                    ${isCompleted ? 'bg-success text-success-foreground' : ''}
                    ${!isActive && !isCompleted ? 'bg-muted text-muted-foreground' : ''}
                  `}>
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
                    {step.title}
                  </Badge>
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
            disabled={currentStep === 1}
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
              disabled={!validateCurrentStep()}
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