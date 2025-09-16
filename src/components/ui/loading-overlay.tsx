/**
 * 🔄 COMPONENTE DE LOADING OVERLAY APRIMORADO
 * 
 * Overlay de loading com múltiplas variações e estados
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './loading-spinner';

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
  variant?: 'fullscreen' | 'container' | 'inline';
  backdrop?: boolean;
  className?: string;
}

export const LoadingOverlay = ({ 
  isLoading, 
  children, 
  text,
  variant = 'fullscreen',
  backdrop = true,
  className
}: LoadingOverlayProps) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isLoading]);

  const getOverlayClasses = () => {
    switch (variant) {
      case 'fullscreen':
        return 'fixed inset-0 z-50 flex items-center justify-center';
      case 'container':
        return 'absolute inset-0 z-10 flex items-center justify-center';
      case 'inline':
        return 'flex items-center justify-center py-8';
      default:
        return 'fixed inset-0 z-50 flex items-center justify-center';
    }
  };

  const getBackdropClasses = () => {
    if (!backdrop) return '';
    
    switch (variant) {
      case 'fullscreen':
        return 'bg-background/80 backdrop-blur-sm';
      case 'container':
        return 'bg-background/60 backdrop-blur-sm';
      case 'inline':
        return '';
      default:
        return 'bg-background/80 backdrop-blur-sm';
    }
  };

  if (isLoading) {
    return (
      <div className={cn(
        getOverlayClasses(),
        getBackdropClasses(),
        className
      )}>
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner
            size={variant === 'inline' ? 'lg' : 'xl'}
            variant="spinner"
            color="primary"
          />
          {text && (
            <p className="text-sm text-muted-foreground font-medium animate-pulse">
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'transition-all duration-700',
      showContent ? 'opacity-100' : 'opacity-0'
    )}>
      {children}
    </div>
  );
};

// Componente de loading para seções específicas
export const SectionLoadingOverlay = ({ 
  isLoading, 
  children, 
  text,
  className 
}: {
  isLoading: boolean;
  children: React.ReactNode;
  text?: string;
  className?: string;
}) => {
  return (
    <div className={cn('relative', className)}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-lg">
          <LoadingSpinner
            size="lg"
            variant="spinner"
            text={text}
            color="primary"
          />
        </div>
      )}
      <div className={cn(
        'transition-opacity duration-300',
        isLoading ? 'opacity-30' : 'opacity-100'
      )}>
        {children}
      </div>
    </div>
  );
};

// Componente de loading para botões
export const ButtonLoadingOverlay = ({ 
  isLoading, 
  children, 
  loadingText,
  className 
}: {
  isLoading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  className?: string;
}) => {
  return (
    <div className={cn('relative', className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <LoadingSpinner size="sm" variant="spinner" color="white" />
          {loadingText && (
            <span className="ml-2 text-sm">{loadingText}</span>
          )}
        </div>
      )}
      <div className={cn(
        'transition-opacity duration-200',
        isLoading ? 'opacity-0' : 'opacity-100'
      )}>
        {children}
      </div>
    </div>
  );
};