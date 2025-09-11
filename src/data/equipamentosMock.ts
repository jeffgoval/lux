import { Equipamento, ManutencaoEquipamento, FabricanteEquipamento, EquipamentoMetricas } from '@/types/equipamento';

export const fabricantesMock: FabricanteEquipamento[] = [
  {
    id: '1',
    nome: 'Ibramed',
    contato: 'Carlos Oliveira',
    telefone: '(11) 3333-1111',
    email: 'carlos@ibramed.com.br',
    suporteTecnico: '(11) 3333-9999',
    garantia: 24
  },
  {
    id: '2',
    nome: 'HTM',
    contato: 'Fernanda Lima',
    telefone: '(11) 3333-2222',
    email: 'fernanda@htm.com.br',
    suporteTecnico: '(11) 3333-8888',
    garantia: 36
  },
  {
    id: '3',
    nome: 'KLD',
    contato: 'Roberto Silva',
    telefone: '(11) 3333-3333',
    email: 'roberto@kld.com.br',
    suporteTecnico: '(11) 3333-7777',
    garantia: 24
  }
];

export const equipamentosMock: Equipamento[] = [
  {
    id: '1',
    nome: 'Laser Alexandrite Premium',
    modelo: 'LAX-2024',
    numeroSerie: 'LAX240001',
    tipo: 'laser',
    fabricante: fabricantesMock[0],
    dataCompra: new Date('2023-06-15'),
    valorCompra: 85000.00,
    valorAtual: 75000.00,
    localizacao: 'Sala 1',
    status: 'ativo',
    voltagem: '220V',
    potencia: '2000W',
    frequencia: '755nm',
    indicacoes: ['Depilação a laser', 'Remoção de manchas', 'Rejuvenescimento'],
    contraindicacoes: ['Gravidez', 'Pele bronzeada', 'Medicações fotossensibilizantes'],
    protocolos: ['Protocolo depilação facial', 'Protocolo manchas solares'],
    certificacoes: ['ANVISA', 'INMETRO', 'CE'],
    horasUso: 1250,
    manutencoes: [],
    usos: [],
    proximaManutencao: new Date('2024-12-15'),
    ultimaCalibracao: new Date('2024-09-15'),
    criadoEm: new Date('2023-06-15'),
    atualizadoEm: new Date('2024-09-15')
  },
  {
    id: '2',
    nome: 'Radiofrequência Multipolar',
    modelo: 'RFM-Pro',
    numeroSerie: 'RFM240002',
    tipo: 'radiofrequencia',
    fabricante: fabricantesMock[1],
    dataCompra: new Date('2023-08-20'),
    valorCompra: 32000.00,
    valorAtual: 28000.00,
    localizacao: 'Sala 2',
    status: 'ativo',
    voltagem: '110V',
    potencia: '300W',
    frequencia: '1MHz',
    indicacoes: ['Flacidez facial', 'Modelagem corporal', 'Celulite'],
    contraindicacoes: ['Marcapasso', 'Gravidez', 'Implantes metálicos'],
    protocolos: ['Protocolo facial lifting', 'Protocolo corporal'],
    certificacoes: ['ANVISA', 'FDA'],
    horasUso: 890,
    manutencoes: [],
    usos: [],
    proximaManutencao: new Date('2024-11-20'),
    ultimaCalibracao: new Date('2024-08-20'),
    criadoEm: new Date('2023-08-20'),
    atualizadoEm: new Date('2024-08-20')
  },
  {
    id: '3',
    nome: 'Microagulhamento Automático',
    modelo: 'MA-Digital',
    numeroSerie: 'MAD240003',
    tipo: 'microagulhamento',
    fabricante: fabricantesMock[2],
    dataCompra: new Date('2024-01-10'),
    valorCompra: 8500.00,
    valorAtual: 8000.00,
    localizacao: 'Sala 3',
    status: 'manutencao',
    voltagem: '220V',
    potencia: '50W',
    indicacoes: ['Rejuvenescimento', 'Cicatrizes de acne', 'Estrias'],
    contraindicacoes: ['Infecções ativas', 'Queloides', 'Anticoagulantes'],
    protocolos: ['Protocolo facial rejuvenescimento', 'Protocolo cicatrizes'],
    certificacoes: ['ANVISA', 'INMETRO'],
    horasUso: 245,
    manutencoes: [],
    usos: [],
    proximaManutencao: new Date('2024-10-10'),
    ultimaCalibracao: new Date('2024-07-10'),
    criadoEm: new Date('2024-01-10'),
    atualizadoEm: new Date('2024-07-10')
  }
];

export const equipamentoMetricasMock: EquipamentoMetricas = {
  totalEquipamentos: equipamentosMock.length,
  equipamentosAtivos: 2,
  equipamentosManutencao: 1,
  gastoManutencaoMensal: 1250.00,
  equipamentosMaisUtilizados: [
    { equipamento: equipamentosMock[0], horasUso: 1250 },
    { equipamento: equipamentosMock[1], horasUso: 890 },
    { equipamento: equipamentosMock[2], horasUso: 245 }
  ],
  proximasManutencoes: [],
  alertasManutencao: 2
};