/**
 * 🍞 AUTHENTICATION-AWARE BREADCRUMBS
 * 
 * Breadcrumb component that only shows navigation for authenticated users
 * and provides contextual navigation based on current route
 */

import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useNavigation } from "@/contexts/NavigationContext";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/agendamento': 'Agendamento',
  '/clientes': 'Clientes',
  '/servicos': 'Serviços',
  '/produtos': 'Produtos',
  '/equipamentos': 'Equipamentos',
  '/financeiro': 'Financeiro',
  '/comunicacao': 'Comunicação',
  '/prontuarios': 'Prontuários',
  '/executivo': 'Dashboard Executivo',
  '/alertas': 'Alertas',
  '/perfil': 'Perfil'
};

export function AuthAwareBreadcrumbs() {
  const location = useLocation();
  const { isAuthenticated, isAuthLoaded, canAccessRoute } = useNavigation();

  // Don't render breadcrumbs for unauthenticated users
  if (!isAuthenticated && isAuthLoaded) {
    return null;
  }

  // Don't render on landing page
  if (location.pathname === '/') {
    return null;
  }

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbItems: BreadcrumbItem[] = [];

  // Add home/dashboard as first item for authenticated users
  if (isAuthenticated) {
    breadcrumbItems.push({
      label: 'Dashboard',
      href: '/dashboard',
      icon: Home
    });
  }

  // Build breadcrumb path
  let currentPath = '';
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Only add breadcrumb if user can access the route
    if (canAccessRoute(currentPath)) {
      const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      breadcrumbItems.push({
        label,
        href: index === pathSegments.length - 1 ? undefined : currentPath // Don't link current page
      });
    }
  });

  // Don't render if only one item (current page)
  if (breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
      {breadcrumbItems.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 mx-2 text-muted-foreground/50" />
          )}
          
          {item.href ? (
            <Link
              to={item.href}
              className="flex items-center hover:text-foreground transition-colors"
            >
              {item.icon && index === 0 && (
                <item.icon className="h-4 w-4 mr-1" />
              )}
              {item.label}
            </Link>
          ) : (
            <span className="flex items-center text-foreground font-medium">
              {item.icon && index === 0 && (
                <item.icon className="h-4 w-4 mr-1" />
              )}
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}