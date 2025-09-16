/**
 * React hook for integrity verification
 * Provides reactive integrity checking with loading states and error handling
 */

import { useState, useCallback, useEffect } from 'react';
import { integrityVerificationService, type UserIntegrityReport } from '@/services/integrity-verification.service';

export const useIntegrityVerification = (userId?: string) => {
  const [report, setReport] = useState<UserIntegrityReport | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyIntegrity = useCallback(async (targetUserId?: string) => {
    const userIdToCheck = targetUserId || userId;
    
    if (!userIdToCheck) {
      setError('User ID é obrigatório para verificação de integridade');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const integrityReport = await integrityVerificationService.generateIntegrityReport(userIdToCheck);
      setReport(integrityReport);
    } catch (err) {
      setError('Erro ao verificar integridade dos dados');
      setReport(null);
    } finally {
      setIsVerifying(false);
    }
  }, [userId]);

  const autoFix = useCallback(async (targetUserId?: string) => {
    const userIdToCheck = targetUserId || userId;
    
    if (!userIdToCheck) {
      setError('User ID é obrigatório para auto-correção');
      return null;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const fixResult = await integrityVerificationService.autoFixIntegrityIssues(userIdToCheck);
      
      // Re-verify after auto-fix
      await verifyIntegrity(userIdToCheck);
      
      return fixResult;
    } catch (err) {
      setError('Erro durante auto-correção');
      return null;
    } finally {
      setIsVerifying(false);
    }
  }, [userId, verifyIntegrity]);

  // Auto-verify when userId changes
  useEffect(() => {
    if (userId) {
      verifyIntegrity(userId);
    }
  }, [userId, verifyIntegrity]);

  return {
    report,
    isVerifying,
    error,
    verifyIntegrity,
    autoFix,
    hasErrors: report?.overallStatus === 'invalid',
    hasWarnings: report?.overallStatus === 'warning',
    isValid: report?.overallStatus === 'valid',
    summary: report?.summary,
    recommendations: report?.recommendations || []
  };
};

// Hook for batch integrity verification
export const useBatchIntegrityVerification = () => {
  const [reports, setReports] = useState<UserIntegrityReport[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const verifyBatch = useCallback(async (userIds: string[]) => {
    if (!userIds.length) {
      setError('Lista de usuários não pode estar vazia');
      return;
    }

    setIsVerifying(true);
    setError(null);
    setProgress({ current: 0, total: userIds.length });
    setReports([]);

    try {
      const batchReports = await integrityVerificationService.batchIntegrityCheck(userIds);
      setReports(batchReports);
      setProgress({ current: userIds.length, total: userIds.length });
    } catch (err) {
      setError('Erro ao verificar integridade em lote');
      setReports([]);
    } finally {
      setIsVerifying(false);
    }
  }, []);

  const getStatistics = useCallback(() => {
    if (!reports.length) return null;

    const stats = {
      total: reports.length,
      valid: reports.filter(r => r.overallStatus === 'valid').length,
      invalid: reports.filter(r => r.overallStatus === 'invalid').length,
      warning: reports.filter(r => r.overallStatus === 'warning').length,
      mostCommonIssues: [] as string[]
    };

    // Calculate most common issues
    const issueCount: Record<string, number> = {};
    reports.forEach(report => {
      Object.values(report.checks).forEach(check => {
        check.errors.forEach(error => {
          issueCount[error] = (issueCount[error] || 0) + 1;
        });
      });
    });

    stats.mostCommonIssues = Object.entries(issueCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([issue]) => issue);

    return stats;
  }, [reports]);

  return {
    reports,
    isVerifying,
    error,
    progress,
    verifyBatch,
    statistics: getStatistics(),
    clearReports: () => setReports([])
  };
};

// Hook for real-time integrity monitoring
export const useIntegrityMonitoring = (userId: string, intervalMs: number = 60000) => {
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { report, isVerifying, error, verifyIntegrity } = useIntegrityVerification(userId);

  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  useEffect(() => {
    if (!isMonitoring || !userId) return;

    const interval = setInterval(async () => {
      await verifyIntegrity();
      setLastCheck(new Date());
    }, intervalMs);

    // Initial check
    verifyIntegrity();
    setLastCheck(new Date());

    return () => clearInterval(interval);
  }, [isMonitoring, userId, intervalMs, verifyIntegrity]);

  return {
    report,
    isVerifying,
    error,
    lastCheck,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    forceCheck: () => verifyIntegrity()
  };
};