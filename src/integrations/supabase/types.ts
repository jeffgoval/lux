export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      acessos_prontuario: {
        Row: {
          autorizado_por: string | null
          campos_visualizados: string[] | null
          data_acesso: string
          dispositivo: string | null
          id: string
          ip_acesso: unknown | null
          localizacao: string | null
          motivo_acesso: string | null
          navegador: string | null
          nivel_urgencia: string | null
          prontuario_id: string
          secoes_acessadas: string[] | null
          tempo_sessao_minutos: number | null
          tipo_acesso: Database["public"]["Enums"]["tipo_acesso"]
          usuario_id: string
        }
        Insert: {
          autorizado_por?: string | null
          campos_visualizados?: string[] | null
          data_acesso?: string
          dispositivo?: string | null
          id?: string
          ip_acesso?: unknown | null
          localizacao?: string | null
          motivo_acesso?: string | null
          navegador?: string | null
          nivel_urgencia?: string | null
          prontuario_id: string
          secoes_acessadas?: string[] | null
          tempo_sessao_minutos?: number | null
          tipo_acesso: Database["public"]["Enums"]["tipo_acesso"]
          usuario_id: string
        }
        Update: {
          autorizado_por?: string | null
          campos_visualizados?: string[] | null
          data_acesso?: string
          dispositivo?: string | null
          id?: string
          ip_acesso?: unknown | null
          localizacao?: string | null
          motivo_acesso?: string | null
          navegador?: string | null
          nivel_urgencia?: string | null
          prontuario_id?: string
          secoes_acessadas?: string[] | null
          tempo_sessao_minutos?: number | null
          tipo_acesso?: Database["public"]["Enums"]["tipo_acesso"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "acessos_prontuario_prontuario_id_fkey"
            columns: ["prontuario_id"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_medica: {
        Row: {
          campos_modificados: string[] | null
          contexto_operacao: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          duracao_operacao_ms: number | null
          gdpr_compliant: boolean
          hipaa_compliant: boolean
          id: string
          ip_origem: unknown | null
          justificativa: string | null
          lgpd_compliant: boolean
          nivel_criticidade: string
          operacao: string
          prontuario_id: string | null
          registro_id: string | null
          sessao_id: string | null
          tabela_afetada: string
          timestamp_operacao: string
          user_agent: string | null
          usuario_id: string
          usuario_nome: string | null
          usuario_role: string | null
        }
        Insert: {
          campos_modificados?: string[] | null
          contexto_operacao?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          duracao_operacao_ms?: number | null
          gdpr_compliant?: boolean
          hipaa_compliant?: boolean
          id?: string
          ip_origem?: unknown | null
          justificativa?: string | null
          lgpd_compliant?: boolean
          nivel_criticidade?: string
          operacao: string
          prontuario_id?: string | null
          registro_id?: string | null
          sessao_id?: string | null
          tabela_afetada: string
          timestamp_operacao?: string
          user_agent?: string | null
          usuario_id: string
          usuario_nome?: string | null
          usuario_role?: string | null
        }
        Update: {
          campos_modificados?: string[] | null
          contexto_operacao?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          duracao_operacao_ms?: number | null
          gdpr_compliant?: boolean
          hipaa_compliant?: boolean
          id?: string
          ip_origem?: unknown | null
          justificativa?: string | null
          lgpd_compliant?: boolean
          nivel_criticidade?: string
          operacao?: string
          prontuario_id?: string | null
          registro_id?: string | null
          sessao_id?: string | null
          tabela_afetada?: string
          timestamp_operacao?: string
          user_agent?: string | null
          usuario_id?: string
          usuario_nome?: string | null
          usuario_role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_medica_prontuario_id_fkey"
            columns: ["prontuario_id"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      clinicas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          configuracoes: Json | null
          criado_em: string
          criado_por: string
          email: string | null
          endereco: string | null
          id: string
          nome: string
          organizacao_id: string
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          configuracoes?: Json | null
          criado_em?: string
          criado_por: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome: string
          organizacao_id: string
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          configuracoes?: Json | null
          criado_em?: string
          criado_por?: string
          email?: string | null
          endereco?: string | null
          id?: string
          nome?: string
          organizacao_id?: string
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinicas_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      consentimentos_digitais: {
        Row: {
          assinatura_digital: string | null
          ativo: boolean
          conteudo: string
          criado_em: string
          criado_por: string
          data_assinatura: string | null
          data_expiracao: string | null
          dispositivo_assinatura: string | null
          id: string
          ip_assinatura: unknown | null
          prontuario_id: string
          testemunha_assinatura: string | null
          testemunha_documento: string | null
          testemunha_nome: string | null
          tipo_consentimento: Database["public"]["Enums"]["tipo_consentimento"]
          titulo: string
          versao_documento: string
        }
        Insert: {
          assinatura_digital?: string | null
          ativo?: boolean
          conteudo: string
          criado_em?: string
          criado_por: string
          data_assinatura?: string | null
          data_expiracao?: string | null
          dispositivo_assinatura?: string | null
          id?: string
          ip_assinatura?: unknown | null
          prontuario_id: string
          testemunha_assinatura?: string | null
          testemunha_documento?: string | null
          testemunha_nome?: string | null
          tipo_consentimento: Database["public"]["Enums"]["tipo_consentimento"]
          titulo: string
          versao_documento: string
        }
        Update: {
          assinatura_digital?: string | null
          ativo?: boolean
          conteudo?: string
          criado_em?: string
          criado_por?: string
          data_assinatura?: string | null
          data_expiracao?: string | null
          dispositivo_assinatura?: string | null
          id?: string
          ip_assinatura?: unknown | null
          prontuario_id?: string
          testemunha_assinatura?: string | null
          testemunha_documento?: string | null
          testemunha_nome?: string | null
          tipo_consentimento?: Database["public"]["Enums"]["tipo_consentimento"]
          titulo?: string
          versao_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "consentimentos_digitais_prontuario_id_fkey"
            columns: ["prontuario_id"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      convites: {
        Row: {
          aceito_em: string | null
          aceito_por: string | null
          clinica_id: string | null
          criado_em: string
          criado_por: string
          email: string
          expires_at: string
          id: string
          organizacao_id: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          status: Database["public"]["Enums"]["status_convite"]
          token: string
        }
        Insert: {
          aceito_em?: string | null
          aceito_por?: string | null
          clinica_id?: string | null
          criado_em?: string
          criado_por: string
          email: string
          expires_at: string
          id?: string
          organizacao_id?: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          status?: Database["public"]["Enums"]["status_convite"]
          token: string
        }
        Update: {
          aceito_em?: string | null
          aceito_por?: string | null
          clinica_id?: string | null
          criado_em?: string
          criado_por?: string
          email?: string
          expires_at?: string
          id?: string
          organizacao_id?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          status?: Database["public"]["Enums"]["status_convite"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "convites_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "convites_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      imagens_medicas: {
        Row: {
          caminho_storage: string
          configuracoes_camera: Json | null
          consentimento_id: string | null
          consentimento_uso: boolean
          criado_em: string
          criado_por: string
          criptografada: boolean
          data_captura: string
          dimensoes: string | null
          equipamento_utilizado: string | null
          hash_arquivo: string | null
          id: string
          nome_arquivo: string
          procedimento_relacionado:
            | Database["public"]["Enums"]["tipo_procedimento"]
            | null
          prontuario_id: string
          regiao_anatomica: string | null
          sessao_id: string | null
          tamanho_bytes: number | null
          tipo_imagem: Database["public"]["Enums"]["tipo_imagem"]
          url_publica: string | null
          watermark_aplicado: boolean
        }
        Insert: {
          caminho_storage: string
          configuracoes_camera?: Json | null
          consentimento_id?: string | null
          consentimento_uso?: boolean
          criado_em?: string
          criado_por: string
          criptografada?: boolean
          data_captura?: string
          dimensoes?: string | null
          equipamento_utilizado?: string | null
          hash_arquivo?: string | null
          id?: string
          nome_arquivo: string
          procedimento_relacionado?:
            | Database["public"]["Enums"]["tipo_procedimento"]
            | null
          prontuario_id: string
          regiao_anatomica?: string | null
          sessao_id?: string | null
          tamanho_bytes?: number | null
          tipo_imagem: Database["public"]["Enums"]["tipo_imagem"]
          url_publica?: string | null
          watermark_aplicado?: boolean
        }
        Update: {
          caminho_storage?: string
          configuracoes_camera?: Json | null
          consentimento_id?: string | null
          consentimento_uso?: boolean
          criado_em?: string
          criado_por?: string
          criptografada?: boolean
          data_captura?: string
          dimensoes?: string | null
          equipamento_utilizado?: string | null
          hash_arquivo?: string | null
          id?: string
          nome_arquivo?: string
          procedimento_relacionado?:
            | Database["public"]["Enums"]["tipo_procedimento"]
            | null
          prontuario_id?: string
          regiao_anatomica?: string | null
          sessao_id?: string | null
          tamanho_bytes?: number | null
          tipo_imagem?: Database["public"]["Enums"]["tipo_imagem"]
          url_publica?: string | null
          watermark_aplicado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "imagens_medicas_prontuario_id_fkey"
            columns: ["prontuario_id"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imagens_medicas_sessao_id_fkey"
            columns: ["sessao_id"]
            isOneToOne: false
            referencedRelation: "sessoes_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      organizacoes: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cnpj: string | null
          configuracoes: Json | null
          criado_em: string
          criado_por: string
          id: string
          nome: string
          plano: Database["public"]["Enums"]["plano_type"]
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cnpj?: string | null
          configuracoes?: Json | null
          criado_em?: string
          criado_por: string
          id?: string
          nome: string
          plano?: Database["public"]["Enums"]["plano_type"]
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cnpj?: string | null
          configuracoes?: Json | null
          criado_em?: string
          criado_por?: string
          id?: string
          nome?: string
          plano?: Database["public"]["Enums"]["plano_type"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          atualizado_em: string
          avatar_url: string | null
          criado_em: string
          email: string
          id: string
          nome_completo: string
          primeiro_acesso: boolean
          telefone: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          email: string
          id?: string
          nome_completo: string
          primeiro_acesso?: boolean
          telefone?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          email?: string
          id?: string
          nome_completo?: string
          primeiro_acesso?: boolean
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profissionais_especialidades: {
        Row: {
          ativo: boolean
          certificacao: string | null
          criado_em: string
          especialidade: string
          id: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          certificacao?: string | null
          criado_em?: string
          especialidade: string
          id?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          certificacao?: string | null
          criado_em?: string
          especialidade?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      prontuarios: {
        Row: {
          alergias: string | null
          anamnese: string | null
          atualizado_em: string
          atualizado_por: string | null
          contraindicacoes: string | null
          cpf_encrypted: string | null
          criado_em: string
          criado_por: string
          data_nascimento_encrypted: string | null
          email_encrypted: string | null
          endereco_encrypted: string | null
          hash_integridade: string | null
          historico_medico: string | null
          id: string
          medicamentos_atuais: string | null
          medico_responsavel_id: string
          nivel_confidencialidade: Database["public"]["Enums"]["nivel_acesso_medico"]
          nome_completo: string
          numero_prontuario: string
          paciente_id: string
          rg_encrypted: string | null
          status: Database["public"]["Enums"]["status_prontuario"]
          telefone_encrypted: string | null
          ultimo_backup: string | null
          versao: number
        }
        Insert: {
          alergias?: string | null
          anamnese?: string | null
          atualizado_em?: string
          atualizado_por?: string | null
          contraindicacoes?: string | null
          cpf_encrypted?: string | null
          criado_em?: string
          criado_por: string
          data_nascimento_encrypted?: string | null
          email_encrypted?: string | null
          endereco_encrypted?: string | null
          hash_integridade?: string | null
          historico_medico?: string | null
          id?: string
          medicamentos_atuais?: string | null
          medico_responsavel_id: string
          nivel_confidencialidade?: Database["public"]["Enums"]["nivel_acesso_medico"]
          nome_completo: string
          numero_prontuario: string
          paciente_id: string
          rg_encrypted?: string | null
          status?: Database["public"]["Enums"]["status_prontuario"]
          telefone_encrypted?: string | null
          ultimo_backup?: string | null
          versao?: number
        }
        Update: {
          alergias?: string | null
          anamnese?: string | null
          atualizado_em?: string
          atualizado_por?: string | null
          contraindicacoes?: string | null
          cpf_encrypted?: string | null
          criado_em?: string
          criado_por?: string
          data_nascimento_encrypted?: string | null
          email_encrypted?: string | null
          endereco_encrypted?: string | null
          hash_integridade?: string | null
          historico_medico?: string | null
          id?: string
          medicamentos_atuais?: string | null
          medico_responsavel_id?: string
          nivel_confidencialidade?: Database["public"]["Enums"]["nivel_acesso_medico"]
          nome_completo?: string
          numero_prontuario?: string
          paciente_id?: string
          rg_encrypted?: string | null
          status?: Database["public"]["Enums"]["status_prontuario"]
          telefone_encrypted?: string | null
          ultimo_backup?: string | null
          versao?: number
        }
        Relationships: []
      }
      sessoes_atendimento: {
        Row: {
          atualizado_em: string
          complicacoes: string | null
          criado_em: string
          criado_por: string
          data_sessao: string
          desconto_aplicado: number | null
          detalhes_procedimento: Json | null
          duracao_minutos: number | null
          id: string
          intervalo_recomendado_dias: number | null
          observacoes: string | null
          produtos_utilizados: Json | null
          profissional_id: string
          prontuario_id: string
          proxima_sessao_recomendada: string | null
          resultados: string | null
          tipo_procedimento: Database["public"]["Enums"]["tipo_procedimento"]
          valor_final: number | null
          valor_procedimento: number | null
        }
        Insert: {
          atualizado_em?: string
          complicacoes?: string | null
          criado_em?: string
          criado_por: string
          data_sessao: string
          desconto_aplicado?: number | null
          detalhes_procedimento?: Json | null
          duracao_minutos?: number | null
          id?: string
          intervalo_recomendado_dias?: number | null
          observacoes?: string | null
          produtos_utilizados?: Json | null
          profissional_id: string
          prontuario_id: string
          proxima_sessao_recomendada?: string | null
          resultados?: string | null
          tipo_procedimento: Database["public"]["Enums"]["tipo_procedimento"]
          valor_final?: number | null
          valor_procedimento?: number | null
        }
        Update: {
          atualizado_em?: string
          complicacoes?: string | null
          criado_em?: string
          criado_por?: string
          data_sessao?: string
          desconto_aplicado?: number | null
          detalhes_procedimento?: Json | null
          duracao_minutos?: number | null
          id?: string
          intervalo_recomendado_dias?: number | null
          observacoes?: string | null
          produtos_utilizados?: Json | null
          profissional_id?: string
          prontuario_id?: string
          proxima_sessao_recomendada?: string | null
          resultados?: string | null
          tipo_procedimento?: Database["public"]["Enums"]["tipo_procedimento"]
          valor_final?: number | null
          valor_procedimento?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessoes_atendimento_prontuario_id_fkey"
            columns: ["prontuario_id"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      templates_procedimentos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          campos_obrigatorios: Json
          campos_opcionais: Json | null
          categoria: string | null
          criado_em: string
          criado_por: string
          descricao: string | null
          id: string
          nome_template: string
          ordem_exibicao: number | null
          tipo_procedimento: Database["public"]["Enums"]["tipo_procedimento"]
          validacoes: Json | null
          valores_padrao: Json | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          campos_obrigatorios: Json
          campos_opcionais?: Json | null
          categoria?: string | null
          criado_em?: string
          criado_por: string
          descricao?: string | null
          id?: string
          nome_template: string
          ordem_exibicao?: number | null
          tipo_procedimento: Database["public"]["Enums"]["tipo_procedimento"]
          validacoes?: Json | null
          valores_padrao?: Json | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          campos_obrigatorios?: Json
          campos_opcionais?: Json | null
          categoria?: string | null
          criado_em?: string
          criado_por?: string
          descricao?: string | null
          id?: string
          nome_template?: string
          ordem_exibicao?: number | null
          tipo_procedimento?: Database["public"]["Enums"]["tipo_procedimento"]
          validacoes?: Json | null
          valores_padrao?: Json | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          ativo: boolean
          clinica_id: string | null
          criado_em: string
          criado_por: string
          id: string
          organizacao_id: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          user_id: string
        }
        Insert: {
          ativo?: boolean
          clinica_id?: string | null
          criado_em?: string
          criado_por: string
          id?: string
          organizacao_id?: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          user_id: string
        }
        Update: {
          ativo?: boolean
          clinica_id?: string | null
          criado_em?: string
          criado_por?: string
          id?: string
          organizacao_id?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_clinica_id_fkey"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organizacao_id_fkey"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gerar_numero_prontuario: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_role_in_context: {
        Args: { clinic_id?: string; org_id?: string; user_uuid: string }
        Returns: Database["public"]["Enums"]["user_role_type"]
      }
      user_has_role: {
        Args: {
          required_role: Database["public"]["Enums"]["user_role_type"]
          user_uuid: string
        }
        Returns: boolean
      }
    }
    Enums: {
      nivel_acesso_medico:
        | "medico_responsavel"
        | "medico_assistente"
        | "enfermeiro"
        | "esteticista"
        | "administrador"
      plano_type: "basico" | "premium" | "enterprise"
      status_convite: "pendente" | "aceito" | "expirado" | "cancelado"
      status_prontuario: "ativo" | "inativo" | "arquivado" | "transferido"
      tipo_acesso:
        | "visualizacao"
        | "edicao"
        | "criacao"
        | "exclusao"
        | "download"
      tipo_consentimento:
        | "termo_responsabilidade"
        | "autorizacao_imagem"
        | "consentimento_procedimento"
        | "termo_privacidade"
      tipo_imagem: "antes" | "durante" | "depois" | "complicacao" | "documento"
      tipo_procedimento:
        | "botox_toxina"
        | "preenchimento"
        | "harmonizacao_facial"
        | "laser_ipl"
        | "peeling"
        | "tratamento_corporal"
        | "consulta"
        | "avaliacao"
      user_role_type:
        | "super_admin"
        | "proprietaria"
        | "gerente"
        | "profissionais"
        | "recepcionistas"
        | "cliente"
        | "visitante"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      nivel_acesso_medico: [
        "medico_responsavel",
        "medico_assistente",
        "enfermeiro",
        "esteticista",
        "administrador",
      ],
      plano_type: ["basico", "premium", "enterprise"],
      status_convite: ["pendente", "aceito", "expirado", "cancelado"],
      status_prontuario: ["ativo", "inativo", "arquivado", "transferido"],
      tipo_acesso: [
        "visualizacao",
        "edicao",
        "criacao",
        "exclusao",
        "download",
      ],
      tipo_consentimento: [
        "termo_responsabilidade",
        "autorizacao_imagem",
        "consentimento_procedimento",
        "termo_privacidade",
      ],
      tipo_imagem: ["antes", "durante", "depois", "complicacao", "documento"],
      tipo_procedimento: [
        "botox_toxina",
        "preenchimento",
        "harmonizacao_facial",
        "laser_ipl",
        "peeling",
        "tratamento_corporal",
        "consulta",
        "avaliacao",
      ],
      user_role_type: [
        "super_admin",
        "proprietaria",
        "gerente",
        "profissionais",
        "recepcionistas",
        "cliente",
        "visitante",
      ],
    },
  },
} as const
