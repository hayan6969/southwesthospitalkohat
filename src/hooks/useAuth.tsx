
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserProfile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'admin' | 'doctor' | 'staff' | 'pharmacy' | 'patient' | 'finance';
  department_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: { first_name: string; last_name: string; role?: string }) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  createUserAccount: (userData: { email: string; password: string; first_name: string; last_name: string; role: string; phone?: string; department_id?: string }) => Promise<{ error: any }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        // If profile doesn't exist, return null but don't throw
        if (error.code === 'PGRST116') {
          console.log('No profile found for user, this might be a new user');
          return null;
        }
        return null;
      }

      if (data) {
        console.log('Profile fetched successfully:', data);
        // Cast the role to the proper type
        const profile: UserProfile = {
          ...data,
          role: data.role as 'admin' | 'doctor' | 'staff' | 'pharmacy' | 'patient' | 'finance'
        };
        
        return profile;
      }

      console.log('No profile data returned');
      return null;
    } catch (error) {
      console.error('Exception while fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            if (!mounted) return;
            
            try {
              const profileData = await fetchUserProfile(session.user.id);
              if (mounted) {
                console.log('📝 Setting profile data from auth state change:', profileData);
                setProfile(profileData);
                setLoading(false);
              }
            } catch (error) {
              console.error('Error in profile fetch timeout:', error);
              if (mounted) {
                setLoading(false);
              }
            }
          }, 50);
        } else {
          if (mounted) {
            setProfile(null);
            setLoading(false);
          }
        }
      }
    );

    // Check for existing session
    const initializeAuth = async () => {
      try {
        console.log('🔍 Initializing auth...');
        
        const { data: { session: onlineSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        } else if (onlineSession?.user) {
          console.log('✅ Found active online session for:', onlineSession.user.email);
          const currentProfile = await fetchUserProfile(onlineSession.user.id);
          
          if (mounted) {
            setSession(onlineSession);
            setUser(onlineSession.user);
            setProfile(currentProfile);
          }
        }
        
        if (mounted) {
          setLoading(false);
        }
        
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      if (data.user) {
        const profileData = await fetchUserProfile(data.user.id);
        console.log('User signed in:', data.user.email);
        
        // Check if user account is active
        if (profileData && !profileData.is_active) {
          await supabase.auth.signOut();
          return { error: { message: "Your account has been temporarily blocked. Please contact the administrator." } };
        }
        
        // Redirect based on user role
        if (profileData?.role) {
          console.log('Redirecting to dashboard for role:', profileData.role);
          setTimeout(() => {
            window.location.href = `/dashboard/${profileData.role}`;
          }, 100); // Small delay to ensure state is updated
        }
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: { first_name: string; last_name: string; role?: string }) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            role: userData.role || 'patient'
          }
        }
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const createUserAccount = async (userData: { 
    email: string; 
    password: string; 
    first_name: string; 
    last_name: string; 
    role: string; 
    phone?: string; 
    department_id?: string 
  }) => {
    try {
      // Use regular sign up instead of admin API
      const tempPassword = userData.password || `TempPass${Math.random().toString(36).slice(-8)}!`;
      
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: tempPassword,
        options: {
          data: {
            first_name: userData.first_name,
            last_name: userData.last_name,
            role: userData.role
          }
        }
      });

      if (error) return { error };

      // Update the profile with additional data
      if (data.user && data.user.id) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            phone: userData.phone,
            department_id: userData.department_id
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.error('Error updating profile:', profileError);
        }

        // Audit logging can be added later via a separate hook
        console.log('User account created:', userData.email);
      }

      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const cleanupAuthState = () => {
    // Remove cached session and profiles
    localStorage.removeItem('cached_session');
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('profile_')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove standard auth tokens
    localStorage.removeItem('supabase.auth.token');
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    // Remove from sessionStorage if in use
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const signOut = async () => {
    try {
      if (user) {
        console.log('User signed out:', user.email);
      }
      
      // Clean up auth state first
      cleanupAuthState();
      
      // Attempt global sign out (fallback if it fails)
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors as we already cleaned up locally
      }
      
      setUser(null);
      setProfile(null);
      setSession(null);
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, force logout
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    createUserAccount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.error('useAuth called outside of AuthProvider context');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
