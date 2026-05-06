"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { apiLogin, apiRegister, apiGetMe, type ApiUser } from "./api";

interface AuthCtx {
  isLoggedIn: boolean;
  user: ApiUser | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  showAuthModal: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

const AuthContext = createContext<AuthCtx>({
  isLoggedIn: false, user: null,
  login: async () => {}, register: async () => {}, logout: () => {},
  showAuthModal: false, openAuthModal: () => {}, closeAuthModal: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("wuuw_token");
    if (t) {
      apiGetMe().then(setUser).catch(() => {
        localStorage.removeItem("wuuw_token");
      });
    }
  }, []);

  async function login(username: string, password: string) {
    const res = await apiLogin(username, password);
    localStorage.setItem("wuuw_token", res.access_token);
    setUser(res.user);
    setShowAuthModal(false);
  }

  async function register(username: string, email: string, password: string) {
    await apiRegister(username, email, password);
    await login(username, password);
  }

  function logout() {
    localStorage.removeItem("wuuw_token");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{
      isLoggedIn: !!user, user,
      login, register, logout,
      showAuthModal,
      openAuthModal: () => setShowAuthModal(true),
      closeAuthModal: () => setShowAuthModal(false),
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() { return useContext(AuthContext); }
