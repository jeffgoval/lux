import { useState, useEffect } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { Bell, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { OnboardingModal } from './OnboardingModal';

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const { profile, currentRole, signOut, isLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Mostrar onboarding se é primeiro acesso e não está carregando
    if (!isLoading && profile?.primeiro_acesso && currentRole === 'cliente') {
      setShowOnboarding(true);
    }
  }, [isLoading, profile, currentRole]);

  const getRoleLabel = (role: string) => {
    const roleLabels = {
      'super_admin': 'Super Admin',
      'proprietaria': 'Proprietária',
      'gerente': 'Gerente',
      'profissionais': 'Profissional',
      'recepcionistas': 'Recepcionista',
      'cliente': 'Cliente'
    };
    return roleLabels[role as keyof typeof roleLabels] || role;
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <main className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
            <div className="flex items-center justify-between h-full px-6">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-foreground hover:bg-accent hover:text-accent-foreground" />
                {title && (
                  <div>
                    <h1 className="text-2xl font-semibold heading-premium">{title}</h1>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Bell className="h-5 w-5" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center gap-2 px-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url} />
                        <AvatarFallback>
                          {profile?.nome_completo?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-start">
                        <span className="text-sm font-medium">{profile?.nome_completo}</span>
                        {currentRole && (
                          <Badge variant="secondary" className="text-xs px-1 py-0">
                            {getRoleLabel(currentRole)}
                          </Badge>
                        )}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <User className="mr-2 h-4 w-4" />
                      Perfil
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>
          
          {/* Main content */}
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
      
      <OnboardingModal 
        isOpen={showOnboarding} 
        onClose={() => setShowOnboarding(false)} 
      />
    </SidebarProvider>
  )
}