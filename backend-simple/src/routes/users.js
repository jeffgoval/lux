const express = require('express');
const { query } = require('../db/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// Buscar perfil do usuário atual
router.get('/profile', async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.email, u.nome_completo, u.telefone, u.created_at,
             array_agg(
               json_build_object(
                 'role', ur.role,
                 'clinica_id', ur.clinica_id,
                 'ativo', ur.ativo
               )
             ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.ativo = true
      WHERE u.id = $1 AND u.ativo = true
      GROUP BY u.id, u.email, u.nome_completo, u.telefone, u.created_at
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Atualizar perfil do usuário
router.put('/profile', async (req, res) => {
  try {
    const { nome_completo, telefone } = req.body;

    if (!nome_completo) {
      return res.status(400).json({
        success: false,
        error: 'Nome completo é obrigatório'
      });
    }

    const result = await query(`
      UPDATE users 
      SET nome_completo = $1, telefone = $2, updated_at = NOW()
      WHERE id = $3 
      RETURNING id, email, nome_completo, telefone
    `, [nome_completo, telefone, req.user.id]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Listar usuários da clínica (apenas para proprietários/gerentes)
router.get('/clinica/:clinicaId', requireRole(['proprietaria', 'gerente', 'super_admin']), async (req, res) => {
  try {
    const { clinicaId } = req.params;

    // Verificar se o usuário tem acesso à clínica
    const accessCheck = await query(`
      SELECT 1 FROM user_roles 
      WHERE user_id = $1 AND clinica_id = $2 AND ativo = true
    `, [req.user.id, clinicaId]);

    if (accessCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Sem acesso a esta clínica'
      });
    }

    // Buscar usuários da clínica
    const result = await query(`
      SELECT u.id, u.email, u.nome_completo, u.telefone, u.created_at,
             ur.role, ur.ativo as role_ativo
      FROM users u
      INNER JOIN user_roles ur ON ur.user_id = u.id
      WHERE ur.clinica_id = $1 AND u.ativo = true
      ORDER BY ur.role, u.nome_completo
    `, [clinicaId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;
