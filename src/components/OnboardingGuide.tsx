import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Building2, Users, Info } from 'lucide-react';

export function OnboardingGuide() {
  const { currentRole, profile } = useAuth();

  if (currentRole !== 'cliente' || !profile?.primeiro_acesso) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bem-vindo ao Sistema!</CardTitle>
          <CardDescription>
            Você foi registrado como <Badge variant="secondary">Cliente</Badge>. 
            Veja abaixo as opções disponíveis:
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Sou Proprietário</CardTitle>
                </div>
                <CardDescription>
                  Quero criar minha organização e gerenciar clínicas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Solicitar Upgrade para Proprietário
                </Button>
              </CardContent>
            </Card>
            
            <Card className="border-secondary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-secondary" />
                  <CardTitle className="text-lg">Sou Profissional</CardTitle>
                </div>
                <CardDescription>
                  Trabalho em uma clínica e preciso de acesso aos prontuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Aguardar Convite da Clínica
                </Button>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium">Como cliente, você pode:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Agendar consultas nas clínicas</li>
                  <li>• Visualizar seus prontuários médicos</li>
                  <li>• Acompanhar seu histórico de atendimentos</li>
                  <li>• Gerenciar seus dados pessoais</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <Button variant="ghost" className="text-muted-foreground">
              Continuar como Cliente
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}