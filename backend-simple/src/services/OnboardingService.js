// =====================================================
// ONBOARDING SERVICE CLASS
// Encapsulates all onboarding logic with transaction management
// =====================================================

const { query, transaction } = require('../db/connection');
const { ErrorHandler, RetryManager } = require('../middleware/errorHandler');

class OnboardingService {
  constructor() {
    this.defaultTemplates = [
      {
        tipo: 'consulta',
        nome: 'Consulta Inicial',
        descricao: 'Primeira consulta para avaliação do paciente',
        duracao: 60,
        valor: 150.00,
        instrucoes_pre: 'Comparecer com 15 minutos de antecedência',
        instrucoes_pos: 'Seguir as orientações médicas fornecidas'
      },
      {
        tipo: 'botox_toxina',
        nome: 'Aplicação de Botox',
        descricao: 'Procedimento de aplicação de toxina botulínica',
        duracao: 30,
        valor: 800.00,
        instrucoes_pre: 'Não consumir álcool 24h antes do procedimento',
        instrucoes_pos: 'Evitar exercícios físicos por 24h'
      },
      {
        tipo: 'preenchimento',
        nome: 'Preenchimento com Ácido Hialurônico',
        descricao: 'Preenchimento facial com ácido hialurônico',
        duracao: 45,
        valor: 1200.00,
        instrucoes_pre: 'Suspender anticoagulantes conforme orientação médica',
        instrucoes_pos: 'Aplicar gelo local se necessário'
      },
      {
        tipo: 'limpeza_pele',
        nome: 'Limpeza de Pele Profunda',
        descricao: 'Limpeza facial profunda com extração',
        duracao: 90,
        valor: 120.00,
        instrucoes_pre: 'Não usar produtos ácidos 48h antes',
        instrucoes_pos: 'Usar protetor solar e hidratante'
      },
      {
        tipo: 'peeling',
        nome: 'Peeling Químico',
        descricao: 'Peeling químico para renovação celular',
        duracao: 60,
        valor: 300.00,
        instrucoes_pre: 'Preparar a pele conforme protocolo',
        instrucoes_pos: 'Evitar exposição solar por 7 dias'
      }
    ];
  }

  /**
   * Create or update user profile
   */
  async createUserProfile(client, userId, profileData) {
    const {
      email,
      nome_completo,
      telefone,
      cpf,
      data_nascimento,
      avatar_url
    } = profileData;

    try {
      const result = await client.query(`
        INSERT INTO public.profiles (
          id, email, nome_completo, telefone, cpf, data_nascimento, avatar_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          nome_completo = EXCLUDED.nome_completo,
          telefone = EXCLUDED.telefone,
          cpf = EXCLUDED.cpf,
          data_nascimento = EXCLUDED.data_nascimento,
          avatar_url = EXCLUDED.avatar_url,
          atualizado_em = now()
        RETURNING *
      `, [userId, email, nome_completo, telefone, cpf, data_nascimento, avatar_url]);

      return {
        success: true,
        data: result.rows[0],
        message: 'Profile created/updated successfully'
      };
    } catch (error) {
      throw new Error(`Failed to create user profile: ${error.message}`);
    }
  }

  /**
   * Create user role
   */
  async createUserRole(client, userId, role = 'proprietaria', clinicaId = null) {
    try {
      const result = await client.query(`
        INSERT INTO public.user_roles (user_id, role, clinica_id, criado_por)
        VALUES ($1, $2, $3, $1)
        ON CONFLICT (user_id, role, clinica_id) DO UPDATE SET
          ativo = true,
          atualizado_em = now()
        RETURNING *
      `, [userId, role, clinicaId]);

      return {
        success: true,
        data: result.rows[0],
        message: 'User role created successfully'
      };
    } catch (error) {
      throw new Error(`Failed to create user role: ${error.message}`);
    }
  }

