const express = require('express');
const { query, transaction } = require('../db/connection');
const { authenticateToken } = require('../middleware/auth');
const { validateOnboardingData } = require('../middleware/validation');
const { asyncErrorHandler, RetryManager } = require('../middleware/errorHandler');
const OnboardingService = require('../services/OnboardingService');

const router = express.Router();
const onboardingService = new OnboardingService();

// =====================================================
// COMPLETE ONBOARDING ENDPOINT
// Handles the entire onboarding flow in a single transaction
// =====================================================

router.post('/complete', authenticateToken, validateOnboardingData, asyncErrorHandler(async (req, res) => {
  const userId = req.user.userId;
  const email = req.user.email;

  // Use OnboardingService to handle the complete process
  const result = await onboardingService.completeOnboarding(userId, email, req.body);

  // Return success response
  res.status(201).json({
    success: true,
    message: 'Onboarding concluído com sucesso!',
    data: {
      user: {
        id: userId,
        email: email,
        profile: result.data.profile,
        role: result.data.userRole
      },
      clinic: result.data.clinic,
      professional: result.data.professional,
      clinicProfessional: result.data.clinicProfessional,
      templates: result.data.templates,
      summary: {
        profile_created: !!result.data.profile,
        role_created: !!result.data.userRole,
        clinic_created: !!result.data.clinic,
        professional_created: !!result.data.professional,
        clinic_link_created: !!result.data.clinicProfessional,
        templates_created: result.data.templates.length
      }
    }
  });
}));

// =====================================================
// ONBOARDING STATUS CHECK
// =====================================================

router.get('/status', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.userId;

  // Use OnboardingService to check status
  const result = await onboardingService.checkOnboardingStatus(userId);

  res.json({
    success: true,
    data: result.data
  });
}));

// =====================================================
// RETRY FAILED ONBOARDING STEP
// =====================================================

router.post('/retry/:step', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.userId;
  const step = req.params.step;
  const stepData = req.body;

  // Use OnboardingService to retry step
  const result = await onboardingService.retryOnboardingStep(userId, step, stepData);

  res.json({
    success: true,
    message: result.message,
    data: result.data
  });
}));

// Get user's onboarding data
router.get('/data', authenticateToken, asyncErrorHandler(async (req, res) => {
  const userId = req.user.userId;

  // Use OnboardingService to get data
  const result = await onboardingService.getOnboardingData(userId);

  res.json({
    success: true,
    data: result.data,
    message: result.message
  });
}));

module.exports = router;