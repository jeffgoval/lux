/**
 * 🔐 PÁGINA DE AUTENTICAÇÃO SEGURA V2
 * 
 * Página integrada de login/registro com máxima segurança
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Info, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { SecureLoginForm } from '@/components/auth/SecureLoginForm';
import { ClinicSelector } from '@/components/auth/ClinicSelector';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { toast } from '@/hooks/use-toast';

// ============================================================================
// INTERFACES
// ============================================================================

interface LocationState {
  from?: string;
  reason?: string;
  requiresEmailVerification?: boolean;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function SecureAuth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, profile, signUp, isInitializing, error } = useUnifiedAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [showClinicSelection, setShowClinicSelection] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Estados para registro
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    acceptTerms: false
  });

  const locationState = location.state as LocationState | null;

  // ==========================================================================
  // EFEITOS DE REDIRECIONAMENTO
  // ==========================================================================

  // REMOVIDO: useEffect com lógica de redirecionamento automático
  // Deixar o SecureAuthGuard gerenciar toda a lógica de navegação

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const handleLoginSuccess = () => {
    toast({
      title: "Login realizado com sucesso!",
      description: "Bem-vindo de volta.",
      variant: "default",
    });

    // O redirecionamento será feito pelo useEffect
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validações
    if (registerData.password.length < 6) {
      toast({
        title: "Erro no cadastro",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        title: "Erro no cadastro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    if (!registerData.acceptTerms) {
      toast({
        title: "Erro no cadastro",
        description: "É necessário aceitar os termos de uso",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await signUp(registerData.email, registerData.password, {
        nome_completo: registerData.email.split('@')[0] // Nome temporário baseado no email
      });

      if (result.success) {
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Bem-vindo! Complete seu perfil para começar a usar o sistema.",
          variant: "default",
        });

        // Redirecionar para onboarding
        navigate('/onboarding', { replace: true });
      } else {
        toast({
          title: "Erro no cadastro",
          description: result.error || "Ocorreu um erro inesperado",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro no cadastro",
        description: "Ocorreu um erro inesperado",
        variant: "destructive",
      });
    }
  };

  const handleRegisterSuccess = () => {
    toast({
      title: "Cadastro realizado com sucesso!",
      description: "Verifique seu email para ativar sua conta.",
      variant: "default",
    });

    setActiveTab('login');
  };

  const handleClinicSelected = () => {
    setShowClinicSelection(false);
    const redirectTo = locationState?.from || '/dashboard';
    navigate(redirectTo, { replace: true });
  };

  const handleForgotPassword = () => {
    // TODO: Implementar recuperação de senha
    toast({
      title: "Recuperação de senha",
      description: "Funcionalidade em desenvolvimento.",
      variant: "default",
    });
  };

  // ==========================================================================
  // RENDERIZAÇÃO CONDICIONAL
  // ==========================================================================

  // Se está autenticado e precisa selecionar clínica
  if (isAuthenticated && showClinicSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
            </div>
            <CardTitle>Selecionar Clínica</CardTitle>
            <CardDescription>
              Escolha a clínica para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClinicSelector 
              onClinicChange={handleClinicSelected}
              showRoleInfo={true}
              showExpiryWarning={true}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Página principal de autenticação
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Formulário centralizado */}
        <Card className="w-full">
          <CardHeader>
            <div className="flex justify-center lg:hidden mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Shield className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {/* Alertas contextuais */}
            {locationState?.reason && locationState.reason !== 'Usuário não autenticado' && (
              <Alert className="mb-6">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {locationState.reason}
                </AlertDescription>
              </Alert>
            )}

            {locationState?.requiresEmailVerification && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Verifique seu email antes de fazer login.
                </AlertDescription>
              </Alert>
            )}

            {/* Tabs de Login/Registro */}
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'register')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>

              {/* Tab de Login */}
              <TabsContent value="login" className="space-y-4">
                <SecureLoginForm
                  onSuccess={handleLoginSuccess}
                  onForgotPassword={handleForgotPassword}
                  onRegister={() => setActiveTab('register')}
                />
              </TabsContent>

              {/* Tab de Registro */}
              <TabsContent value="register" className="space-y-4">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Crie sua conta gratuita e comece a usar o sistema em menos de 2 minutos!
                  </p>
                </div>

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email *</Label>
                    <Input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>

                  {/* Senha */}
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Senha *</Label>
                    <div className="relative">
                      <Input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={registerData.password}
                        onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                        required
                        minLength={6}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Confirmar Senha */}
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">Confirmar Senha *</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      autoComplete="new-password"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Digite a senha novamente"
                      required
                    />
                  </div>

                  {/* Aceitar Termos */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="accept-terms"
                      checked={registerData.acceptTerms}
                      onCheckedChange={(checked) => setRegisterData(prev => ({ ...prev, acceptTerms: checked === true }))}
                    />
                    <Label htmlFor="accept-terms" className="text-sm">
                      Aceito os <a href="#" className="text-primary underline">termos de uso</a> e <a href="#" className="text-primary underline">política de privacidade</a>
                    </Label>
                  </div>

                  {/* Erro */}
                  {error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Botão de Submit */}
                  <Button type="submit" className="w-full" disabled={isInitializing}>
                    {isInitializing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar Conta Gratuita'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Footer de Segurança */}
        <div className="mt-8 text-center text-xs text-gray-500 space-y-1">
          <p>🔒 Conexão segura protegida por SSL</p>
          <p>Seus dados são criptografados e protegidos</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE DE LOADING PARA LAZY LOADING
// ============================================================================

export function SecureAuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">
                Carregando...
              </h3>
              <p className="text-sm text-gray-600">
                Preparando sistema de autenticação seguro
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
