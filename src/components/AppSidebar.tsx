import { CalendarDays, Users, Briefcase, Package, Wrench, DollarSign, MessageSquare, FileText, Home, Search, Settings, LogOut } from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { useClinica } from "@/hooks/useClinica"
import { Database } from "@/integrations/supabase/types"

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

// Navigation items with role permissions
const allNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    roles: ['super_admin', 'proprietaria', 'gerente', 'recepcionistas', 'profissionais', 'visitante'] as UserRole[]
  },
  {
    title: "Agendamento", 
    url: "/agendamento",
    icon: CalendarDays,
    roles: ['super_admin', 'proprietaria', 'gerente', 'recepcionistas'] as UserRole[]
  },
  {
    title: "Clientes",
    url: "/clientes",
    icon: Users,
    roles: ['super_admin', 'proprietaria', 'gerente', 'profissionais', 'recepcionistas'] as UserRole[]
  },
  {
    title: "Serviços",
    url: "/servicos",
    icon: Briefcase,
    roles: ['super_admin', 'proprietaria', 'gerente', 'profissionais'] as UserRole[]
  },
  {
    title: "Produtos",
    url: "/produtos",
    icon: Package,
    roles: ['super_admin', 'proprietaria', 'gerente'] as UserRole[]
  },
  {
    title: "Equipamentos",
    url: "/equipamentos",
    icon: Wrench,
    roles: ['super_admin', 'proprietaria', 'gerente'] as UserRole[]
  },
  {
    title: "Financeiro",
    url: "/financeiro",
    icon: DollarSign,
    roles: ['super_admin', 'proprietaria', 'gerente'] as UserRole[]
  },
  {
    title: "Comunicação",
    url: "/comunicacao",
    icon: MessageSquare,
    roles: ['super_admin', 'proprietaria', 'gerente', 'recepcionistas'] as UserRole[]
  },
  {
    title: "Prontuários",
    url: "/prontuarios",
    icon: FileText,
    roles: ['super_admin', 'proprietaria', 'gerente', 'profissionais'] as UserRole[]
  },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"
  const { currentRole, signOut } = useAuth()
  const { clinica } = useClinica()
  const location = useLocation()
  const currentPath = location.pathname

  // Filter navigation items based on user role
  const mainNavItems = allNavItems.filter(item => 
    currentRole && item.roles.includes(currentRole)
  )

  const handleSignOut = async () => {
    await signOut()
  }

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/"
    }
    return currentPath.startsWith(path)
  }

  const getNavClass = (path: string) => {
    return isActive(path) 
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
      : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
  }

  return (
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
                {clinica?.nome || 'AestheticCare'}
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
                    <NavLink 
                      to={item.url} 
                      className={`${getNavClass(item.url)} flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200`}
                      title={collapsed ? item.title : undefined}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="font-medium">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
  )
}