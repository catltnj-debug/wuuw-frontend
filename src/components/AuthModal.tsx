"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/language";

const COPY_ERR = { en: "Operation failed, please try again", zh: "操作失败，请重试", es: "Operación fallida, inténtalo de nuevo", pt: "Operação falhada, tente novamente", ja: "操作に失敗しました。もう一度お試しください" } as const;

const AUTH_COPY = {
  en: { subtitle: "3D Creative Market", loginTab: "Sign In", registerTab: "Register", username: "Username", email: "Email", password: "Password", loginBtn: "Sign In", registerBtn: "Create Account", waiting: "Please wait…", cancel: "Cancel" },
  zh: { subtitle: "3D 创意市场", loginTab: "登录", registerTab: "注册", username: "用户名", email: "邮箱", password: "密码", loginBtn: "登录", registerBtn: "注册并登录", waiting: "请稍候…", cancel: "取消" },
  es: { subtitle: "Mercado creativo 3D", loginTab: "Iniciar sesión", registerTab: "Registrarse", username: "Usuario", email: "Correo", password: "Contraseña", loginBtn: "Iniciar sesión", registerBtn: "Crear cuenta", waiting: "Por favor espera…", cancel: "Cancelar" },
  pt: { subtitle: "Mercado criativo 3D", loginTab: "Entrar", registerTab: "Registar", username: "Utilizador", email: "Email", password: "Palavra-passe", loginBtn: "Entrar", registerBtn: "Criar conta", waiting: "Por favor aguarde…", cancel: "Cancelar" },
  ja: { subtitle: "3Dクリエイティブマーケット", loginTab: "ログイン", registerTab: "新規登録", username: "ユーザー名", email: "メール", password: "パスワード", loginBtn: "ログイン", registerBtn: "アカウント作成", waiting: "お待ちください…", cancel: "キャンセル" },
} as const;

const T = "#00F5D4";

export default function AuthModal() {
  const { showAuthModal, closeAuthModal, login, register } = useAuth();
  const { lang } = useLang();
  const a = AUTH_COPY[lang as keyof typeof AUTH_COPY] ?? AUTH_COPY.en;
  const [tab, setTab] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (tab === "login") {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : COPY_ERR[lang as keyof typeof COPY_ERR] ?? COPY_ERR.en);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#e0e0e0",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    width: "100%",
    outline: "none",
  };

  return (
    <AnimatePresence>
      {showAuthModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}
          onClick={closeAuthModal}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-full max-w-sm mx-4 rounded-2xl p-8"
            style={{ background: "#0d0d12", border: "1px solid rgba(0,245,212,0.15)" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Logo */}
            <div className="text-center mb-6">
              <div className="text-xl font-bold tracking-widest" style={{ color: T }}>WuuW</div>
              <div className="text-xs mt-1" style={{ color: "#555" }}>{a.subtitle}</div>
            </div>

            {/* Tab 切换 */}
            <div className="flex rounded-lg p-1 mb-6" style={{ background: "rgba(255,255,255,0.04)" }}>
              {(["login", "register"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(""); }}
                  className="flex-1 py-2 text-sm rounded-md font-medium transition-all"
                  style={{
                    background: tab === t ? T : "transparent",
                    color: tab === t ? "#050508" : "#555",
                  }}
                >
                  {t === "login" ? a.loginTab : a.registerTab}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                style={inputStyle}
                placeholder={a.username}
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
              />
              {tab === "register" && (
                <input
                  style={inputStyle}
                  type="email"
                  placeholder={a.email}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              )}
              <input
                style={inputStyle}
                type="password"
                placeholder={a.password}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />

              {error && (
                <div className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(255,80,80,0.1)", color: "#ff6b6b" }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-semibold text-sm mt-2 transition-all"
                style={{
                  background: loading ? "rgba(0,245,212,0.4)" : T,
                  color: "#050508",
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading ? a.waiting : tab === "login" ? a.loginBtn : a.registerBtn}
              </button>
            </form>

            <button
              onClick={closeAuthModal}
              className="mt-4 w-full text-xs text-center"
              style={{ color: "#444" }}
            >
              {a.cancel}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
