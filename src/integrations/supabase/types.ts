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
          dispositivo: string | null
          duracao_acesso: unknown | null
          finalizado_em: string | null
          id: string
          iniciado_em: string
          ip_acesso: unknown
          justificativa_clinica: string | null
          prontuario_id: string
          secoes_acessadas: string[] | null
          tipo_acesso: string
          usuario_id: string
        }
        Insert: {
          dispositivo?: string | null
          duracao_acesso?: unknown | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          ip_acesso: unknown
          justificativa_clinica?: string | null
          prontuario_id: string
          secoes_acessadas?: string[] | null
          tipo_acesso: string
          usuario_id: string
        }
        Update: {
          dispositivo?: string | null
          duracao_acesso?: unknown | null
          finalizado_em?: string | null
          id?: string
          iniciado_em?: string
          ip_acesso?: unknown
          justificativa_clinica?: string | null
          prontuario_id?: string
          secoes_acessadas?: string[] | null
          tipo_acesso?: string
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
          dados_anteriores: Json | null
          dados_novos: Json | null
          executado_em: string
          id: string
          ip_origem: unknown
          justificativa: string | null
          nivel_criticidade: string
          operacao: string
          registro_id: string
          tabela_origem: string
          user_agent: string | null
          usuario_id: string
        }
        Insert: {
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          executado_em?: string
          id?: string
          ip_origem: unknown
          justificativa?: string | null
          nivel_criticidade?: string
          operacao: string
          registro_id: string
          tabela_origem: string
          user_agent?: string | null
          usuario_id: string
        }
        Update: {
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          executado_em?: string
          id?: string
          ip_origem?: unknown
          justificativa?: string | null
          nivel_criticidade?: string
          operacao?: string
          registro_id?: string
          tabela_origem?: string
          user_agent?: string | null
          usuario_id?: string
        }
        Relationships: []
      }
      clinicas: {
        Row: {
          ativo: boolean
          atualizado_em: string
          cnpj: string | null
          configuracoes: Json | null
          criado_em: string
          email: string | null
          endereco_bairro: string | null
          endereco_cep: string | null
          endereco_cidade: string | null
          endereco_complemento: string | null
          endereco_estado: string | null
          endereco_numero: string | null
          endereco_rua: string | null
          horario_funcionamento: Json | null
          id: string
          nome: string
          organizacao_id: string
          site: string | null
          telefone: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cnpj?: string | null
          configuracoes?: Json | null
          criado_em?: string
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          horario_funcionamento?: Json | null
          id?: string
          nome: string
          organizacao_id: string
          site?: string | null
          telefone?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cnpj?: string | null
          configuracoes?: Json | null
          criado_em?: string
          email?: string | null
          endereco_bairro?: string | null
          endereco_cep?: string | null
          endereco_cidade?: string | null
          endereco_complemento?: string | null
          endereco_estado?: string | null
          endereco_numero?: string | null
          endereco_rua?: string | null
          horario_funcionamento?: Json | null
          id?: string
          nome?: string
          organizacao_id?: string
          site?: string | null
          telefone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_clinicas_organizacao"
            columns: ["organizacao_id"]
            isOneToOne: false
            referencedRelation: "organizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      consentimentos_digitais: {
        Row: {
          assinatura_digital: string
          ativo: boolean
          conteudo_documento: string
          criado_em: string
          criado_por: string
          data_expiracao: string | null
          data_inicio: string
          hash_documento: string
          id: string
          ip_assinatura: unknown
          prontuario_id: string
          timestamp_assinatura: string
          tipo_consentimento: Database["public"]["Enums"]["tipo_consentimento"]
          titulo: string
          versao_documento: string
        }
        Insert: {
          assinatura_digital: string
          ativo?: boolean
          conteudo_documento: string
          criado_em?: string
          criado_por: string
          data_expiracao?: string | null
          data_inicio: string
          hash_documento: string
          id?: string
          ip_assinatura: unknown
          prontuario_id: string
          timestamp_assinatura: string
          tipo_consentimento: Database["public"]["Enums"]["tipo_consentimento"]
          titulo: string
          versao_documento: string
        }
        Update: {
          assinatura_digital?: string
          ativo?: boolean
          conteudo_documento?: string
          criado_em?: string
          criado_por?: string
          data_expiracao?: string | null
          data_inicio?: string
          hash_documento?: string
          id?: string
          ip_assinatura?: unknown
          prontuario_id?: string
          timestamp_assinatura?: string
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
      imagens_medicas: {
        Row: {
          angulo_captura: string | null
          capturada_em: string
          capturada_por: string
          condicoes_iluminacao: string | null
          hash_imagem: string
          id: string
          mime_type: string
          nome_arquivo_original: string
          observacoes_imagem: string | null
          regiao_corporal: string
          resolucao: string | null
          sessao_id: string
          tamanho_bytes: number
          tipo_imagem: string
          url_criptografada: string
          visivel_paciente: boolean
          watermark_aplicado: boolean
        }
        Insert: {
          angulo_captura?: string | null
          capturada_em?: string
          capturada_por: string
          condicoes_iluminacao?: string | null
          hash_imagem: string
          id?: string
          mime_type: string
          nome_arquivo_original: string
          observacoes_imagem?: string | null
          regiao_corporal: string
          resolucao?: string | null
          sessao_id: string
          tamanho_bytes: number
          tipo_imagem: string
          url_criptografada: string
          visivel_paciente?: boolean
          watermark_aplicado?: boolean
        }
        Update: {
          angulo_captura?: string | null
          capturada_em?: string
          capturada_por?: string
          condicoes_iluminacao?: string | null
          hash_imagem?: string
          id?: string
          mime_type?: string
          nome_arquivo_original?: string
          observacoes_imagem?: string | null
          regiao_corporal?: string
          resolucao?: string | null
          sessao_id?: string
          tamanho_bytes?: number
          tipo_imagem?: string
          url_criptografada?: string
          visivel_paciente?: boolean
          watermark_aplicado?: boolean
        }
        Relationships: [
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
          criado_em: string
          descricao: string | null
          id: string
          nome: string
          proprietaria_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          cnpj?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          nome: string
          proprietaria_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          cnpj?: string | null
          criado_em?: string
          descricao?: string | null
          id?: string
          nome?: string
          proprietaria_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          ativo: boolean
          atualizado_em: string
          avatar_url: string | null
          criado_em: string
          email: string | null
          id: string
          nome_completo: string | null
          primeiro_acesso: boolean
          telefone: string | null
          user_id: string
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome_completo?: string | null
          primeiro_acesso?: boolean
          telefone?: string | null
          user_id: string
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          avatar_url?: string | null
          criado_em?: string
          email?: string | null
          id?: string
          nome_completo?: string | null
          primeiro_acesso?: boolean
          telefone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profissionais: {
        Row: {
          ativo: boolean
          atualizado_em: string
          clinica_id: string
          configuracoes: Json | null
          criado_em: string
          email: string | null
          especialidade: string | null
          id: string
          nome: string
          registro_profissional: string | null
          telefone: string | null
          user_id: string | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          clinica_id: string
          configuracoes?: Json | null
          criado_em?: string
          email?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          registro_profissional?: string | null
          telefone?: string | null
          user_id?: string | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          clinica_id?: string
          configuracoes?: Json | null
          criado_em?: string
          email?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          registro_profissional?: string | null
          telefone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_profissionais_clinica"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      prontuarios: {
        Row: {
          alergias_criptografado: string | null
          anamnese_criptografada: string | null
          atualizado_em: string
          atualizado_por: string
          cliente_id: string
          contraindicacoes_criptografado: string | null
          criado_em: string
          criado_por: string
          hash_integridade: string
          historico_medico_criptografado: string | null
          id: string
          medicamentos_atuais_criptografado: string | null
          medico_responsavel_id: string
          numero_prontuario: string
          status: Database["public"]["Enums"]["status_prontuario"]
          versao: number
        }
        Insert: {
          alergias_criptografado?: string | null
          anamnese_criptografada?: string | null
          atualizado_em?: string
          atualizado_por: string
          cliente_id: string
          contraindicacoes_criptografado?: string | null
          criado_em?: string
          criado_por: string
          hash_integridade: string
          historico_medico_criptografado?: string | null
          id?: string
          medicamentos_atuais_criptografado?: string | null
          medico_responsavel_id: string
          numero_prontuario: string
          status?: Database["public"]["Enums"]["status_prontuario"]
          versao?: number
        }
        Update: {
          alergias_criptografado?: string | null
          anamnese_criptografada?: string | null
          atualizado_em?: string
          atualizado_por?: string
          cliente_id?: string
          contraindicacoes_criptografado?: string | null
          criado_em?: string
          criado_por?: string
          hash_integridade?: string
          historico_medico_criptografado?: string | null
          id?: string
          medicamentos_atuais_criptografado?: string | null
          medico_responsavel_id?: string
          numero_prontuario?: string
          status?: Database["public"]["Enums"]["status_prontuario"]
          versao?: number
        }
        Relationships: []
      }
      roles: {
        Row: {
          ativo: boolean
          atualizado_em: string
          color_class: string | null
          criado_em: string
          description: string | null
          display_name: string
          hierarchy_level: number
          id: string
          permissions: Json
          role_name: Database["public"]["Enums"]["user_role_type"]
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          color_class?: string | null
          criado_em?: string
          description?: string | null
          display_name: string
          hierarchy_level: number
          id?: string
          permissions?: Json
          role_name: Database["public"]["Enums"]["user_role_type"]
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          color_class?: string | null
          criado_em?: string
          description?: string | null
          display_name?: string
          hierarchy_level?: number
          id?: string
          permissions?: Json
          role_name?: Database["public"]["Enums"]["user_role_type"]
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean
          atualizado_em: string
          categoria: string | null
          clinica_id: string
          configuracoes: Json | null
          criado_em: string
          descricao: string | null
          duracao_minutos: number
          id: string
          nome: string
          preco: number | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string | null
          clinica_id: string
          configuracoes?: Json | null
          criado_em?: string
          descricao?: string | null
          duracao_minutos?: number
          id?: string
          nome: string
          preco?: number | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          categoria?: string | null
          clinica_id?: string
          configuracoes?: Json | null
          criado_em?: string
          descricao?: string | null
          duracao_minutos?: number
          id?: string
          nome?: string
          preco?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_servicos_clinica"
            columns: ["clinica_id"]
            isOneToOne: false
            referencedRelation: "clinicas"
            referencedColumns: ["id"]
          },
        ]
      }
      sessoes_atendimento: {
        Row: {
          criado_em: string
          criado_por: string
          data_atendimento: string
          equipamentos_utilizados: Json | null
          hash_integridade: string
          id: string
          intercorrencias: string | null
          observacoes_pos: string | null
          observacoes_pre: string | null
          orientacoes_paciente: string | null
          parametros_tecnicos: Json | null
          procedimento_detalhes: Json
          produtos_utilizados: Json | null
          profissional_id: string
          prontuario_id: string
          proxima_sessao_recomendada: string | null
          resultados_imediatos: string | null
          satisfacao_paciente: number | null
          tipo_procedimento: Database["public"]["Enums"]["tipo_procedimento"]
        }
        Insert: {
          criado_em?: string
          criado_por: string
          data_atendimento?: string
          equipamentos_utilizados?: Json | null
          hash_integridade: string
          id?: string
          intercorrencias?: string | null
          observacoes_pos?: string | null
          observacoes_pre?: string | null
          orientacoes_paciente?: string | null
          parametros_tecnicos?: Json | null
          procedimento_detalhes: Json
          produtos_utilizados?: Json | null
          profissional_id: string
          prontuario_id: string
          proxima_sessao_recomendada?: string | null
          resultados_imediatos?: string | null
          satisfacao_paciente?: number | null
          tipo_procedimento: Database["public"]["Enums"]["tipo_procedimento"]
        }
        Update: {
          criado_em?: string
          criado_por?: string
          data_atendimento?: string
          equipamentos_utilizados?: Json | null
          hash_integridade?: string
          id?: string
          intercorrencias?: string | null
          observacoes_pos?: string | null
          observacoes_pre?: string | null
          orientacoes_paciente?: string | null
          parametros_tecnicos?: Json | null
          procedimento_detalhes?: Json
          produtos_utilizados?: Json | null
          profissional_id?: string
          prontuario_id?: string
          proxima_sessao_recomendada?: string | null
          resultados_imediatos?: string | null
          satisfacao_paciente?: number | null
          tipo_procedimento?: Database["public"]["Enums"]["tipo_procedimento"]
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
          criado_em: string
          criado_por: string
          id: string
          nome_template: string
          personalizavel: boolean
          tipo_procedimento: Database["public"]["Enums"]["tipo_procedimento"]
          validacoes: Json | null
          valores_padrao: Json | null
        }
        Insert: {
          ativo?: boolean
          atualizado_em?: string
          campos_obrigatorios: Json
          campos_opcionais?: Json | null
          criado_em?: string
          criado_por: string
          id?: string
          nome_template: string
          personalizavel?: boolean
          tipo_procedimento: Database["public"]["Enums"]["tipo_procedimento"]
          validacoes?: Json | null
          valores_padrao?: Json | null
        }
        Update: {
          ativo?: boolean
          atualizado_em?: string
          campos_obrigatorios?: Json
          campos_opcionais?: Json | null
          criado_em?: string
          criado_por?: string
          id?: string
          nome_template?: string
          personalizavel?: boolean
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
          criado_por: string | null
          id: string
          organizacao_id: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          user_id: string
        }
        Insert: {
          ativo?: boolean
          clinica_id?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          organizacao_id?: string | null
          role: Database["public"]["Enums"]["user_role_type"]
          user_id: string
        }
        Update: {
          ativo?: boolean
          clinica_id?: string | null
          criado_em?: string
          criado_por?: string | null
          id?: string
          organizacao_id?: string | null
          role?: Database["public"]["Enums"]["user_role_type"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_roles: {
        Args: Record<PropertyKey, never>
        Returns: {
          ativo: boolean
          atualizado_em: string
          color_class: string
          criado_em: string
          description: string
          display_name: string
          hierarchy_level: number
          id: string
          permissions: Json
          role_name: Database["public"]["Enums"]["user_role_type"]
        }[]
      }
      update_user_profile: {
        Args: { p_nome_completo: string; p_telefone: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      nivel_acesso_medico:
        | "medico"
        | "enfermeiro"
        | "esteticista"
        | "recepcionista"
        | "admin"
      status_prontuario: "ativo" | "arquivado" | "transferido"
      tipo_consentimento:
        | "procedimento"
        | "anestesia"
        | "imagem"
        | "dados_pessoais"
      tipo_procedimento:
        | "botox_toxina"
        | "preenchimento"
        | "harmonizacao_facial"
        | "laser_ipl"
        | "peeling"
        | "tratamento_corporal"
        | "skincare_avancado"
        | "outro"
      user_role_type:
        | "super_admin"
        | "proprietaria"
        | "gerente"
        | "profissionais"
        | "recepcionistas"
        | "visitante"
        | "cliente"
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
        "medico",
        "enfermeiro",
        "esteticista",
        "recepcionista",
        "admin",
      ],
      status_prontuario: ["ativo", "arquivado", "transferido"],
      tipo_consentimento: [
        "procedimento",
        "anestesia",
        "imagem",
        "dados_pessoais",
      ],
      tipo_procedimento: [
        "botox_toxina",
        "preenchimento",
        "harmonizacao_facial",
        "laser_ipl",
        "peeling",
        "tratamento_corporal",
        "skincare_avancado",
        "outro",
      ],
      user_role_type: [
        "super_admin",
        "proprietaria",
        "gerente",
        "profissionais",
        "recepcionistas",
        "visitante",
        "cliente",
      ],
    },
  },
} as const
