import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { mapUserRowToAppUser } from "@/lib/userRow";
import type { AppUser } from "@/types/db";

const PREVIEW_USERS: Record<"gestor" | "corretor", AppUser> = {
  gestor: {
    id: "preview-gestor",
    nome: "Kairos",
    email: "preview@primehouse.com.br",
    role: "gestor",
    pontuacao: 1840,
    ativo: true,
    posicao_fila: 1,
  },
  corretor: {
    id: "preview-corretor-1",
    nome: "Moreno",
    email: "marina@primehouse.com.br",
    role: "corretor",
    pontuacao: 1510,
    ativo: true,
    posicao_fila: 2,
  },
};

const PREVIEW_MODE_KEY = "prime-house-preview-mode";
const PREVIEW_ROLE_KEY = "prime-house-preview-role";

function getPreviewRole(): "gestor" | "corretor" | null {
  if (typeof window === "undefined") return null;
  if (window.localStorage.getItem(PREVIEW_MODE_KEY) !== "true") return null;
  const r = window.localStorage.getItem(PREVIEW_ROLE_KEY);
  return r === "corretor" ? "corretor" : "gestor";
}

function setPreviewMode(role: "gestor" | "corretor" | null) {
  if (typeof window === "undefined") return;
  if (role) {
    window.localStorage.setItem(PREVIEW_MODE_KEY, "true");
    window.localStorage.setItem(PREVIEW_ROLE_KEY, role);
  } else {
    window.localStorage.removeItem(PREVIEW_MODE_KEY);
    window.localStorage.removeItem(PREVIEW_ROLE_KEY);
  }
}

interface UserContextValue {
  loading: boolean;
  user: AppUser | null;
  refresh: () => Promise<AppUser | null>;
  signOut: () => Promise<void>;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

async function loadAppUser(email: string): Promise<AppUser | null> {
  const normalized = email.trim();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("email", normalized)
    .limit(1);
  if (error) {
    // eslint-disable-next-line no-console
    console.error("Falha ao carregar usuário:", error.message);
    return null;
  }
  const row = data?.[0];
  if (!row) return null;
  return mapUserRowToAppUser(row);
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AppUser | null>(null);

  const sync = async (): Promise<AppUser | null> => {
    const previewRole = getPreviewRole();
    if (previewRole) {
      const u = PREVIEW_USERS[previewRole];
      setUser(u);
      setLoading(false);
      return u;
    }
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user.email;
    if (!email) {
      setUser(null);
      setLoading(false);
      return null;
    }
    const appUser = await loadAppUser(email);
    setUser(appUser);
    setLoading(false);
    return appUser;
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
      setPreviewMode(null);
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
