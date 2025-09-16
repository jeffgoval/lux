import { CalendarDays, Users, Briefcase, Package, Wrench, DollarSign, MessageSquare, FileText, Home, Search, Settings, LogOut, Loader2, BarChart3, Bell, Zap } from "lucide-react"
import { useLocation } from "react-router-dom"
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth"
import { useNavigation } from "@/contexts/NavigationContext"
import { useClinica } from "@/hooks/useClinica"
import { Database } from "@/integrations/supabase/types"
import { useMemo } from "react"

type UserRole = Database['public']['Enums']['user_role_type']
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarErrorBoundary } from "./SidebarErrorBoundary"
import { OptimisticNavLink } from "./OptimisticNavLink"

// Navigation items with role permissions and priority
const allNavItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    roles: ['super_admin', 'proprietaria', 'gerente', 'recepcionistas', 'profissionais', 'visitante'] as UserRole[],
    priority: 1,
    alwaysShow: true // Always show dashboard
  },
  {
    title: "Agendamento", 
    url: "/agendamento",
    icon: CalendarDays,
    roles: ['super_admin', 'proprietaria', 'gerente', 'recepcionistas'] as UserRole[],
    priority: 2
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
    roles: ['super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas'] as UserRole[],
    priority: 3
  },
  {
    title: "Serviços",
    url: "/servicos",
    icon: Briefcase,
    roles: ['super_admin', 'proprietaria', 'gerente', 'profissionais'] as UserRole[],
    priority: 4
  },
  {
    title: "Produtos",
    url: "/produtos",
    icon: Package,
    roles: ['super_admin', 'proprietaria', 'gerente'] as UserRole[],
    priority: 5
  },
  {
    title: "Equipamentos",
    url: "/equipamentos",
    icon: Wrench,
    roles: ['super_admin', 'proprietaria', 'gerente'] as UserRole[],
    priority: 6
  },
  {
    title: "Financeiro",
    url: "/financeiro",
    icon: DollarSign,
    roles: ['super_admin', 'proprietaria', 'gerente'] as UserRole[],
    priority: 7
  },
  {
    title: "Comunicação",
    url: "/comunicacao",
    icon: MessageSquare,
    roles: ['super_admin', 'proprietaria', 'gerente', 'recepcionistas'] as UserRole[],
    priority: 8
  },
  {
    title: "Prontuários",
    url: "/prontuarios",
    icon: FileText,
    roles: ['super_admin', 'proprietaria', 'gerente', 'profissionais'] as UserRole[],
    priority: 9
  },
  {
    title: "Dashboard Executivo",
    url: "/executivo",
    icon: BarChart3,
    roles: ['super_admin', 'proprietaria', 'gerente'] as UserRole[],
    priority: 10
  },
  {
    title: "Alertas",
    url: "/alertas",
    icon: Bell,
    roles: ['super_admin', 'proprietaria', 'gerente'] as UserRole[],
    priority: 11
  },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const { currentRole, signOut, isInitializing, isAuthenticated, profile } = useUnifiedAuth()
  const { isAuthenticated: navIsAuthenticated, isAuthLoaded, canAccessRoute } = useNavigation()
  const { clinica } = useClinica()
  const location = useLocation()
  const currentPath = location.pathname

  // Memoized navigation items filtering with progressive disclosure and authentication awareness
  const mainNavItems = useMemo(() => {
    // Don't show navigation items if not authenticated
    if (!navIsAuthenticated && isAuthLoaded) {
      return [];
    }

    // If roles are still loading, show basic items only
    if (isInitializing || !currentRole) {
      return allNavItems
        .filter(item => (item.alwaysShow || item.priority <= 2) && canAccessRoute(item.url))
        .sort((a, b) => a.priority - b.priority);
    }

    // Filter based on current role, authentication, and route access
    return allNavItems
      .filter(item => {
        const hasRoleAccess = item.alwaysShow || (currentRole && item.roles.includes(currentRole));
        const hasRouteAccess = canAccessRoute(item.url);
        return hasRoleAccess && hasRouteAccess;
      })
      .sort((a, b) => a.priority - b.priority);
  }, [currentRole, isInitializing, navIsAuthenticated, isAuthLoaded, canAccessRoute])

  // Loading state for menu items
  const isMenuLoading = isInitializing && isAuthenticated && !!profile

  const handleSignOut = async () => {
    await signOut()
  }

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return currentPath === "/" || currentPath === "/dashboard"
    }
    return currentPath.startsWith(path)
  }

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
  }

  // Don't render sidebar if not authenticated
  if (!navIsAuthenticated && isAuthLoaded) {
    return null;
  }

  return (
    <SidebarErrorBoundary>
      <Sidebar className={`${collapsed ? "w-16" : "w-64"} transition-all duration-300`} collapsible="icon">
        <SidebarHeader className="p-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  {clinica?.nome ? clinica.nome.charAt(0).toUpperCase() : 'AC'}
                </span>
              </div>
              <div>
                <h2 className="text-sidebar-foreground font-semibold text-lg">
                  {clinica?.nome || 'Sua Clínica'}
                </h2>
                <p className="text-sidebar-foreground/60 text-xs">Sistema Médico</p>
              </div>
            </div>
          )}
          {collapsed && (
            <div className="flex justify-center">
              <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  {clinica?.nome ? clinica.nome.charAt(0).toUpperCase() : 'AC'}
                </span>
              </div>
            </div>
          )}
        </SidebarHeader>

        <SidebarContent className="px-3 py-4">
          {/* Search */}
          {!collapsed && (
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sidebar-foreground/50 h-4 w-4" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-9 bg-sidebar-accent/30 border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/50 focus:border-sidebar-ring"
                />
              </div>
            </div>
          )}

          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70 text-xs font-medium">
              {!collapsed ? "NAVEGAÇÃO" : ""}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {mainNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <OptimisticNavLink 
                        to={item.url} 
                        className={`${getNavClass(item.url)} flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200`}
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                        title={collapsed ? item.title : undefined}
                        optimistic={true}
                        preloadData={true}
                        showLoadingState={true}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="font-medium">{item.title}</span>}
                      </OptimisticNavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                
                {/* Show loading skeleton for additional menu items while roles are loading */}
                {isMenuLoading && !collapsed && (
                  <>
                    <SidebarMenuItem>
                      <div className="flex items-center gap-3 px-3 py-2">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <div className="flex items-center gap-3 px-3 py-2">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </SidebarMenuItem>
                  </>
                )}
                
                {/* Show loading indicator in collapsed mode */}
                {isMenuLoading && collapsed && (
                  <SidebarMenuItem>
                    <div className="flex items-center justify-center px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-sidebar-foreground/50" />
                    </div>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="p-3 border-t border-sidebar-border">
          <div className="space-y-2">
            <Button 
              variant="ghost" 
              size={collapsed ? "icon" : "sm"}
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title={collapsed ? "Configurações" : undefined}
            >
              <Settings className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Configurações</span>}
            </Button>
            
            <Button 
              variant="ghost" 
              size={collapsed ? "icon" : "sm"}
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title={collapsed ? "Sair" : undefined}
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Sair</span>}
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>
    </SidebarErrorBoundary>
  )
}