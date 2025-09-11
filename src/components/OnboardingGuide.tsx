import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { UserPlus, Building2, Users } from 'lucide-react';
import { toast } from 'sonner';

export function OnboardingGuide() {
  const { currentRole, profile } = useAuth();

  if (currentRole !== 'visitante' || !profile?.primeiro_acesso) {
    return null;
  }

  const handleProprietarioClick = () => {
    toast.info('Funcionalidade em desenvolvimento', {
      description: 'Em breve você poderá criar sua organização e gerenciar clínicas.'
    });
  };

  const handleProfissionalClick = () => {
    toast.info('Aguarde o convite da clínica', {
      description: 'Entre em contato com a clínica onde trabalha para receber o convite de acesso.'
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Bem-vindo ao Sistema!</CardTitle>
          <CardDescription>
            Você foi registrado como <Badge variant="secondary">Visitante</Badge>. 
            Para continuar, escolha seu tipo de perfil:
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
                <Button className="w-full" onClick={handleProprietarioClick}>
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
                <Button className="w-full" onClick={handleProfissionalClick}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Aguardar Convite da Clínica
                </Button>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}