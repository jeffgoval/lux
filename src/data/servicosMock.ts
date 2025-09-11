import { Servico, CategoriaInfo, ServicoMetricas } from '@/types/servico';

export const categorias: CategoriaInfo[] = [
  {
    id: 'facial',
    nome: 'Facial',
    descricao: 'Tratamentos faciais e rejuvenescimento',
    cor: 'hsl(220, 70%, 50%)',
    icone: '👤',
    ativa: true
  },
  {
    id: 'corporal',
    nome: 'Corporal',
    descricao: 'Modelagem e tratamentos corporais',
    cor: 'hsl(280, 70%, 50%)',
    icone: '🫐',
    ativa: true
  },
  {
    id: 'capilar',
    nome: 'Capilar',
    descricao: 'Tratamentos capilares e couro cabeludo',
    cor: 'hsl(160, 70%, 50%)',
    icone: '💇',
    ativa: true
  },
  {
    id: 'estetica_avancada',
    nome: 'Estética Avançada',
    descricao: 'Procedimentos com tecnologia avançada',
    cor: 'hsl(350, 70%, 50%)',
    icone: '⚡',
    ativa: true
  },
  {
    id: 'wellness',
    nome: 'Wellness',
    descricao: 'Bem-estar e relaxamento',
    cor: 'hsl(120, 70%, 50%)',
    icone: '🧘',
    ativa: true
  },
  {
    id: 'masculino',
    nome: 'Masculino',
    descricao: 'Tratamentos específicos masculinos',
    cor: 'hsl(200, 70%, 50%)',
    icone: '👨',
    ativa: true
  }
];

