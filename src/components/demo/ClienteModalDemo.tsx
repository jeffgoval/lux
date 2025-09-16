/**
 * Demo component to test the NovoClienteModal functionality
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { NovoClienteModal } from '@/components/modals/NovoClienteModal';
import { Cliente } from '@/types/cliente';

export const ClienteModalDemo: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [savedClientes, setSavedClientes] = useState<Cliente[]>([]);
  
  // Mock client data for edit test
  const mockCliente: Cliente = {
    id: '1',
    nome: 'Maria Silva Santos',
    cpf: '123.456.789-10',
    rg: '12.345.678-9',
    dataNascimento: new Date('1985-03-15'),
    foto: 'https://images.unsplash.com/photo-1494790108755-2616b72c5050?w=150&h=150&fit=crop&crop=face',
    telefone: '(11) 99999-9999',
    whatsapp: '(11) 99999-9999',
    email: 'maria.silva@email.com',
    endereco: {
      cep: '01234-567',
      rua: 'Rua das Flores',
      numero: '123',
      complemento: 'Apto 45',
      bairro: 'Jardim Europa',
      cidade: 'São Paulo',
      estado: 'SP'
    },
    redesSociais: {
      instagram: '@maria.silva'
    },
    preferenciasContato: ['whatsapp', 'email'],
    comoNosConheceu: 'Instagram',
    dataRegistro: new Date('2023-01-15'),
    tipoPele: 'mista',
    alergias: [],
    condicoesMedicas: [],
    medicamentos: ['Vitamina D'],
    cirurgiasPrevia: [],
    objetivosEsteticos: ['Rejuvenescimento facial', 'Harmonização'],
    contraindicacoes: ['Procedimentos com anestesia'],
    perfilConsumo: 'inovador',
    sensibilidadePreco: 'baixa',
    frequenciaIdeal: 45,
    sazonalidade: ['Verão', 'Dezembro'],
    preferencasHorario: ['manha'],
    profissionaisPreferidos: ['Dra. Ana Silva'],
    categoria: 'vip',
    tags: [
      { id: '1', nome: 'VIP', cor: '#FFD700', categoria: 'comercial' },
      { id: '2', nome: 'Pontual', cor: '#10B981', categoria: 'comportamental' }
    ],
    ltv: 15000,
    frequencia: 8,
    ultimoAtendimento: new Date('2024-01-05'),
    proximoAgendamento: new Date('2024-02-20'),
    nps: 10,
    historico: []
  };

  const handleSuccess = (cliente: Cliente) => {
    console.log('Cliente salvo com sucesso:', cliente);
    setSavedClientes(prev => {
      const existing = prev.find(c => c.id === cliente.id);
      if (existing) {
        return prev.map(c => c.id === cliente.id ? cliente : c);
      }
      return [...prev, cliente];
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Demo - Modal de Cliente</h2>
        <p className="text-muted-foreground">Teste o salvamento real de clientes com Appwrite</p>
      </div>
      
      <div className="space-x-4">
        <Button onClick={() => setModalOpen(true)}>
          Novo Cliente
        </Button>
        
        <Button variant="outline" onClick={() => setEditModalOpen(true)}>
          Editar Cliente (Mock)
        </Button>
      </div>

      {/* Lista de clientes salvos */}
      {savedClientes.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Clientes Salvos ({savedClientes.length})</h3>
          <div className="grid gap-4">
            {savedClientes.map((cliente) => (
              <div key={cliente.id} className="p-4 border rounded-lg bg-card">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{cliente.nome}</h4>
                    <p className="text-sm text-muted-foreground">{cliente.email}</p>
                    <p className="text-sm text-muted-foreground">{cliente.telefone}</p>
                    {cliente.categoria && (
                      <span className="inline-block mt-2 px-2 py-1 text-xs bg-primary/10 text-primary rounded">
                        {cliente.categoria}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    ID: {cliente.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Client Modal */}
      <NovoClienteModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
      />

      {/* Edit Client Modal */}
      <NovoClienteModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        cliente={mockCliente}
        isEdit={true}
        onSuccess={handleSuccess}
      />
    </div>
  );
};