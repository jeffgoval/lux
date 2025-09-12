import { useEffect, useState } from 'react';

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
}

export const LoadingOverlay = ({ isLoading, children }: LoadingOverlayProps) => {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setShowContent(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-primary-light rounded-full animate-spin animate-delay-200" />
        </div>
      </div>
    );
  }

  return (
    <div className={`transition-all duration-700 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      {children}
    </div>
  );
};