export const servicosMock: Servico[] = [
  {
    id: '1',
    nome: 'Limpeza de Pele Profunda',
    nomeTecnico: 'Higienização Facial Especializada',
    codigoInterno: 'LPF001',
    categoria: 'facial',
    subcategoria: 'limpeza',
    status: 'ativo',
    dataLancamento: new Date('2023-01-15'),
    
    descricaoComercial: 'Limpeza profunda que remove impurezas e deixa a pele renovada e radiante.',
    descricaoTecnica: 'Procedimento de higienização facial com extração de comedões, aplicação de máscaras específicas e finalização com protetor solar.',
    descricaoDetalhada: 'Tratamento completo que inclui análise de pele, limpeza com produtos específicos para cada tipo de pele, extração manual de cravos e espinhas, aplicação de máscara calmante e hidratante, finalizado com protetor solar.',
    beneficios: [
      'Remove impurezas profundas',
      'Desobstrui os poros',
      'Melhora a textura da pele',
      'Previne o envelhecimento',
      'Aumenta a absorção de produtos'
    ],
    indicacoes: [
      'Pele oleosa com comedões',
      'Pele mista com zona T oleosa',
      'Pele com poros dilatados',
      'Preparação para outros tratamentos'
    ],
    contraindicacoes: [
      {
        condicao: 'Lesões ativas na pele',
        tipo: 'absoluta',
        observacoes: 'Aguardar cicatrização completa'
      },
      {
        condicao: 'Uso de ácidos há menos de 7 dias',
        tipo: 'relativa',
        observacoes: 'Avaliar sensibilidade da pele'
      }
    ],
    
    imagemPrincipal: '/api/placeholder/400/300',
    galeria: [
      {
        id: '1',
        url: '/api/placeholder/300/200',
        tipo: 'antes_depois',
        titulo: 'Resultado após limpeza',
        principal: true
      },
      {
        id: '2',
        url: '/api/placeholder/300/200',
        tipo: 'procedimento',
        titulo: 'Durante o procedimento'
      }
    ],
    icone: '✨',
    corTema: 'hsl(220, 70%, 50%)',
    
    duracaoPadrao: 60,
    duracaoMinima: 45,
    duracaoMaxima: 90,
    tempoSetup: 10,
    tempoLimpeza: 15,
    intervaloBetweenAtendimentos: 25,
    
    equipamentosNecessarios: [
      {
        nome: 'Vapor de ozônio',
        obrigatorio: true
      },
      {
        nome: 'Extrator de comedões',
        obrigatorio: true
      },
      {
        nome: 'Lupa com lâmpada',
        obrigatorio: false,
        alternativas: ['Lupa simples']
      }
    ],
    produtosUtilizados: [
      {
        nome: 'Gel de limpeza',
        quantidade: '10ml',
        custo: 5.50,
        obrigatorio: true
      },
      {
        nome: 'Tônico facial',
        quantidade: '5ml',
        custo: 3.20,
        obrigatorio: true
      },
      {
        nome: 'Máscara calmante',
        quantidade: '15ml',
        custo: 8.00,
        obrigatorio: true
      },
      {
        nome: 'Protetor solar FPS 60',
        quantidade: '3ml',
        custo: 4.50,
        obrigatorio: true
      }
    ],
    salaRequerida: 'Cabine facial padrão',
    profissionaisHabilitados: ['Esteticista', 'Cosmetólogo'],
    
    tipoSessao: 'unica',
    
    precoBase: 120.00,
    custoProdutos: 21.20,
    margemLucro: 82.33,
    
    nivelComplexidade: 'basico',
    tags: [
      {
        id: '1',
        nome: 'Pele oleosa',
        cor: 'hsl(220, 70%, 50%)',
        categoria: 'publico'
      },
      {
        id: '2',
        nome: 'Cravos',
        cor: 'hsl(40, 70%, 50%)',
        categoria: 'procedimento'
      }
    ],
    generoRecomendado: 'todos',
    
    popularidade: 95,
    satisfacaoMedia: 4.8,
    tempoMedioExecucao: 55,
    taxaRecomendacao: 92,
    
    sazonal: false,
    
    criadoEm: new Date('2023-01-15'),
    atualizadoEm: new Date('2024-12-10'),
    criadoPor: 'Sistema',
    versao: 1
  },
  {
    id: '2',
    nome: 'Peeling Químico Superficial',
    nomeTecnico: 'Esfoliação Química com Ácidos AHA/BHA',
    codigoInterno: 'PQS002',
    categoria: 'facial',
    subcategoria: 'rejuvenescimento',
    status: 'ativo',
    dataLancamento: new Date('2023-03-20'),
    
    descricaoComercial: 'Renovação celular que revela uma pele mais jovem, uniforme e luminosa.',
    descricaoTecnica: 'Aplicação controlada de ácidos para promover esfoliação e renovação celular superficial.',
    beneficios: [
      'Reduz manchas superficiais',
      'Melhora textura da pele',
      'Estimula renovação celular',
      'Uniformiza o tom',
      'Reduz poros dilatados'
    ],
    indicacoes: [
      'Manchas de melasma leve',
      'Fotoenvelhecimento inicial',
      'Cicatrizes superficiais de acne',
      'Pele sem brilho'
    ],
    contraindicacoes: [
      {
        condicao: 'Gravidez e amamentação',
        tipo: 'absoluta'
      },
      {
        condicao: 'Exposição solar recente',
        tipo: 'absoluta',
        observacoes: 'Mínimo 15 dias sem exposição'
      }
    ],
    
    imagemPrincipal: '/api/placeholder/400/300',
    galeria: [
      {
        id: '3',
        url: '/api/placeholder/300/200',
        tipo: 'antes_depois',
        titulo: 'Redução de manchas',
        principal: true
      }
    ],
    corTema: 'hsl(350, 70%, 50%)',
    
    duracaoPadrao: 45,
    duracaoMinima: 30,
    duracaoMaxima: 60,
    tempoSetup: 15,
    tempoLimpeza: 10,
    intervaloBetweenAtendimentos: 25,
    
    equipamentosNecessarios: [
      {
        nome: 'Neutralizador de ácidos',
        obrigatorio: true
      }
    ],
    produtosUtilizados: [
      {
        nome: 'Solução de ácido glicólico 30%',
        quantidade: '2ml',
        custo: 15.00,
        obrigatorio: true
      },
      {
        nome: 'Neutralizador',
        quantidade: '5ml',
        custo: 3.50,
        obrigatorio: true
      }
    ],
    profissionaisHabilitados: ['Esteticista avançada', 'Dermatologista'],
    
    tipoSessao: 'multiplas',
    numeroSessoesRecomendadas: 4,
    intervaloEntreSessoes: 15,
    
    precoBase: 180.00,
    custoProdutos: 18.50,
    margemLucro: 89.72,
    
    nivelComplexidade: 'avancado',
    tags: [
      {
        id: '3',
        nome: 'Manchas',
        cor: 'hsl(350, 70%, 50%)',
        categoria: 'procedimento'
      },
      {
        id: '4',
        nome: 'Anti-idade',
        cor: 'hsl(280, 70%, 50%)',
        categoria: 'procedimento'
      }
    ],
    idadeMinima: 18,
    
    popularidade: 78,
    satisfacaoMedia: 4.6,
    
    sazonal: true,
    mesesBaixa: [12, 1, 2], // Verão - menos procurado
    mesesAlta: [5, 6, 7, 8, 9], // Outono/Inverno - mais procurado
    
    criadoEm: new Date('2023-03-20'),
    atualizadoEm: new Date('2024-12-10'),
    criadoPor: 'Dr. Silva',
    versao: 2
  },
  {
    id: '3',
    nome: 'Drenagem Linfática Facial',
    nomeTecnico: 'Massagem de Drenagem do Sistema Linfático Facial',
    codigoInterno: 'DLF003',
    categoria: 'facial',
    subcategoria: 'relaxamento',
    status: 'ativo',
    dataLancamento: new Date('2023-02-10'),
    
    descricaoComercial: 'Massagem relaxante que reduz inchaço e melhora a circulação facial.',
    descricaoTecnica: 'Técnica manual específica para estimular o sistema linfático facial.',
    beneficios: [
      'Reduz edemas faciais',
      'Melhora circulação',
      'Efeito relaxante',
      'Prepara para outros tratamentos'
    ],
    indicacoes: [
      'Retenção de líquidos facial',
      'Pós-procedimentos estéticos',
      'Estresse e tensão facial'
    ],
    contraindicacoes: [
      {
        condicao: 'Infecções ativas',
        tipo: 'absoluta'
      }
    ],
    
    imagemPrincipal: '/api/placeholder/400/300',
    galeria: [],
    corTema: 'hsl(120, 70%, 50%)',
    
    duracaoPadrao: 40,
    duracaoMinima: 30,
    duracaoMaxima: 50,
    tempoSetup: 5,
    tempoLimpeza: 5,
    intervaloBetweenAtendimentos: 10,
    
    equipamentosNecessarios: [],
    produtosUtilizados: [
      {
        nome: 'Óleo para massagem',
        quantidade: '5ml',
        custo: 4.00,
        obrigatorio: true
      }
    ],
    profissionaisHabilitados: ['Esteticista', 'Massoterapeuta'],
    
    tipoSessao: 'unica',
    
    precoBase: 90.00,
    custoProdutos: 4.00,
    margemLucro: 95.56,
    
    nivelComplexidade: 'basico',
    tags: [
      {
        id: '5',
        nome: 'Relaxamento',
        cor: 'hsl(120, 70%, 50%)',
        categoria: 'procedimento'
      }
    ],
    
    popularidade: 65,
    satisfacaoMedia: 4.9,
    
    sazonal: false,
    
    criadoEm: new Date('2023-02-10'),
    atualizadoEm: new Date('2024-12-10'),
    criadoPor: 'Sistema',
    versao: 1
  },
  {
    id: '4',
    nome: 'Radiofrequência Corporal',
    nomeTecnico: 'Termoterapia por Radiofrequência Monopolar',
    codigoInterno: 'RFC004',
    categoria: 'corporal',
    subcategoria: 'modelagem',
    status: 'ativo',
    dataLancamento: new Date('2023-04-15'),
    
    descricaoComercial: 'Tecnologia avançada que promove firmeza e redução de medidas corporais.',
    descricaoTecnica: 'Aplicação de energia eletromagnética para aquecimento controlado do tecido subcutâneo.',
    beneficios: [
      'Firmeza da pele',
      'Redução de flacidez',
      'Melhora da circulação',
      'Estímulo ao colágeno'
    ],
    indicacoes: [
      'Flacidez corporal',
      'Pós-parto',
      'Perda de peso',
      'Envelhecimento cutâneo'
    ],
    contraindicacoes: [
      {
        condicao: 'Gravidez',
        tipo: 'absoluta'
      },
      {
        condicao: 'Marca-passo',
        tipo: 'absoluta'
      }
    ],
    
    imagemPrincipal: '/api/placeholder/400/300',
    galeria: [],
    corTema: 'hsl(280, 70%, 50%)',
    
    duracaoPadrao: 60,
    duracaoMinima: 45,
    duracaoMaxima: 75,
    tempoSetup: 15,
    tempoLimpeza: 10,
    intervaloBetweenAtendimentos: 25,
    
    equipamentosNecessarios: [
      {
        nome: 'Aparelho de Radiofrequência',
        obrigatorio: true
      }
    ],
    produtosUtilizados: [
      {
        nome: 'Gel condutor',
        quantidade: '30ml',
        custo: 8.00,
        obrigatorio: true
      }
    ],
    profissionaisHabilitados: ['Fisioterapeuta', 'Esteticista especializada'],
    
    tipoSessao: 'multiplas',
    numeroSessoesRecomendadas: 8,
    intervaloEntreSessoes: 7,
    
    precoBase: 250.00,
    custoProdutos: 8.00,
    margemLucro: 96.80,
    
    nivelComplexidade: 'premium',
    tags: [
      {
        id: '6',
        nome: 'Firmeza',
        cor: 'hsl(280, 70%, 50%)',
        categoria: 'procedimento'
      },
      {
        id: '7',
        nome: 'Tecnologia',
        cor: 'hsl(350, 70%, 50%)',
        categoria: 'procedimento'
      }
    ],
    
    popularidade: 82,
    satisfacaoMedia: 4.4,
    
    sazonal: true,
    mesesAlta: [9, 10, 11, 12, 1, 2], // Preparação para verão
    
    criadoEm: new Date('2023-04-15'),
    atualizadoEm: new Date('2024-12-10'),
    criadoPor: 'Dr. Santos',
    versao: 1
  },
  {
    id: '5',
    nome: 'Massagem Relaxante',
    nomeTecnico: 'Massoterapia de Relaxamento Muscular',
    codigoInterno: 'MR005',
    categoria: 'wellness',
    subcategoria: 'relaxamento',
    status: 'ativo',
    dataLancamento: new Date('2023-01-05'),
    
    descricaoComercial: 'Momento de paz e renovação através da massagem terapêutica.',
    descricaoTecnica: 'Técnicas manuais para alívio de tensões musculares e promoção do bem-estar.',
    beneficios: [
      'Alívio do estresse',
      'Relaxamento muscular',
      'Melhora do sono',
      'Sensação de bem-estar'
    ],
    indicacoes: [
      'Estresse do dia a dia',
      'Tensões musculares',
      'Insônia',
      'Ansiedade'
    ],
    contraindicacoes: [
      {
        condicao: 'Lesões musculares agudas',
        tipo: 'relativa'
      }
    ],
    
    imagemPrincipal: '/api/placeholder/400/300',
    galeria: [],
    corTema: 'hsl(120, 70%, 50%)',
    
    duracaoPadrao: 50,
    duracaoMinima: 30,
    duracaoMaxima: 90,
    tempoSetup: 10,
    tempoLimpeza: 10,
    intervaloBetweenAtendimentos: 20,
    
    equipamentosNecessarios: [],
    produtosUtilizados: [
      {
        nome: 'Óleo de massagem relaxante',
        quantidade: '15ml',
        custo: 6.00,
        obrigatorio: true
      }
    ],
    profissionaisHabilitados: ['Massoterapeuta', 'Fisioterapeuta'],
    
    tipoSessao: 'unica',
    
    precoBase: 120.00,
    custoProdutos: 6.00,
    margemLucro: 95.00,
    
    nivelComplexidade: 'basico',
    tags: [
      {
        id: '8',
        nome: 'Bem-estar',
        cor: 'hsl(120, 70%, 50%)',
        categoria: 'procedimento'
      }
    ],
    generoRecomendado: 'todos',
    
    popularidade: 88,
    satisfacaoMedia: 4.9,
    
    sazonal: false,
    
    criadoEm: new Date('2023-01-05'),
    atualizadoEm: new Date('2024-12-10'),
    criadoPor: 'Sistema',
    versao: 1
  }
];

export const servicosMetricas: ServicoMetricas = {
  totalServicos: servicosMock.length,
  servicosAtivos: servicosMock.filter(s => s.status === 'ativo').length,
  receitaTotal: servicosMock.reduce((acc, s) => acc + (s.precoBase * s.popularidade / 10), 0),
  margemMedia: servicosMock.reduce((acc, s) => acc + s.margemLucro, 0) / servicosMock.length,
  servicoMaisPopular: servicosMock.sort((a, b) => b.popularidade - a.popularidade)[0]?.nome || 'N/A',
  crescimentoMensal: 12.5
};