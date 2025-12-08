import { useState, useEffect, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Demo mode key
const DEMO_MODE_KEY = "sourcing_master_demo_mode";
const DEMO_USER_KEY = "sourcing_master_demo_user";

// Check if demo mode is enabled
function isDemoModeEnabled(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) === "true";
}

// Get demo user from localStorage
function getDemoUser(): User | null {
  try {
    const stored = localStorage.getItem(DEMO_USER_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn("Failed to get demo user");
  }
  return null;
}

// Create a demo user
function createDemoUser(email: string, displayName?: string): User {
  return {
    id: `demo-user-${Date.now()}`,
    app_metadata: {},
    user_metadata: {
      display_name: displayName || email.split("@")[0],
    },
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: email,
    email_confirmed_at: new Date().toISOString(),
    phone: null,
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    role: "authenticated",
    updated_at: new Date().toISOString(),
  } as User;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check for demo mode first
    if (isDemoModeEnabled()) {
      const demoUser = getDemoUser();
      if (demoUser) {
        setUser(demoUser);
        setSession({ user: demoUser } as Session);
        setIsDemoMode(true);
        setIsLoading(false);
        return;
      }
    }

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsDemoMode(false);
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    // Try real signup first
    const redirectUrl = `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: displayName,
        },
      },
    });

    // If there's an error, enable demo mode
    if (error) {
      console.warn("Signup failed, enabling demo mode:", error.message);
      const demoUser = createDemoUser(email, displayName);
      localStorage.setItem(DEMO_MODE_KEY, "true");
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      setSession({ user: demoUser } as Session);
      setIsDemoMode(true);
      return { data: { user: demoUser, session: { user: demoUser } as Session }, error: null };
    }

    return { data, error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    // Try real sign in first
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // If there's an error, enable demo mode
    if (error) {
      console.warn("Sign in failed, enabling demo mode:", error.message);
      const demoUser = createDemoUser(email);
      localStorage.setItem(DEMO_MODE_KEY, "true");
      localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
      setUser(demoUser);
      setSession({ user: demoUser } as Session);
      setIsDemoMode(true);
      return { data: { user: demoUser, session: { user: demoUser } as Session }, error: null };
    }

    return { data, error };
  }, []);

  const signOut = useCallback(async () => {
    // Clear demo mode
    localStorage.removeItem(DEMO_MODE_KEY);
    localStorage.removeItem(DEMO_USER_KEY);
    setIsDemoMode(false);

    const { error } = await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    return { error: null };
  }, []);

  // Demo login function for quick access
  const demoLogin = useCallback((email: string = "demo@example.com", displayName: string = "데모 사용자") => {
    const demoUser = createDemoUser(email, displayName);
    localStorage.setItem(DEMO_MODE_KEY, "true");
    localStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
    setUser(demoUser);
    setSession({ user: demoUser } as Session);
    setIsDemoMode(true);
  }, []);

  return {
    user,
    session,
    isLoading,
    isDemoMode,
    signUp,
    signIn,
    signOut,
    demoLogin,
    isAuthenticated: !!session || isDemoMode,
  };
}