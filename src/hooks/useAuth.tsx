import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdmin = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const runAdminCheck = (event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (event === "TOKEN_REFRESHED") {
        return;
      }
      if (!session?.user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      void (async () => {
        await checkAdmin(session.user.id);
        if (mounted) setLoading(false);
      })();
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(runAdminCheck);

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkAdmin]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
