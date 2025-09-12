const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query, transaction } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const { validateRegistrationData, validateLoginData } = require('../middleware/validation');
const { asyncErrorHandler } = require('../middleware/errorHandler');

const router = express.Router();

// Login - SEM RLS, SEM COMPLICAÇÃO
router.post('/login', validateLoginData, asyncErrorHandler(async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email e senha são obrigatórios'
      });
    }

    // Query simples - sem RLS
    const result = await query(
      'SELECT id, email, password_hash, nome_completo, ativo FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    const user = result.rows[0];

    if (!user.ativo) {
      return res.status(401).json({
        success: false,
        error: 'Usuário inativo'
      });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas'
      });
    }

    // Buscar roles do usuário
    const rolesResult = await query(
      'SELECT role, clinica_id FROM user_roles WHERE user_id = $1 AND ativo = true',
      [user.id]
    );

    // Gerar JWT
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          nome_completo: user.nome_completo,
          roles: rolesResult.rows
        },
        token
      }
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}));

// Registro - SIMPLES
router.post('/register', validateRegistrationData, asyncErrorHandler(async (req, res) => {
  try {
    const { email, password, nome_completo, telefone } = req.body;

    if (!email || !password || !nome_completo) {
      return res.status(400).json({
        success: false,
        error: 'Email, senha e nome são obrigatórios'
      });
    }

    // Verificar se email já existe
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Email já cadastrado'
      });
    }

    // Hash da senha
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Criar usuário e role em transação
    const result = await transaction(async (client) => {
      // Inserir usuário
      const userResult = await client.query(
        'INSERT INTO users (email, password_hash, nome_completo, telefone) VALUES ($1, $2, $3, $4) RETURNING id, email, nome_completo',
        [email.toLowerCase(), password_hash, nome_completo, telefone]
      );

      const newUser = userResult.rows[0];

      // Inserir role padrão
      await client.query(
        'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
        [newUser.id, 'proprietaria']
      );

      return newUser;
    });

    res.status(201).json({
      success: true,
      data: {
        user: result,
        message: 'Usuário criado com sucesso'
      }
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
}));

// Verificar token
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Buscar roles atualizadas
    const rolesResult = await query(
      'SELECT role, clinica_id FROM user_roles WHERE user_id = $1 AND ativo = true',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        user: {
          ...req.user,
          roles: rolesResult.rows
        }
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

// Logout (opcional - JWT é stateless)
router.post('/logout', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

module.exports = router;