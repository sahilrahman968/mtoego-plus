"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  fetchCurrentUser,
  logout as apiLogout,
  googleAuth as apiGoogleAuth,
  type UserData,
} from "@/lib/store-api";

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  googleSignIn: (
    credential: string
  ) => Promise<{ success: boolean; message: string; user?: UserData }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetchCurrentUser();
      if (res.success && res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh().finally(() => setIsLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const googleSignIn = useCallback(async (credential: string) => {
    const res = await apiGoogleAuth(credential);
    if (res.success && res.data?.user) {
      setUser(res.data.user);
      return { success: true, message: res.message, user: res.data.user };
    }
    return { success: false, message: res.message || "Google sign-in failed" };
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        googleSignIn,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
