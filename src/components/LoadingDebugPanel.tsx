import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bug, 
  Clock, 
  AlertTriangle, 
  Download, 
  Trash2,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { loadingManager } from '@/utils/loadingManager';
import { getLoadingReport, exportLoadingDiagnostics, checkLoadingIssues } from '@/utils/loadingDiagnostics';

export function LoadingDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState<any>({});
  const [issues, setIssues] = useState<string[]>([]);
  
  const { isLoading, isProfileLoading, isRolesLoading, profile, roles, currentRole } = useAuth();
  const { navigationState } = useNavigation();

  // Update stats periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingStats(loadingManager.getLoadingStats());
      setReport(getLoadingReport());
      setIssues(checkLoadingIssues());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleExportDiagnostics = () => {
    const data = exportLoadingDiagnostics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `loading-diagnostics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleForceStopAll = () => {
    loadingManager.forceStopAll();
    setLoadingStats({});
  };

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <>
      {/* Debug Toggle Button */}
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur"
        >
          <Bug className="h-4 w-4 mr-2" />
          Loading Debug
        </Button>
      </div>

      {/* Debug Panel */}
      {isOpen && (
        <div className="fixed bottom-16 right-4 w-96 max-h-[600px] z-50">
          <Card className="bg-background/95 backdrop-blur border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center">
                  <Bug className="h-4 w-4 mr-2" />
                  Loading Debug Panel
                </span>
                <Button
                  onClick={() => setIsOpen(false)}
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            
            <CardContent className="space-y-4 text-xs">
              {/* Current Auth State */}
              <div>
                <h4 className="font-medium mb-2">Auth State</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Auth Loading:</span>
                    <Badge variant={isLoading ? "destructive" : "secondary"}>
                      {isLoading ? "Loading" : "Ready"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Profile Loading:</span>
                    <Badge variant={isProfileLoading ? "destructive" : "secondary"}>
                      {isProfileLoading ? "Loading" : "Ready"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Roles Loading:</span>
                    <Badge variant={isRolesLoading ? "destructive" : "secondary"}>
                      {isRolesLoading ? "Loading" : "Ready"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Has Profile:</span>
                    <Badge variant={profile ? "default" : "destructive"}>
                      {profile ? "Yes" : "No"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Roles Count:</span>
                    <Badge variant={roles.length > 0 ? "default" : "destructive"}>
                      {roles.length}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Role:</span>
                    <Badge variant={currentRole ? "default" : "secondary"}>
                      {currentRole || "None"}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Navigation State */}
              <div>
                <h4 className="font-medium mb-2">Navigation</h4>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Current Path:</span>
                    <span className="truncate max-w-32">{navigationState.currentPath}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Is Loading:</span>
                    <Badge variant={navigationState.isLoading ? "destructive" : "secondary"}>
                      {navigationState.isLoading ? "Loading" : "Ready"}
                    </Badge>
                  </div>
                  {navigationState.error && (
                    <div className="text-red-500 text-xs">
                      Error: {navigationState.error}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Active Loadings */}
              <div>
                <h4 className="font-medium mb-2">Active Loadings</h4>
                {Object.keys(loadingStats).length > 0 ? (
                  <ScrollArea className="h-20">
                    <div className="space-y-1">
                      {Object.entries(loadingStats).map(([key, stats]: [string, any]) => (
                        <div key={key} className="flex justify-between items-center">
                          <span className="truncate max-w-32">{key}</span>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{Math.round(stats.duration / 1000)}s</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-muted-foreground">No active loadings</div>
                )}
              </div>

              <Separator />

              {/* Issues */}
              {issues.length > 0 && (
                <>
                  <div>
                    <h4 className="font-medium mb-2 text-red-500 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Issues Detected
                    </h4>
                    <div className="space-y-1">
                      {issues.map((issue, index) => (
                        <div key={index} className="text-red-500 text-xs">
                          • {issue}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Report Summary */}
              {report && (
                <div>
                  <h4 className="font-medium mb-2">Report Summary</h4>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Total Diagnostics:</span>
                      <span>{report.totalDiagnostics}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Long Loadings:</span>
                      <span className={report.longLoadings?.length > 0 ? "text-yellow-500" : ""}>
                        {report.longLoadings?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Infinite Loadings:</span>
                      <span className={report.infiniteLoadings?.length > 0 ? "text-red-500" : ""}>
                        {report.infiniteLoadings?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg Loading Time:</span>
                      <span>{report.averageLoadingTime}ms</span>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex space-x-2">
                <Button
                  onClick={handleExportDiagnostics}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Download className="h-3 w-3 mr-1" />
                  Export
                </Button>
                <Button
                  onClick={handleForceStopAll}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Stop All
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Reload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}