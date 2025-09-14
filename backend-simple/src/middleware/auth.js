const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');

// Middleware de autenticação SIMPLES - sem RLS
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token de acesso requerido' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Buscar usuário no banco - query simples
    const result = await query(
      'SELECT id, email, nome_completo, ativo FROM users WHERE id = $1 AND ativo = true',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        success: false, 
        error: 'Usuário não encontrado ou inativo' 
      });
    }

    req.user = result.rows[0];
    next();
  } catch (error) {

    return res.status(403).json({ 
      success: false, 
      error: 'Token inválido' 
    });
  }
};

// Middleware para verificar roles - SIMPLES
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const result = await query(
        'SELECT role FROM user_roles WHERE user_id = $1 AND ativo = true',
        [req.user.id]
      );

      const userRoles = result.rows.map(row => row.role);
      const hasPermission = allowedRoles.some(role => userRoles.includes(role));

      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          error: 'Permissão insuficiente' 
        });
      }

      req.userRoles = userRoles;
      next();
    } catch (error) {

      return res.status(500).json({ 
        success: false, 
        error: 'Erro interno do servidor' 
      });
    }
  };
};

module.exports = {
  authenticateToken,
  requireRole
};
