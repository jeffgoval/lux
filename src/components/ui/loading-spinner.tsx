/**
 * 🔄 COMPONENTE DE LOADING SPINNER APRIMORADO
 * 
 * Spinner reutilizável para estados de carregamento com múltiplas variações
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  color?: 'primary' | 'secondary' | 'white' | 'muted';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars';
  text?: string;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6', 
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
  '2xl': 'w-16 h-16'
};

const colorClasses = {
  primary: 'text-primary',
  secondary: 'text-secondary',
  white: 'text-white',
  muted: 'text-muted-foreground'
};

const textSizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-sm',
  lg: 'text-base',
  xl: 'text-lg',
  '2xl': 'text-xl'
};

export function LoadingSpinner({ 
  size = 'md', 
  className,
  color = 'primary',
  variant = 'spinner',
  text
}: LoadingSpinnerProps) {
  
  const renderSpinner = () => {
    switch (variant) {
      case 'spinner':
        return (
          <Loader2 
            className={cn(
              'animate-spin',
              sizeClasses[size],
              colorClasses[color]
            )}
          />
        );
      
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  'rounded-full animate-pulse',
                  size === 'xs' ? 'w-1 h-1' : 
                  size === 'sm' ? 'w-1.5 h-1.5' :
                  size === 'md' ? 'w-2 h-2' :
                  size === 'lg' ? 'w-2.5 h-2.5' :
                  size === 'xl' ? 'w-3 h-3' : 'w-4 h-4',
                  colorClasses[color].replace('text-', 'bg-')
                )}
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1.4s'
                }}
              />
            ))}
          </div>
        );
      
      case 'pulse':
        return (
          <div
            className={cn(
              'rounded-full animate-pulse',
              sizeClasses[size],
              colorClasses[color].replace('text-', 'bg-')
            )}
          />
        );
      
      case 'bars':
        return (
          <div className="flex space-x-1 items-end">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'animate-pulse',
                  size === 'xs' ? 'w-0.5' : 
                  size === 'sm' ? 'w-1' :
                  size === 'md' ? 'w-1.5' :
                  size === 'lg' ? 'w-2' :
                  size === 'xl' ? 'w-2.5' : 'w-3',
                  size === 'xs' ? 'h-2' : 
                  size === 'sm' ? 'h-3' :
                  size === 'md' ? 'h-4' :
                  size === 'lg' ? 'h-5' :
                  size === 'xl' ? 'h-6' : 'h-8',
                  colorClasses[color].replace('text-', 'bg-')
                )}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1s'
                }}
              />
            ))}
          </div>
        );
      
      default:
        return (
          <div
            className={cn(
              'animate-spin rounded-full border-2 border-current border-t-transparent',
              sizeClasses[size],
              colorClasses[color]
            )}
          />
        );
    }
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center',
        text ? 'flex-col space-y-2' : '',
        className
      )}
      role="status"
      aria-label={text || "Carregando..."}
    >
      {renderSpinner()}
      {text && (
        <span className={cn(
          'font-medium',
          textSizeClasses[size],
          colorClasses[color]
        )}>
          {text}
        </span>
      )}
      <span className="sr-only">{text || "Carregando..."}</span>
    </div>
  );
}

// Componente de loading inline para botões
export function ButtonSpinner({ 
  size = 'sm',
  className 
}: { 
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}) {
  return (
    <LoadingSpinner
      size={size}
      variant="spinner"
      color="white"
      className={cn('mr-2', className)}
    />
  );
}

// Componente de loading para cards/seções
export function SectionLoader({ 
  text,
  size = 'lg',
  className 
}: { 
  text?: string;
  size?: 'md' | 'lg' | 'xl';
  className?: string;
}) {
  return (
    <div className={cn(
      'flex items-center justify-center py-8',
      className
    )}>
      <LoadingSpinner
        size={size}
        variant="spinner"
        text={text}
        className="text-center"
      />
    </div>
  );
}
