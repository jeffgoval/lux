import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { generateAuthDebugReport, logAuthDebugReport, exportAuthDebugReport, quickAuthHealthCheck } from '@/utils/authDebugger';
import { runSignupTest } from '@/utils/signupTestHelper';
import { comprehensiveUserDataRecovery } from '@/utils/userDataRecovery';
import { toast } from 'sonner';

export function DevTools() {
  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, refreshProfile, fixMissingUserData } = useAuth();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const handleHealthCheck = async () => {
    setLoading(true);
    try {
      const isHealthy = await quickAuthHealthCheck();
      toast.success(isHealthy ? 'Auth system is healthy' : 'Auth system has issues - check console');
    } catch (error) {
      toast.error('Health check failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    try {
      const report = await generateAuthDebugReport(user || undefined);
      logAuthDebugReport(report);
      toast.success('Debug report generated - check console');
    } catch (error) {
      toast.error('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async () => {
    setLoading(true);
    try {
      const report = await generateAuthDebugReport(user || undefined);
      exportAuthDebugReport(report);
      toast.success('Debug report exported');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setLoading(false);
    }
  };

  const handleRunSignupTest = async () => {
    setLoading(true);
    try {
      await runSignupTest(testEmail || undefined);
      toast.success('Signup test completed - check console');
    } catch (error) {
      toast.error('Signup test failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFixUserData = async () => {
    if (!user) {
      toast.error('No user logged in');
      return;
    }

    setLoading(true);
    try {
      const result = await comprehensiveUserDataRecovery(user);
      if (result.success) {
        toast.success('User data recovery completed');
        await refreshProfile();
      } else {
        toast.error(`Recovery failed: ${result.error}`);
      }
    } catch (error) {
      toast.error('Recovery failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshProfile = async () => {
    setLoading(true);
    try {
      await refreshProfile();
      toast.success('Profile refreshed');
    } catch (error) {
      toast.error('Failed to refresh profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="fixed bottom-4 right-4 w-80 max-h-96 overflow-y-auto z-50 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          🛠️ Dev Tools
          <Badge variant="outline" className="text-xs">DEV</Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          Development utilities for auth debugging
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Current User Info */}
        <div className="text-xs">
          <strong>User:</strong> {user?.email || 'Not logged in'}
        </div>
        
        <Separator />
        
        {/* Auth Debugging */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Auth Debugging</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleHealthCheck}
              disabled={loading}
              className="text-xs h-8"
            >
              Health Check
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateReport}
              disabled={loading}
              className="text-xs h-8"
            >
              Debug Report
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportReport}
            disabled={loading}
            className="text-xs h-8 w-full"
          >
            Export Report
          </Button>
        </div>
        
        <Separator />
        
        {/* User Data Recovery */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">User Data</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleFixUserData}
              disabled={loading || !user}
              className="text-xs h-8"
            >
              Fix Data
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefreshProfile}
              disabled={loading}
              className="text-xs h-8"
            >
              Refresh
            </Button>
          </div>
        </div>
        
        <Separator />
        
        {/* Signup Testing */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Signup Testing</Label>
          <Input
            placeholder="test@example.com"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="text-xs h-8"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={handleRunSignupTest}
            disabled={loading}
            className="text-xs h-8 w-full"
          >
            Run Signup Test
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Check browser console for detailed logs
        </div>
      </CardContent>
    </Card>
  );
}