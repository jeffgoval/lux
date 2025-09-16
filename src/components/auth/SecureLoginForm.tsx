/**
 * 🔐 FORMULÁRIO DE LOGIN SEGURO V2
 * 
 * Componente de login com validação rigorosa e proteções de segurança
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Shield, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useUnifiedAuth } from '@/hooks/useUnifiedAuth';
import { LoginCredentials } from '@/types/auth.types';
import { AUTH_CONFIG } from '@/config/auth.config';
import { formatErrorForDisplay } from '@/utils/error-display';

// ============================================================================
// SCHEMA DE VALIDAÇÃO
// ============================================================================

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email é obrigatório')
    .email('Email inválido')
    .max(255, 'Email muito longo'),
  
  password: z
    .string()
    .min(AUTH_CONFIG.PASSWORD.MIN_LENGTH, `Senha deve ter pelo menos ${AUTH_CONFIG.PASSWORD.MIN_LENGTH} caracteres`)
    .max(128, 'Senha muito longa'),
  
  rememberMe: z.boolean().optional(),
  
  clinicId: z.string().optional()
});

type LoginFormData = z.infer<typeof loginSchema>;

// ============================================================================
// INTERFACE DO COMPONENTE
// ============================================================================

interface SecureLoginFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onRegister?: () => void;
  defaultEmail?: string;
  showClinicSelector?: boolean;
  availableClinics?: Array<{ id: string; name: string }>;
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function SecureLoginForm({
  onSuccess,
  onForgotPassword,
  onRegister,
  defaultEmail = '',
  showClinicSelector = false,
  availableClinics = []
}: SecureLoginFormProps) {
  const { signIn, isInitializing, error, clearError } = useUnifiedAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  // ==========================================================================
  // CONFIGURAÇÃO DO FORMULÁRIO
  // ==========================================================================

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: defaultEmail,
      password: '',
      rememberMe: false,
      clinicId: ''
    }
  });

  const watchedEmail = watch('email');

  // ==========================================================================
  // CONTROLE DE RATE LIMITING LOCAL
  // ==========================================================================

  useEffect(() => {
    const storedAttempts = localStorage.getItem('login_attempts');
    const storedLockout = localStorage.getItem('login_lockout');
    
    if (storedAttempts) {
      setLoginAttempts(parseInt(storedAttempts, 10));
    }
    
    if (storedLockout) {
      const lockoutTime = new Date(storedLockout);
      const now = new Date();
      
      if (lockoutTime > now) {
        setIsLocked(true);
        setLockoutTimer(Math.ceil((lockoutTime.getTime() - now.getTime()) / 1000));
      } else {
        // Lockout expirou, limpar
        localStorage.removeItem('login_lockout');
        localStorage.removeItem('login_attempts');
      }
    }
  }, []);

  // Timer de lockout
  useEffect(() => {
    if (lockoutTimer > 0) {
      const timer = setTimeout(() => {
        setLockoutTimer(prev => {
          if (prev <= 1) {
            setIsLocked(false);
            localStorage.removeItem('login_lockout');
            localStorage.removeItem('login_attempts');
            setLoginAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [lockoutTimer]);

  // ==========================================================================
  // HANDLERS
  // ==========================================================================

  const onSubmit = useCallback(async (data: LoginFormData) => {
    if (isLocked) {
      return;
    }

    clearError();

    try {
      const credentials: LoginCredentials = {
        email: data.email.toLowerCase().trim(),
        password: data.password,
        rememberMe: data.rememberMe,
        clinicId: data.clinicId || undefined
      };

      const result = await signIn(credentials.email, credentials.password);

      if (!result.error) {
        // Login bem-sucedido - limpar tentativas
        localStorage.removeItem('login_attempts');
        localStorage.removeItem('login_lockout');
        setLoginAttempts(0);
        setIsLocked(false);
        
        // Limpar formulário por segurança
        reset();
        
        onSuccess?.();
      } else {
        // Login falhou - incrementar tentativas
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        localStorage.setItem('login_attempts', newAttempts.toString());

        // Verificar se deve bloquear
        if (newAttempts >= AUTH_CONFIG.PASSWORD.MAX_LOGIN_ATTEMPTS) {
          const lockoutUntil = new Date(Date.now() + AUTH_CONFIG.PASSWORD.LOCKOUT_DURATION);
          localStorage.setItem('login_lockout', lockoutUntil.toISOString());
          setIsLocked(true);
          setLockoutTimer(Math.ceil(AUTH_CONFIG.PASSWORD.LOCKOUT_DURATION / 1000));
        }
      }
    } catch (error) {
      console.error('Login error:', error);
    }
  }, [signIn, isLocked, loginAttempts, clearError, reset, onSuccess]);

  const handleForgotPassword = useCallback(() => {
    const email = watchedEmail;
    if (email && onForgotPassword) {
      onForgotPassword();
    }
  }, [watchedEmail, onForgotPassword]);

  const togglePasswordVisibility = useCallback(() => {
    setShowPassword(prev => !prev);
  }, []);

  // ==========================================================================
  // FORMATAÇÃO DE TEMPO
  // ==========================================================================

  const formatLockoutTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // ==========================================================================
  // RENDERIZAÇÃO
  // ==========================================================================

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Acesso Seguro
        </h1>
        <p className="text-sm text-gray-600">
          Entre com suas credenciais para continuar
        </p>
      </div>

      {/* Alertas de Segurança */}
      {isLocked && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Conta temporariamente bloqueada devido a múltiplas tentativas de login.
            Tente novamente em {formatLockoutTime(lockoutTimer)}.
          </AlertDescription>
        </Alert>
      )}

      {loginAttempts > 0 && !isLocked && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {AUTH_CONFIG.PASSWORD.MAX_LOGIN_ATTEMPTS - loginAttempts} tentativas restantes
            antes do bloqueio temporário.
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{formatErrorForDisplay(error)}</AlertDescription>
        </Alert>
      )}

      {/* Formulário */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            disabled={isLocked || isInitializing}
            {...register('email')}
            className={errors.email ? 'border-red-500' : ''}
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Senha */}
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              disabled={isLocked || isInitializing}
              {...register('password')}
              className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
              onClick={togglePasswordVisibility}
              disabled={isLocked || isInitializing}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400" />
              )}
            </Button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Seletor de Clínica (se habilitado) */}
        {showClinicSelector && availableClinics.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="clinicId">Clínica (Opcional)</Label>
            <select
              id="clinicId"
              disabled={isLocked || isInitializing}
              {...register('clinicId')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Selecionar após login</option>
              {availableClinics.map(clinic => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Lembrar-me */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="rememberMe"
            disabled={isLocked || isInitializing}
            {...register('rememberMe')}
          />
          <Label htmlFor="rememberMe" className="text-sm">
            Manter-me conectado
          </Label>
        </div>

        {/* Botão de Submit */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLocked || isInitializing || isSubmitting}
        >
          {isInitializing || isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Entrando...
            </>
          ) : (
            'Entrar'
          )}
        </Button>
      </form>

      {/* Links auxiliares */}
      <div className="space-y-3 text-center">
        {onForgotPassword && (
          <Button
            type="button"
            variant="link"
            className="text-sm"
            onClick={handleForgotPassword}
            disabled={isLocked || isInitializing}
          >
            Esqueceu sua senha?
          </Button>
        )}

        {onRegister && (
          <div className="text-sm text-gray-600">
            Não tem uma conta?{' '}
            <Button
              type="button"
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={onRegister}
              disabled={isLocked || isInitializing}
            >
              Cadastre-se
            </Button>
          </div>
        )}
      </div>

      {/* Informações de Segurança */}
      <div className="text-xs text-gray-500 text-center space-y-1">
        <p>🔒 Conexão segura e criptografada</p>
        <p>Suas credenciais são protegidas por criptografia de ponta</p>
      </div>
    </div>
  );
}
