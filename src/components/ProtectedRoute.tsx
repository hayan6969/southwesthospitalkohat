
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  // Check for offline staff mode first, before using auth context
  const [shouldRedirectOffline, setShouldRedirectOffline] = useState(false);

  useEffect(() => {
    if (!navigator.onLine) {
      const cachedSession = localStorage.getItem('cached_session');
      if (cachedSession) {
        try {
          const parsedSession = JSON.parse(cachedSession);
          const cachedProfile = localStorage.getItem(`profile_${parsedSession.user.id}`);
          if (cachedProfile) {
            const parsedProfile = JSON.parse(cachedProfile);
            if (parsedProfile.role === 'staff') {
              console.log('📱 Redirecting offline staff to offline mode');
              setShouldRedirectOffline(true);
              window.location.href = '/offline-mode';
              return;
            }
          }
        } catch (error) {
          console.error('Error checking offline mode:', error);
        }
      }
    }
  }, []);

  // Show loading if we're redirecting to offline mode
  if (shouldRedirectOffline) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/auth';
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
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
