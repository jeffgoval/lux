import type { Prontuario, SessaoAtendimento, ImagemMedica, AuditoriaMedica } from '@/types/prontuario';

// Mock data para prontuários
export const mockProntuarios: any[] = [
  {
    id: '1',
    numero_prontuario: 'PRONT-2025-000001',
    cliente_id: 'pac-001',
    medico_responsavel_id: 'med-001',
    status: 'ativo',
    nome_completo: 'Maria Silva Santos',
    cpf_criptografado: '***.***.***-**',
    data_nascimento_criptografado: '**/**/****',
    telefone_criptografado: '(**) *****-****',
    email_criptografado: 'm***@*****.com',
    anamnese: 'Paciente relata interesse em procedimentos estéticos faciais...',
    historico_medico: 'Sem histórico relevante de alergias ou cirurgias anteriores',
    medicamentos_atuais: 'Nenhum medicamento contínuo',
    alergias: 'Não apresenta alergias conhecidas',
    contraindicacoes: 'Nenhuma contraindicação identificada',
    hash_integridade: 'sha256:abc123...',
    versao: 1,
    nivel_confidencialidade: 'medico_responsavel',
    criado_em: '2025-01-15T10:30:00Z',
    atualizado_em: '2025-01-15T10:30:00Z',
    criado_por: 'user-001',
  }
];

// Mock data para sessões
export const mockSessoes: any[] = [
  {
    id: '1',
    prontuario_id: '1',
    data_atendimento: '2025-01-15T14:00:00Z',
    tipo_procedimento: 'botox_toxina',
    medico_responsavel_id: 'med-001',
    duracao_minutos: 60,
    procedimento_detalhes: {
      regioes_aplicacao: ['Testa', 'Glabela'],
      unidades_totais: 30,
      produto_utilizado: 'Botox Allergan'
    },
    observacoes_profissional: 'Aplicação realizada sem intercorrências',
    resultados_obtidos: 'Paciente satisfeita com resultado inicial',
    satisfacao_paciente: 5,
    valor_procedimento: 800,
    desconto_aplicado: 0,
    valor_final: 800,
    proxima_sessao_recomendada: '2025-04-15',
    hash_integridade: 'sha256:def456...',
    criado_em: '2025-01-15T14:00:00Z',
    atualizado_em: '2025-01-15T14:00:00Z',
    criado_por: 'med-001'
  }
];

// Mock data para imagens
export const mockImagens: any[] = [
  {
    id: '1',
    prontuario_id: '1',
    sessao_id: '1',
    nome_arquivo: 'antes_botox_testa.jpg',
    tipo_imagem: 'antes',
    caminho_storage: '/uploads/imagens/antes_botox_testa.jpg',
    url_publica: 'https://via.placeholder.com/300x200?text=Antes+Botox',
    tamanho_bytes: 2048576,
    dimensoes: '1920x1280',
    regiao_anatomica: 'Testa',
    procedimento_relacionado: 'botox_toxina',
    data_captura: '2025-01-15T14:30:00Z',
    equipamento_utilizado: 'Canon EOS R5',
    hash_arquivo: 'sha256:def456...',
    criptografada: false,
    watermark_aplicado: true,
    consentimento_uso: true,
    criado_em: '2025-01-15T14:30:00Z',
    criado_por: 'med-001'
  }
];

// Mock data para auditoria
export const mockAuditoria: any[] = [
  {
    id: '1',
    prontuario_id: '1',
    tabela_afetada: 'prontuarios',
    registro_id: '1',
    operacao: 'INSERT',
    dados_novos: {
      nome_completo: 'Maria Silva Santos',
      status: 'ativo',
      criado_em: '2025-01-15T10:30:00Z'
    },
    nivel_criticidade: 'baixo',
    contexto_operacao: 'Criação de novo prontuário',
    usuario_id: 'med-001',
    usuario_nome: 'Dr. João Santos',
    usuario_role: 'medico_responsavel',
    ip_origem: '192.168.1.100',
    timestamp_operacao: '2025-01-15T10:30:00Z',
    gdpr_compliant: true,
    lgpd_compliant: true,
    hipaa_compliant: true
  }
];