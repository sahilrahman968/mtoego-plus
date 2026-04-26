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
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  googleAuth as apiGoogleAuth,
  sendOtp as apiSendOtp,
  verifyOtp as apiVerifyOtp,
  type UserData,
} from "@/lib/store-api";

interface AuthContextType {
  user: UserData | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  googleSignIn: (credential: string) => Promise<{ success: boolean; message: string }>;
  sendOtp: (phone: string) => Promise<{ success: boolean; message: string; isExistingUser?: boolean }>;
  verifyOtp: (phone: string, otp: string, name?: string) => Promise<{ success: boolean; message: string; needsName?: boolean }>;
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
    refresh().finally(() => setIsLoading(false));
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    if (res.success && res.data?.user) {
      setUser(res.data.user);
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message || "Login failed" };
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await apiRegister(name, email, password);
    if (res.success) {
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message || "Registration failed" };
  }, []);

  const googleSignIn = useCallback(async (credential: string) => {
    const res = await apiGoogleAuth(credential);
    if (res.success && res.data?.user) {
      setUser(res.data.user);
      return { success: true, message: res.message };
    }
    return { success: false, message: res.message || "Google sign-in failed" };
  }, []);

  const sendOtp = useCallback(async (phone: string) => {
    const res = await apiSendOtp(phone);
    if (res.success) {
      return {
        success: true,
        message: res.message,
        isExistingUser: res.data?.isExistingUser,
      };
    }
    return { success: false, message: res.message || "Failed to send OTP" };
  }, []);

  const verifyOtp = useCallback(async (phone: string, otp: string, name?: string) => {
    const res = await apiVerifyOtp(phone, otp, name);
    if (res.success && res.data) {
      if ("needsName" in res.data && res.data.needsName) {
        return { success: true, message: res.message, needsName: true };
      }
      if ("user" in res.data && res.data.user) {
        setUser(res.data.user);
        return { success: true, message: res.message };
      }
    }
    return { success: false, message: res.message || "OTP verification failed" };
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
        login,
        register,
        googleSignIn,
        sendOtp,
        verifyOtp,
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
