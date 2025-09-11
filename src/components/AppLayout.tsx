import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./AppSidebar"
import { Bell, User } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
}

export function AppLayout({ children, title }: AppLayoutProps) {
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
                
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <User className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>
          
          {/* Main content */}
          <div className="flex-1 p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}