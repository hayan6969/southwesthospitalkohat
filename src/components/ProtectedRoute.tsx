
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const [graceElapsed, setGraceElapsed] = useState(false);

  // Give the auth listener a brief window to hydrate from localStorage before
  // we kick anyone out — otherwise fast-loading protected pages on slow
  // machines (old Windows/Chrome) can bounce authenticated users back to
  // /auth for a fraction of a second and cause a login loop.
  useEffect(() => {
    const t = setTimeout(() => setGraceElapsed(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && graceElapsed && !user) {
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