  /**
   * Create clinic
   */
  async createClinic(client, userId, clinicData) {
    const {
      nome,
      cnpj,
      razao_social,
      endereco,
      telefone_principal,
      telefone_secundario,
      email_contato,
      website,
      horario_funcionamento,
      configuracoes
    } = clinicData;

    try {
      const result = await client.query(`
        INSERT INTO public.clinicas (
          nome, cnpj, razao_social, endereco, telefone_principal, 
          telefone_secundario, email_contato, website, 
          horario_funcionamento, configuracoes, criado_por
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        nome,
        cnpj,
        razao_social,
        endereco ? JSON.stringify(endereco) : null,
        telefone_principal,
        telefone_secundario,
        email_contato,
        website,
        horario_funcionamento ? JSON.stringify(horario_funcionamento) : null,
        configuracoes ? JSON.stringify(configuracoes) : null,
        userId
      ]);

      return {
        success: true,
        data: result.rows[0],
        message: 'Clinic created successfully'
      };
    } catch (error) {
      throw new Error(`Failed to create clinic: ${error.message}`);
    }
  }

  /**
   * Update user role with clinic ID
   */
  async updateUserRoleWithClinic(client, userId, clinicId, role = 'proprietaria') {
    try {
      const result = await client.query(`
        UPDATE public.user_roles 
        SET clinica_id = $1, atualizado_em = now()
        WHERE user_id = $2 AND role = $3
        RETURNING *
      `, [clinicId, userId, role]);

      return {
        success: true,
        data: result.rows[0],
        message: 'User role updated with clinic ID'
      };
    } catch (error) {
      throw new Error(`Failed to update user role with clinic: ${error.message}`);
    }
  }

  /**
   * Create professional profile
   */
  async createProfessional(client, userId, professionalData) {
    const {
      registro_profissional,
      tipo_registro,
      especialidades,
      biografia,
      experiencia_anos,
      formacao,
      certificacoes
    } = professionalData;

    try {
      const result = await client.query(`
        INSERT INTO public.profissionais (
          user_id, registro_profissional, tipo_registro, especialidades,
          biografia, experiencia_anos, formacao, certificacoes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
          registro_profissional = EXCLUDED.registro_profissional,
          tipo_registro = EXCLUDED.tipo_registro,
          especialidades = EXCLUDED.especialidades,
          biografia = EXCLUDED.biografia,
          experiencia_anos = EXCLUDED.experiencia_anos,
          formacao = EXCLUDED.formacao,
          certificacoes = EXCLUDED.certificacoes,
          ativo = true,
          atualizado_em = now()
        RETURNING *
      `, [
        userId,
        registro_profissional,
        tipo_registro || 'CRM',
        especialidades || [],
        biografia,
        experiencia_anos,
        formacao,
        certificacoes || []
      ]);

      return {
        success: true,
        data: result.rows[0],
        message: 'Professional profile created/updated successfully'
      };
    } catch (error) {
      throw new Error(`Failed to create professional profile: ${error.message}`);
    }
  }

  /**
   * Link professional to clinic
   */
  async linkProfessionalToClinic(client, userId, clinicId, linkData = {}) {
    const {
      cargo = 'Proprietário',
      especialidades = [],
      horario_trabalho = {},
      pode_criar_prontuarios = true,
      pode_editar_prontuarios = true,
      pode_visualizar_financeiro = true,
      pode_gerenciar_agenda = true,
      pode_gerenciar_estoque = true
    } = linkData;

    try {
      const result = await client.query(`
        INSERT INTO public.clinica_profissionais (
          clinica_id, user_id, cargo, especialidades, horario_trabalho,
          pode_criar_prontuarios, pode_editar_prontuarios, 
          pode_visualizar_financeiro, pode_gerenciar_agenda, pode_gerenciar_estoque
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (clinica_id, user_id) DO UPDATE SET
          cargo = EXCLUDED.cargo,
          especialidades = EXCLUDED.especialidades,
          horario_trabalho = EXCLUDED.horario_trabalho,
          pode_criar_prontuarios = EXCLUDED.pode_criar_prontuarios,
          pode_editar_prontuarios = EXCLUDED.pode_editar_prontuarios,
          pode_visualizar_financeiro = EXCLUDED.pode_visualizar_financeiro,
          pode_gerenciar_agenda = EXCLUDED.pode_gerenciar_agenda,
          pode_gerenciar_estoque = EXCLUDED.pode_gerenciar_estoque,
          ativo = true,
          atualizado_em = now()
        RETURNING *
      `, [
        clinicId,
        userId,
        cargo,
        especialidades,
        JSON.stringify(horario_trabalho),
        pode_criar_prontuarios,
        pode_editar_prontuarios,
        pode_visualizar_financeiro,
        pode_gerenciar_agenda,
        pode_gerenciar_estoque
      ]);

      return {
        success: true,
        data: result.rows[0],
        message: 'Professional linked to clinic successfully'
      };
    } catch (error) {
      throw new Error(`Failed to link professional to clinic: ${error.message}`);
    }
  }

  /**
   * Create default procedure templates
   */
  async createDefaultTemplates(client, userId, clinicId, customTemplates = null) {
    const templates = customTemplates || this.defaultTemplates;
    const createdTemplates = [];
    const errors = [];

    for (const template of templates) {
      try {
        const result = await client.query(`
          INSERT INTO public.templates_procedimentos (
            clinica_id, tipo_procedimento, nome_template, descricao,
            duracao_padrao_minutos, valor_base, instrucoes_pre, 
            instrucoes_pos, criado_por
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *
        `, [
          clinicId,
          template.tipo,
          template.nome,
          template.descricao,
          template.duracao,
          template.valor,
          template.instrucoes_pre,
          template.instrucoes_pos,
          userId
        ]);

        createdTemplates.push(result.rows[0]);
      } catch (error) {
        errors.push({
          template: template.nome,
          error: error.message
        });
        // Continue with other templates even if one fails
      }
    }

    return {
      success: true,
      data: createdTemplates,
      errors: errors,
      message: `Created ${createdTemplates.length} templates${errors.length > 0 ? ` with ${errors.length} errors` : ''}`
    };
  }

  /**
   * Validate onboarding data
   */
  validateOnboardingData(data) {
    const errors = [];

    // Required fields
    if (!data.nome_completo || data.nome_completo.trim().length < 2) {
      errors.push('Nome completo é obrigatório');
    }

    if (!data.clinica_nome || data.clinica_nome.trim().length < 2) {
      errors.push('Nome da clínica é obrigatório');
    }

    if (!data.registro_profissional || data.registro_profissional.trim().length < 4) {
      errors.push('Registro profissional é obrigatório');
    }

    // Email validation (if provided)
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Email inválido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check onboarding status
   */
  async checkOnboardingStatus(userId) {
    try {
      const result = await query(`
        SELECT 
          -- Profile check
          (SELECT count(*) > 0 FROM public.profiles WHERE id = $1) as has_profile,
          
          -- Role check
          (SELECT count(*) > 0 FROM public.user_roles WHERE user_id = $1 AND ativo = true) as has_role,
          
          -- Clinic check
          (SELECT count(*) > 0 FROM public.clinicas c 
           JOIN public.user_roles ur ON c.id = ur.clinica_id 
           WHERE ur.user_id = $1 AND ur.ativo = true) as has_clinic,
          
          -- Professional check
          (SELECT count(*) > 0 FROM public.profissionais WHERE user_id = $1 AND ativo = true) as has_professional,
          
          -- Clinic link check
          (SELECT count(*) > 0 FROM public.clinica_profissionais WHERE user_id = $1 AND ativo = true) as has_clinic_link,
          
          -- Templates check
          (SELECT count(*) FROM public.templates_procedimentos tp
           JOIN public.clinica_profissionais cp ON tp.clinica_id = cp.clinica_id
           WHERE cp.user_id = $1 AND tp.ativo = true) as template_count,
           
          -- Get clinic ID if exists
          (SELECT ur.clinica_id FROM public.user_roles ur 
           WHERE ur.user_id = $1 AND ur.ativo = true AND ur.clinica_id IS NOT NULL 
           LIMIT 1) as clinica_id
      `, [userId]);

      const status = result.rows[0];
      const isComplete = status.has_profile && status.has_role && status.has_clinic && 
                        status.has_professional && status.has_clinic_link;

      return {
        success: true,
        data: {
          onboarding_complete: isComplete,
          completion_percentage: Math.round(
            (Number(status.has_profile) + Number(status.has_role) + Number(status.has_clinic) + 
             Number(status.has_professional) + Number(status.has_clinic_link)) / 5 * 100
          ),
          steps: {
            profile: status.has_profile,
            role: status.has_role,
            clinic: status.has_clinic,
            professional: status.has_professional,
            clinic_link: status.has_clinic_link,
            templates: Number(status.template_count) > 0
          },
          template_count: Number(status.template_count),
          clinica_id: status.clinica_id
        }
      };
    } catch (error) {
      throw new Error(`Failed to check onboarding status: ${error.message}`);
    }
  }

  /**
   * Complete onboarding process
   */
  async completeOnboarding(userId, email, onboardingData) {
    // Validate input data
    const validation = this.validateOnboardingData(onboardingData);
    if (!validation.isValid) {
      throw ErrorHandler.handleBusinessError('VALIDATION_ERROR', {
        validationErrors: validation.errors
      });
    }

    try {
      // Execute complete onboarding in transaction with retry logic
      const result = await RetryManager.withRetry(async () => {
        return await transaction(async (client) => {
          const onboardingResult = {
            profile: null,
            userRole: null,
            clinic: null,
            professional: null,
            clinicProfessional: null,
            templates: []
          };

          // Step 1: Create or update user profile

          const profileResult = await this.createUserProfile(client, userId, {
            email,
            nome_completo: onboardingData.nome_completo,
            telefone: onboardingData.telefone,
            cpf: onboardingData.cpf,
            data_nascimento: onboardingData.data_nascimento,
            avatar_url: onboardingData.avatar_url
          });
          onboardingResult.profile = profileResult.data;

          // Step 2: Create user role (proprietaria)

          const roleResult = await this.createUserRole(client, userId, 'proprietaria');
          onboardingResult.userRole = roleResult.data;

          // Step 3: Create clinic

          const clinicResult = await this.createClinic(client, userId, {
            nome: onboardingData.clinica_nome,
            cnpj: onboardingData.clinica_cnpj,
            razao_social: onboardingData.clinica_razao_social,
            endereco: onboardingData.clinica_endereco,
            telefone_principal: onboardingData.clinica_telefone,
            telefone_secundario: onboardingData.clinica_telefone_secundario,
            email_contato: onboardingData.clinica_email,
            website: onboardingData.clinica_website,
            horario_funcionamento: onboardingData.clinica_horario_funcionamento,
            configuracoes: onboardingData.clinica_configuracoes
          });
          onboardingResult.clinic = clinicResult.data;

          // Step 4: Update user role with clinic ID

          await this.updateUserRoleWithClinic(client, userId, onboardingResult.clinic.id);

          // Step 5: Create professional profile

          const professionalResult = await this.createProfessional(client, userId, {
            registro_profissional: onboardingData.registro_profissional,
            tipo_registro: onboardingData.tipo_registro,
            especialidades: onboardingData.especialidades,
            biografia: onboardingData.biografia,
            experiencia_anos: onboardingData.experiencia_anos,
            formacao: onboardingData.formacao,
            certificacoes: onboardingData.certificacoes
          });
          onboardingResult.professional = professionalResult.data;

          // Step 6: Link professional to clinic

          const linkResult = await this.linkProfessionalToClinic(
            client, 
            userId, 
            onboardingResult.clinic.id,
            {
              cargo: 'Proprietário',
              especialidades: onboardingData.especialidades || [],
              horario_trabalho: onboardingData.horario_trabalho || {}
            }
          );
          onboardingResult.clinicProfessional = linkResult.data;

          // Step 7: Create default procedure templates

          const templatesResult = await this.createDefaultTemplates(
            client, 
            userId, 
            onboardingResult.clinic.id,
            onboardingData.custom_templates
          );
          onboardingResult.templates = templatesResult.data;

          return onboardingResult;
        });
      }, {
        maxRetries: 3,
        baseDelay: 1000,
        retryCondition: (error) => {
          // Retry on connection errors but not on business logic errors
          return error.code === '08003' || error.code === '08006' || error.code === '53300';
        }
      });

      return {
        success: true,
        data: result,
        message: 'Onboarding completed successfully'
      };

    } catch (error) {

      // Process error through error handler
      const processedError = ErrorHandler.processError(error);
      throw processedError;
    }
  }

  /**
   * Retry specific onboarding step
   */
  async retryOnboardingStep(userId, step, stepData) {
    try {
      let result = null;

      switch (step) {
        case 'profile':
          result = await transaction(async (client) => {
            return await this.createUserProfile(client, userId, stepData);
          });
          break;

        case 'role':
          result = await transaction(async (client) => {
            return await this.createUserRole(client, userId, stepData.role, stepData.clinica_id);
          });
          break;

        case 'clinic':
          result = await transaction(async (client) => {
            return await this.createClinic(client, userId, stepData);
          });
          break;

        case 'professional':
          result = await transaction(async (client) => {
            return await this.createProfessional(client, userId, stepData);
          });
          break;

        case 'clinic-link':
          result = await transaction(async (client) => {
            return await this.linkProfessionalToClinic(client, userId, stepData.clinica_id, stepData);
          });
          break;

        case 'templates':
          result = await transaction(async (client) => {
            return await this.createDefaultTemplates(client, userId, stepData.clinica_id, stepData.templates);
          });
          break;

        default:
          throw ErrorHandler.handleBusinessError('INVALID_INPUT', {
            message: 'Invalid onboarding step'
          });
      }

      return {
        success: true,
        data: result.data,
        message: `Step ${step} completed successfully`
      };

    } catch (error) {

      const processedError = ErrorHandler.processError(error);
      throw processedError;
    }
  }

  /**
   * Get user's onboarding data
   */
  async getOnboardingData(userId) {
    try {
      const result = await query(`
        SELECT 
          p.nome_completo,
          p.telefone,
          p.cpf,
          p.data_nascimento,
          p.avatar_url,
          c.nome as clinica_nome,
          c.cnpj as clinica_cnpj,
          c.razao_social as clinica_razao_social,
          c.endereco as clinica_endereco,
          c.telefone_principal as clinica_telefone,
          c.email_contato as clinica_email,
          c.horario_funcionamento as clinica_horario_funcionamento,
          prof.registro_profissional,
          prof.tipo_registro,
          prof.especialidades,
          prof.biografia,
          prof.experiencia_anos,
          prof.formacao,
          prof.certificacoes,
          cp.cargo,
          cp.horario_trabalho,
          ur.role
        FROM public.profiles p
        LEFT JOIN public.user_roles ur ON p.id = ur.user_id AND ur.ativo = true
        LEFT JOIN public.clinicas c ON ur.clinica_id = c.id AND c.ativo = true
        LEFT JOIN public.profissionais prof ON p.id = prof.user_id AND prof.ativo = true
        LEFT JOIN public.clinica_profissionais cp ON p.id = cp.user_id AND cp.ativo = true
        WHERE p.id = $1
      `, [userId]);

      return {
        success: true,
        data: result.rows[0] || null,
        message: 'Onboarding data retrieved successfully'
      };

    } catch (error) {
      throw new Error(`Failed to get onboarding data: ${error.message}`);
    }
  }
}

module.exports = OnboardingService;
