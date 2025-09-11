import { useAuth } from '@/contexts/AuthContext';

export function AuthDebugInfo() {
  const { user, profile, roles, currentRole, isAuthenticated, isLoading } = useAuth();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h3 className="font-bold mb-2">Auth Debug Info</h3>
      <div className="space-y-1">
        <div>User: {user?.email || 'null'}</div>
        <div>Authenticated: {isAuthenticated ? 'true' : 'false'}</div>
        <div>Loading: {isLoading ? 'true' : 'false'}</div>
        <div>Profile: {profile ? `ID: ${profile.id}` : 'null'}</div>
        <div>Primeiro Acesso: {profile?.primeiro_acesso ? 'true' : 'false'}</div>
        <div>Roles: {roles.length > 0 ? roles.map(r => r.role).join(', ') : 'none'}</div>
        <div>Current Role: {currentRole || 'null'}</div>
      </div>
    </div>
  );
}
