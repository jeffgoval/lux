require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const clinicasRoutes = require('./routes/clinicas');
const usersRoutes = require('./routes/users');
const onboardingRoutes = require('./routes/onboarding');

const app = express();
// DigitalOcean App Platform usa porta 8080
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clinicas', clinicasRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/onboarding', onboardingRoutes);

// Health check endpoints
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Clínica Backend - Funcionando sem RLS!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Backend funcionando sem RLS!',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Health check passed',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint não encontrado',
    path: req.originalUrl,
    method: req.method
  });
});

// Import error handler
const { errorHandlerMiddleware } = require('./middleware/errorHandler');

// Error handler
app.use(errorHandlerMiddleware);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`🚀 Clínica Backend Started Successfully`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`🌐 Host: 0.0.0.0`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`🎉 Sem RLS, sem dor de cabeça!`);
  console.log('='.repeat(50));
  
  // Test database connection on startup
  if (process.env.DATABASE_URL) {
    console.log('🔍 Testing database connection...');
    const { query } = require('./db/connection');
    query('SELECT NOW() as current_time')
      .then(result => {
        console.log('✅ Database connected successfully');
        console.log(`⏰ DB Time: ${result.rows[0].current_time}`);
      })
      .catch(err => {
        console.error('❌ Database connection failed:', err.message);
      });
  } else {
    console.warn('⚠️  DATABASE_URL not set');
  }
});