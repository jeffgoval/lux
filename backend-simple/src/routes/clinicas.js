const express = require('express');
const { query, transaction } = require('../db/connection');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// Listar clínicas do usuário - SEM RLS
router.get('/', async (req, res) => {
  try {
    // Query simples - buscar clínicas onde o usuário tem acesso
    const result = await query(`
      SELECT DISTINCT c.* 
      FROM clinicas c
      INNER JOIN user_roles ur ON ur.clinica_id = c.id
      WHERE ur.user_id = $1 AND ur.ativo = true AND c.ativo = true
      ORDER BY c.created_at DESC
    `, [req.user.id]);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Erro ao listar clínicas:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Criar clínica - SIMPLES
router.post('/', requireRole(['proprietaria', 'super_admin']), async (req, res) => {
  try {
    const {
      nome,
      cnpj,
      endereco,
      telefone,
      email,
      horario_funcionamento
    } = req.body;

    if (!nome) {
      return res.status(400).json({
        success: false,
        error: 'Nome da clínica é obrigatório'
      });
    }

    // Criar clínica e vincular usuário em transação
    const result = await transaction(async (client) => {
      // Inserir clínica
      const clinicaResult = await client.query(`
        INSERT INTO clinicas (
          nome, cnpj, endereco, telefone, email, 
          horario_funcionamento, owner_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7) 
        RETURNING *
      `, [
        nome,
        cnpj,
        endereco,
        telefone,
        email,
        horario_funcionamento,
        req.user.id
      ]);

      const novaClinica = clinicaResult.rows[0];

      // Atualizar role do usuário com a clínica
      await client.query(`
        UPDATE user_roles 
        SET clinica_id = $1 
        WHERE user_id = $2 AND role = 'proprietaria' AND clinica_id IS NULL
      `, [novaClinica.id, req.user.id]);

      return novaClinica;
    });

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Erro ao criar clínica:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Buscar clínica por ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se usuário tem acesso à clínica
    const result = await query(`
      SELECT c.* 
      FROM clinicas c
      INNER JOIN user_roles ur ON ur.clinica_id = c.id
      WHERE c.id = $1 AND ur.user_id = $2 AND ur.ativo = true AND c.ativo = true
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Clínica não encontrada ou sem acesso'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao buscar clínica:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Atualizar clínica
router.put('/:id', requireRole(['proprietaria', 'gerente', 'super_admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      cnpj,
      endereco,
      telefone,
      email,
      horario_funcionamento
    } = req.body;

    // Verificar se usuário tem acesso à clínica
    const accessCheck = await query(`
      SELECT 1 
      FROM clinicas c
      INNER JOIN user_roles ur ON ur.clinica_id = c.id
      WHERE c.id = $1 AND ur.user_id = $2 AND ur.ativo = true
    `, [id, req.user.id]);

    if (accessCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Clínica não encontrada ou sem acesso'
      });
    }

    // Atualizar clínica
    const result = await query(`
      UPDATE clinicas 
      SET nome = $1, cnpj = $2, endereco = $3, telefone = $4, 
          email = $5, horario_funcionamento = $6, updated_at = NOW()
      WHERE id = $7 
      RETURNING *
    `, [nome, cnpj, endereco, telefone, email, horario_funcionamento, id]);

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar clínica:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

module.exports = router;