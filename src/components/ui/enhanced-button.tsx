/**
 * 🔘 BOTÃO APRIMORADO COM ESTADOS DE LOADING
 * 
 * Extensão do botão base com estados de loading e feedback visual
 */

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { LoadingSpinner } from "./loading-spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        success: "bg-green-600 text-white hover:bg-green-700",
        warning: "bg-yellow-600 text-white hover:bg-yellow-700",
        info: "bg-blue-600 text-white hover:bg-blue-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    asChild = false, 
    loading = false,
    loadingText,
    icon,
    iconPosition = 'left',
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    const isDisabled = disabled || loading;
    
    const renderContent = () => {
      if (loading) {
        return (
          <>
            <LoadingSpinner 
              size={size === 'sm' ? 'xs' : size === 'lg' ? 'sm' : 'xs'} 
              variant="spinner" 
              color="white"
              className="mr-2"
            />
            {loadingText || children}
          </>
        );
      }

      if (icon) {
        return (
          <>
            {iconPosition === 'left' && (
              <span className="mr-2 flex-shrink-0">{icon}</span>
            )}
            {children}
            {iconPosition === 'right' && (
              <span className="ml-2 flex-shrink-0">{icon}</span>
            )}
          </>
        );
      }

      return children;
    };

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {renderContent()}
      </Comp>
    );
  }
);
Button.displayName = "Button";

// Componentes de conveniência para diferentes tipos de botão
export const LoadingButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ loading, loadingText, children, ...props }, ref) => (
    <Button
      ref={ref}
      loading={loading}
      loadingText={loadingText}
      {...props}
    >
      {children}
    </Button>
  )
);
LoadingButton.displayName = "LoadingButton";

export const SuccessButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="success" {...props} />
);
SuccessButton.displayName = "SuccessButton";

export const DestructiveButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="destructive" {...props} />
);
DestructiveButton.displayName = "DestructiveButton";

export const WarningButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="warning" {...props} />
);
WarningButton.displayName = "WarningButton";

export const InfoButton = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>(
  (props, ref) => <Button ref={ref} variant="info" {...props} />
);
InfoButton.displayName = "InfoButton";

// Hook para gerenciar estados de botão com loading
export const useButtonState = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const executeAction = React.useCallback(async (
    action: () => Promise<void>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      onSuccess?: () => void;
      onError?: (error: Error) => void;
    }
  ) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await action();
      
      if (options?.successMessage) {
        setSuccess(options.successMessage);
      }
      
      options?.onSuccess?.();
    } catch (err) {
      const errorMessage = options?.errorMessage || 
        (err instanceof Error ? err.message : 'Ocorreu um erro');
      
      setError(errorMessage);
      options?.onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = React.useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(null);
  }, []);

  return {
    loading,
    error,
    success,
    executeAction,
    reset,
  };
};

export { Button, buttonVariants };