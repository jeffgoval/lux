import { Cliente, ClienteMetricas } from '@/types/cliente';

export const mockClientes: Cliente[] = [
  {
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
    alergias: [
      {
        tipo: 'Medicamento',
        descricao: 'Penicilina',
        gravidade: 'grave'
      }
    ],
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
    historico: [
      {
        id: '1',
        data: new Date('2024-01-05'),
        profissional: 'Dra. Ana Silva',
        procedimentos: ['Botox', 'Preenchimento'],
        produtos: ['Botox Allergan', 'Ácido Hialurônico'],
        valor: 2500,
        formaPagamento: 'Cartão de Crédito',
        satisfacao: 10,
        observacoes: 'Resultado excelente, cliente muito satisfeita',
        recomendacoes: ['Retorno em 6 meses']
      }
    ]
  },
  {
    id: '2',
    nome: 'Ana Costa Ribeiro',
    cpf: '987.654.321-00',
    rg: '98.765.432-1',
    dataNascimento: new Date('1990-07-22'),
    foto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    telefone: '(11) 88888-8888',
    email: 'ana.costa@email.com',
    endereco: {
      cep: '04567-890',
      rua: 'Avenida Paulista',
      numero: '1000',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      estado: 'SP'
    },
    preferenciasContato: ['email', 'sms'],
    comoNosConheceu: 'Indicação de amiga',
    dataRegistro: new Date('2023-06-10'),
    tipoPele: 'oleosa',
    alergias: [],
    condicoesMedicas: [
      {
        nome: 'Rosácea',
        descricao: 'Rosácea facial leve',
        controlada: true
      }
    ],
    medicamentos: [],
    cirurgiasPrevia: [],
    objetivosEsteticos: ['Tratamento de acne', 'Limpeza de pele'],
    contraindicacoes: [],
    perfilConsumo: 'moderado',
    sensibilidadePreco: 'media',
    frequenciaIdeal: 30,
    sazonalidade: [],
    preferencasHorario: ['tarde'],
    profissionaisPreferidos: ['Marina Costa'],
    categoria: 'ativo',
    tags: [
      { id: '3', nome: 'Indicadora', cor: '#8B5CF6', categoria: 'comercial' },
      { id: '4', nome: 'Pele Oleosa', cor: '#F59E0B', categoria: 'preferencia' }
    ],
    ltv: 3600,
    frequencia: 12,
    ultimoAtendimento: new Date('2024-01-10'),
    nps: 9,
    historico: [
      {
        id: '2',
        data: new Date('2024-01-10'),
        profissional: 'Marina Costa',
        procedimentos: ['Limpeza de Pele Profunda'],
        produtos: ['Peeling Químico', 'Hidratante'],
        valor: 300,
        formaPagamento: 'PIX',
        satisfacao: 9,
        observacoes: 'Pele reagiu bem ao tratamento'
      }
    ]
  },
  {
    id: '3',
    nome: 'Carla Mendes Lima',
    cpf: '456.789.123-45',
    rg: '45.678.912-3',
    dataNascimento: new Date('1982-11-08'),
    foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    telefone: '(11) 77777-7777',
    email: 'carla.mendes@email.com',
    endereco: {
      cep: '02345-678',
      rua: 'Rua Oscar Freire',
      numero: '500',
      bairro: 'Jardins',
      cidade: 'São Paulo',
      estado: 'SP'
    },
    preferenciasContato: ['whatsapp'],
    comoNosConheceu: 'Google',
    dataRegistro: new Date('2022-03-20'),
    tipoPele: 'seca',
    alergias: [],
    condicoesMedicas: [],
    medicamentos: ['Colágeno'],
    cirurgiasPrevia: [
      {
        nome: 'Rinoplastia',
        data: new Date('2020-05-15'),
        tipo: 'estetica'
      }
    ],
    objetivosEsteticos: ['Anti-aging', 'Hidratação facial'],
    contraindicacoes: [],
    perfilConsumo: 'conservador',
    sensibilidadePreco: 'alta',
    frequenciaIdeal: 60,
    sazonalidade: ['Inverno'],
    preferencasHorario: ['manha', 'tarde'],
    profissionaisPreferidos: ['Dr. Carlos Santos'],
    categoria: 'risco',
    tags: [
      { id: '5', nome: 'Em Risco', cor: '#EF4444', categoria: 'comercial' },
      { id: '6', nome: 'Pele Seca', cor: '#06B6D4', categoria: 'preferencia' }
    ],
    ltv: 8900,
    frequencia: 15,
    ultimoAtendimento: new Date('2023-08-15'),
    nps: 7,
    historico: [
      {
        id: '3',
        data: new Date('2023-08-15'),
        profissional: 'Dr. Carlos Santos',
        procedimentos: ['Hydrafacial'],
        produtos: ['Soro Hidratante', 'Protetor Solar'],
        valor: 450,
        formaPagamento: 'Dinheiro',
        satisfacao: 7
      }
    ]
  },
  {
    id: '4',
    nome: 'Juliana Oliveira',
    cpf: '789.123.456-78',
    rg: '78.912.345-6',
    dataNascimento: new Date('1995-09-12'),
    foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
    telefone: '(11) 66666-6666',
    email: 'juliana.oliveira@email.com',
    endereco: {
      cep: '03456-789',
      rua: 'Rua Augusta',
      numero: '800',
      bairro: 'Consolação',
      cidade: 'São Paulo',
      estado: 'SP'
    },
    preferenciasContato: ['email', 'whatsapp'],
    comoNosConheceu: 'Indicação',
    dataRegistro: new Date('2024-01-20'),
    tipoPele: 'sensivel',
    alergias: [
      {
        tipo: 'Cosmético',
        descricao: 'Fragrância',
        gravidade: 'leve'
      }
    ],
    condicoesMedicas: [],
    medicamentos: [],
    cirurgiasPrevia: [],
    objetivosEsteticos: ['Primeiro procedimento', 'Consultoria'],
    contraindicacoes: ['Produtos com fragrância'],
    perfilConsumo: 'conservador',
    sensibilidadePreco: 'media',
    frequenciaIdeal: 90,
    sazonalidade: [],
    preferencasHorario: ['noite'],
    profissionaisPreferidos: [],
    categoria: 'novo',
    tags: [
      { id: '7', nome: 'Novo Cliente', cor: '#22C55E', categoria: 'comercial' },
      { id: '8', nome: 'Pele Sensível', cor: '#F97316', categoria: 'preferencia' }
    ],
    ltv: 200,
    frequencia: 1,
    ultimoAtendimento: new Date('2024-01-20'),
    nps: 8,
    historico: [
      {
        id: '4',
        data: new Date('2024-01-20'),
        profissional: 'Marina Costa',
        procedimentos: ['Consultoria'],
        produtos: [],
        valor: 0,
        formaPagamento: 'Gratuito',
        satisfacao: 8,
        observacoes: 'Primeira consulta, cliente interessada em tratamentos suaves'
      }
    ]
  }
];

export const mockMetricas: ClienteMetricas = {
  totalClientes: 127,
  ltvMedio: 6850,
  taxaRetencao: 84.2,
  npsMedio: 8.7,
  novosMes: 12,
  crescimento: 15.3
};