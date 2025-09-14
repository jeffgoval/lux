import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { Prontuario, StatusProntuario } from "@/types/prontuario";

interface ProntuarioFormProps {
  prontuario?: Prontuario;
  onSalvar: (prontuario: Prontuario) => void;
  onCancelar: () => void;
}

export function ProntuarioForm({ prontuario, onSalvar, onCancelar }: ProntuarioFormProps) {
  const [formData, setFormData] = useState({
    cliente_id: prontuario?.cliente_id || "",
    medico_responsavel_id: prontuario?.medico_responsavel_id || "",
    numero_prontuario: prontuario?.numero_prontuario || `PRN-${Date.now()}`,
    status: (prontuario?.status || "ativo") as StatusProntuario,
    anamnese: "",
    historico_medico: "",
    medicamentos_atuais: "",
    alergias: "",
    contraindicacoes: ""
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente_id || !formData.medico_responsavel_id) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setLoading(true);
    
    try {
      // Simular criação do prontuário
      const novoProntuario: Prontuario = {
        id: prontuario?.id || `prontuario-${Date.now()}`,
        cliente_id: formData.cliente_id,
        medico_responsavel_id: formData.medico_responsavel_id,
        numero_prontuario: formData.numero_prontuario,
        status: formData.status,
        anamnese_criptografada: formData.anamnese,
        historico_medico_criptografado: formData.historico_medico,
        medicamentos_atuais_criptografado: formData.medicamentos_atuais,
        alergias_criptografado: formData.alergias,
        contraindicacoes_criptografado: formData.contraindicacoes,
        criado_em: prontuario?.criado_em || new Date().toISOString(),
        atualizado_em: new Date().toISOString(),
        criado_por: prontuario?.criado_por || "user-id",
        atualizado_por: "user-id",
        versao: (prontuario?.versao || 0) + 1,
        hash_integridade: `hash-${Date.now()}`
      };

      onSalvar(novoProntuario);
    } catch (error) {

      toast.error('Erro ao salvar prontuário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados Básicos</CardTitle>
          <CardDescription>
            Informações básicas do prontuário médico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cliente_id">Cliente ID *</Label>
              <Input
                id="cliente_id"
                value={formData.cliente_id}
                onChange={(e) => setFormData({...formData, cliente_id: e.target.value})}
                placeholder="ID do cliente"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="medico_responsavel_id">Médico Responsável ID *</Label>
              <Input
                id="medico_responsavel_id"
                value={formData.medico_responsavel_id}
                onChange={(e) => setFormData({...formData, medico_responsavel_id: e.target.value})}
                placeholder="ID do médico responsável"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero_prontuario">Número do Prontuário</Label>
              <Input
                id="numero_prontuario"
                value={formData.numero_prontuario}
                onChange={(e) => setFormData({...formData, numero_prontuario: e.target.value})}
                placeholder="Número único do prontuário"
                readOnly
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value: StatusProntuario) => setFormData({...formData, status: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                  <SelectItem value="transferido">Transferido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados Médicos</CardTitle>
          <CardDescription>
            Informações médicas do paciente (dados criptografados)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="anamnese">Anamnese</Label>
            <Textarea
              id="anamnese"
              value={formData.anamnese}
              onChange={(e) => setFormData({...formData, anamnese: e.target.value})}
              placeholder="Histórico clínico e queixa principal do paciente..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="historico_medico">Histórico Médico</Label>
            <Textarea
              id="historico_medico"
              value={formData.historico_medico}
              onChange={(e) => setFormData({...formData, historico_medico: e.target.value})}
              placeholder="Histórico de doenças, cirurgias e tratamentos anteriores..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="medicamentos_atuais">Medicamentos em Uso</Label>
            <Textarea
              id="medicamentos_atuais"
              value={formData.medicamentos_atuais}
              onChange={(e) => setFormData({...formData, medicamentos_atuais: e.target.value})}
              placeholder="Liste os medicamentos atualmente em uso pelo paciente..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="alergias">Alergias</Label>
              <Textarea
                id="alergias"
                value={formData.alergias}
                onChange={(e) => setFormData({...formData, alergias: e.target.value})}
                placeholder="Alergias conhecidas..."
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contraindicacoes">Contraindicações</Label>
              <Textarea
                id="contraindicacoes"
                value={formData.contraindicacoes}
                onChange={(e) => setFormData({...formData, contraindicacoes: e.target.value})}
                placeholder="Contraindicações para procedimentos..."
                rows={3}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando..." : prontuario ? "Atualizar" : "Criar Prontuário"}
        </Button>
      </div>
    </form>
  );
}
