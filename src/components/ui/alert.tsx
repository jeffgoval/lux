/**
 * 🚨 COMPONENTE DE ALERT APRIMORADO
 * 
 * Sistema de alertas com múltiplas variações e estados visuais
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X, CheckCircle, AlertCircle, Info, XCircle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        destructive: "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200 [&>svg]:text-red-600",
        success: "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-200 [&>svg]:text-green-600",
        warning: "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200 [&>svg]:text-yellow-600",
        info: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-600",
        loading: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/20 dark:text-blue-200 [&>svg]:text-blue-600",
      },
      size: {
        sm: "p-3 text-sm",
        md: "p-4",
        lg: "p-6 text-lg",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
  showDefaultIcon?: boolean;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, size, dismissible, onDismiss, icon, showDefaultIcon = true, children, ...props }, ref) => {
    const getDefaultIcon = () => {
      if (!showDefaultIcon) return null;
      
      switch (variant) {
        case 'success':
          return <CheckCircle className="h-4 w-4" />;
        case 'destructive':
          return <XCircle className="h-4 w-4" />;
        case 'warning':
          return <AlertCircle className="h-4 w-4" />;
        case 'info':
          return <Info className="h-4 w-4" />;
        case 'loading':
          return <Loader2 className="h-4 w-4 animate-spin" />;
        default:
          return <Info className="h-4 w-4" />;
      }
    };

    return (
      <div 
        ref={ref} 
        role="alert" 
        className={cn(alertVariants({ variant, size }), className)} 
        {...props}
      >
        {(icon || showDefaultIcon) && (
          <div className="absolute left-4 top-4">
            {icon || getDefaultIcon()}
          </div>
        )}
        
        <div className={cn(
          "flex-1",
          (icon || showDefaultIcon) ? "pl-7" : ""
        )}>
          {children}
        </div>

        {dismissible && (
          <button
            onClick={onDismiss}
            className="absolute right-2 top-2 p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label="Fechar alerta"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }
);
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

// Componentes de conveniência para diferentes tipos de alert
export const SuccessAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="success" {...props} />
);
SuccessAlert.displayName = "SuccessAlert";

export const ErrorAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="destructive" {...props} />
);
ErrorAlert.displayName = "ErrorAlert";

export const WarningAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="warning" {...props} />
);
WarningAlert.displayName = "WarningAlert";

export const InfoAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="info" {...props} />
);
InfoAlert.displayName = "InfoAlert";

export const LoadingAlert = React.forwardRef<HTMLDivElement, Omit<AlertProps, 'variant'>>(
  (props, ref) => <Alert ref={ref} variant="loading" {...props} />
);
LoadingAlert.displayName = "LoadingAlert";

export { Alert, AlertTitle, AlertDescription };
