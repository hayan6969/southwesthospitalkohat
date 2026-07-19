
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { logAuthEvent } from '@/utils/authDebug';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const [graceElapsed, setGraceElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setGraceElapsed(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && graceElapsed && !user) {
      logAuthEvent({
        kind: 'redirect',
        where: 'ProtectedRoute',
        message: `no user after grace → /auth (from ${window.location.pathname})`,
      });
      window.location.href = '/auth';
    }
  }, [user, loading, graceElapsed]);

  if (loading || (!user && !graceElapsed)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const role = profile?.role;
  if (allowedRoles && role && role !== 'super_admin' && !allowedRoles.includes(role)) {
    logAuthEvent({
      kind: 'warn',
      where: 'ProtectedRoute',
      message: `role "${role}" not in [${allowedRoles.join(',')}] on ${window.location.pathname}`,
    });
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-800 mb-4">Access Denied</h1>
          <p className="text-red-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
