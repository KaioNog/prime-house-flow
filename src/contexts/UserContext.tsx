import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { AppUser } from "@/types/db";

interface UserContextValue {
  loading: boolean;
  user: AppUser | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

async function loadAppUser(email: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();
  if (error) {
    // eslint-disable-next-line no-console
    console.error("Falha ao carregar usuário:", error.message);
    return null;
  }
  return (data as AppUser) ?? null;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);

  const sync = async () => {
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user.email;
    if (!email) {
      setUser(null);
      setLoading(false);
      return;
    }
    const appUser = await loadAppUser(email);
    setUser(appUser);
    setLoading(false);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user.email) {
        loadAppUser(session.user.email).then(setUser);
      } else {
        setUser(null);
      }
    });
    sync();
    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: UserContextValue = {
    loading,
    user,
    refresh: sync,
    signOut: async () => {
      await supabase.auth.signOut();
      setUser(null);
    },
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
}
