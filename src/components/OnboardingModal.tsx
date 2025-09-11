import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Users, User, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Database } from '@/integrations/supabase/types';

type UserRole = Database['public']['Enums']['user_role_type'];

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<'role-selection' | 'organization-setup'>('role-selection');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [organizationName, setOrganizationName] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const roleOptions = [
    {
      id: 'cliente',
      title: 'Cliente',
      description: 'Sou cliente e quero agendar procedimentos',
      icon: User,
      color: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
    },
    {
      id: 'profissionais',
      title: 'Profissional',
      description: 'Sou um profissional da área de estética',
      icon: Users,
      color: 'bg-green-50 border-green-200 hover:bg-green-100'
    },
    {
      id: 'proprietaria',
      title: 'Proprietária/o',
      description: 'Sou proprietária/o de uma clínica ou organização',
      icon: Crown,
      color: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
    }
  ];

  const handleRoleSelection = (roleId: string) => {
    setSelectedRole(roleId);
    if (roleId === 'proprietaria') {
      setStep('organization-setup');
    } else {
      handleRoleSubmit(roleId as UserRole);
    }
  };

  const handleRoleSubmit = async (role: UserRole) => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Atualizar role do usuário
      const { error } = await supabase
        .from('user_roles')
        .update({ role })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }

      toast.success('Perfil configurado com sucesso!');
      onClose();
      window.location.reload(); // Recarregar para atualizar contexto
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Erro ao configurar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrganizationSetup = async () => {
    if (!user || !organizationName) return;

    setIsLoading(true);
    try {
      // Criar organização
      const { data: organization, error: orgError } = await supabase
        .from('organizacoes')
        .insert({
          nome: organizationName,
          criado_por: user.id
        })
        .select()
        .single();

      if (orgError) {
        throw orgError;
      }

      let clinicId = null;
      if (clinicName) {
        // Criar clínica
        const { data: clinic, error: clinicError } = await supabase
          .from('clinicas')
          .insert({
            nome: clinicName,
            organizacao_id: organization.id,
            criado_por: user.id
          })
          .select()
          .single();

        if (clinicError) {
          throw clinicError;
        }
        clinicId = clinic.id;
      }

      // Atualizar role do usuário com organização
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({
          role: 'proprietaria',
          organizacao_id: organization.id,
          clinica_id: clinicId
        })
        .eq('user_id', user.id);

      if (roleError) {
        throw roleError;
      }

      toast.success('Organização criada com sucesso!');
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('Error setting up organization:', error);
      toast.error('Erro ao criar organização');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {step === 'role-selection' ? 'Configure seu perfil' : 'Configure sua organização'}
          </DialogTitle>
          <DialogDescription>
            {step === 'role-selection' 
              ? 'Selecione como você pretende usar o sistema'
              : 'Crie sua organização e clínica para começar'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'role-selection' && (
          <div className="grid gap-4">
            {roleOptions.map((option) => (
              <Card 
                key={option.id}
                className={`cursor-pointer transition-colors ${option.color}`}
                onClick={() => handleRoleSelection(option.id)}
              >
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                  <option.icon className="h-6 w-6 mr-3" />
                  <div>
                    <CardTitle className="text-lg">{option.title}</CardTitle>
                    <CardDescription>{option.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}

        {step === 'organization-setup' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="organizationName">Nome da Organização *</Label>
              <Input
                id="organizationName"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Ex: Clínica Beleza & Estética"
              />
            </div>
            
            <div>
              <Label htmlFor="clinicName">Nome da Clínica (opcional)</Label>
              <Input
                id="clinicName"
                value={clinicName}
                onChange={(e) => setClinicName(e.target.value)}
                placeholder="Ex: Unidade Centro"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('role-selection')}
                disabled={isLoading}
              >
                Voltar
              </Button>
              <Button
                onClick={handleOrganizationSetup}
                disabled={!organizationName || isLoading}
                className="flex-1"
              >
                {isLoading ? 'Criando...' : 'Criar Organização'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}