"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang, useLocale, COPY } from "@/lib/language";
import { useAuth } from "@/lib/auth";
import { apiGetUnreadCount } from "@/lib/api";

const T = "#00F5D4";

// Deterministic avatar color from username
const AVATAR_PALETTE = [
  "#00F5D4", "#F5A623", "#BF5FFF", "#4FC3F7", "#81C784",
  "#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#F38375",
];
function avatarColor(username: string): string {
  let h = 0;
  for (let i = 0; i < username.length; i++) h = username.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

// ── Logo ───────────────────────────────────────────────────────────────────────
function TaichiLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="47" stroke={T} strokeWidth="1.5" />
      <path d="M50 3 A47 47 0 0 1 50 97 A23.5 23.5 0 0 1 50 50 A23.5 23.5 0 0 0 50 3Z"
        fill={T} fillOpacity="0.12" />
      <circle cx="50" cy="26.5" r="9" fill={T} fillOpacity="0.75" />
      <circle cx="50" cy="73.5" r="9" fill="none" stroke={T} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="47" stroke={T} strokeWidth="0.4" strokeDasharray="3 8" />
    </svg>
  );
}

// ── Language toggle ────────────────────────────────────────────────────────────
export function LangToggle() {
  const { locale, setLocale, locales } = useLocale();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const current = locales.find(l => l.code === locale) ?? locales[0];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all duration-200"
        style={{ borderColor: open ? T : "rgba(0,245,212,0.25)", color: open ? T : "#666", background: "transparent" }}>
        <span style={{ fontSize: 13 }}>🌐</span>
        <span>{current.label}</span>
        <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-40 rounded-xl overflow-hidden"
            style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.09)", zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
            {locales.map(l => {
              const active = l.code === locale;
              return (
                <button
                  key={l.code}
                  onClick={() => { setLocale(l.code as any); setOpen(false); }}
                  className="flex items-center justify-between w-full px-4 py-2.5 text-xs transition-all text-left"
                  style={{ color: active ? T : "#888" }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "#eee"; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = active ? T : "#888"; }}>
                  <span className="flex items-center gap-2">
                    <span className="font-bold w-5">{l.label}</span>
                    <span style={{ color: active ? T : "#555" }}>{l.native}</span>
                  </span>
                  {active && <span style={{ fontSize: 10 }}>✓</span>}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Notification bell ──────────────────────────────────────────────────────────
function NotifBell({ count }: { count: number }) {
  return (
    <Link href="/notifications"
      className="relative flex items-center justify-center w-8 h-8 rounded-full transition-all"
      style={{ color: "#666" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#666"; }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
          style={{ background: "#ff4545", fontSize: 9, padding: "0 3px" }}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

// ── Avatar dropdown ────────────────────────────────────────────────────────────
function AvatarMenu({ username, userId, logout }: { username: string; userId: number; logout: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { lang } = useLang();
  const color = avatarColor(username);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const c = COPY[lang as keyof typeof COPY] ?? COPY.en;
  const items = [
    { href: `/users/${userId}`, icon: "◎", label: c.nav.profile },
    { href: "/settings",        icon: "⚙", label: c.nav.settings },
  ];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
        style={{ background: `${color}20`, color, border: `1px solid ${color}55` }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 10px ${color}40`; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
        {username[0]?.toUpperCase() ?? "?"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full mt-2 w-44 rounded-xl overflow-hidden"
            style={{ background: "#0d0d14", border: "1px solid rgba(255,255,255,0.09)", zIndex: 100, boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>

            {/* Username header */}
            <div className="px-4 py-2.5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ background: `${color}20`, color }}>
                  {username[0]?.toUpperCase()}
                </div>
                <span className="text-xs font-medium truncate" style={{ color: "#bbb" }}>{username}</span>
              </div>
            </div>

            {/* Menu items */}
            {items.map(item => (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-xs transition-all"
                style={{ color: "#888" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "#eee"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#888"; }}>
                <span style={{ fontSize: 11 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

            <div className="mx-3 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }} />

            <button onClick={() => { logout(); setOpen(false); }}
              className="flex items-center gap-2.5 px-4 py-2.5 text-xs w-full text-left transition-all"
              style={{ color: "#666" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,80,80,0.06)"; (e.currentTarget as HTMLElement).style.color = "#f56"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#666"; }}>
              <span style={{ fontSize: 11 }}>↑</span>
              <span>{c.nav.signout}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Navbar ────────────────────────────────────────────────────────────────
export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { lang } = useLang();
  const { isLoggedIn, user, logout, openAuthModal } = useAuth();
  const c = COPY[lang as keyof typeof COPY] ?? COPY.en;
  const nav = c.nav;

  useEffect(() => {
    if (!isLoggedIn) { setUnreadCount(0); return; }
    const fetch = () => apiGetUnreadCount().then(d => setUnreadCount(d.unread_count)).catch(() => {});
    fetch();
    const id = setInterval(fetch, 60_000);
    return () => clearInterval(id);
  }, [isLoggedIn]);

  const navLinks = [
    { href: "/",       label: nav.home   },
    { href: "/models", label: nav.market },
    { href: "/tasks",  label: nav.collab },
    { href: "/about",  label: nav.about  },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{ background: "rgba(5,5,8,0.88)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.055)" }}>
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="transition-transform duration-700 group-hover:rotate-180">
            <TaichiLogo size={26} />
          </div>
          <span className="font-bold text-base tracking-widest"
            style={{ color: T, textShadow: `0 0 18px rgba(0,245,212,0.35)` }}>
            WuuW
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map(({ href, label }) => {
            const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className="relative text-sm tracking-wide transition-colors duration-200"
                style={{ color: active ? T : "#777" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = active ? T : "#777"; }}>
                {label}
                {active && (
                  <motion.span layoutId="nav-line" className="absolute -bottom-1 left-0 right-0 h-px"
                    style={{ background: T, boxShadow: `0 0 5px ${T}` }} />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-3">
          <LangToggle />
          {isLoggedIn && user ? (
            <>
              <NotifBell count={unreadCount} />
              <AvatarMenu username={user.username} userId={user.id} logout={logout} />
            </>
          ) : (
            <button onClick={openAuthModal}
              className="text-sm px-5 py-1.5 rounded-full font-medium transition-all duration-200"
              style={{ background: T, color: "#050508" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = `0 0 22px rgba(0,245,212,0.45)`; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
              {nav.login}
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2" style={{ color: "#666" }} onClick={() => setMobileOpen(!mobileOpen)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="md:hidden border-t px-6 py-4 space-y-3"
            style={{ background: "rgba(5,5,8,0.96)", borderColor: "rgba(255,255,255,0.06)" }}>
            {navLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="block py-1.5 text-sm"
                style={{ color: "#777" }} onClick={() => setMobileOpen(false)}>{label}</Link>
            ))}
            {isLoggedIn && (
              <>
                <Link href="/notifications" className="flex items-center gap-2 py-1.5 text-sm"
                  style={{ color: "#777" }} onClick={() => setMobileOpen(false)}>
                  {nav.notifications}
                  {unreadCount > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full text-white"
                      style={{ background: "#ff4545" }}>{unreadCount}</span>
                  )}
                </Link>
                {user && (
                  <Link href={`/users/${user.id}`} className="block py-1.5 text-sm"
                    style={{ color: "#777" }} onClick={() => setMobileOpen(false)}>
                    {nav.profile}
                  </Link>
                )}
                <button onClick={() => { logout(); setMobileOpen(false); }}
                  className="block py-1.5 text-sm w-full text-left" style={{ color: "#666" }}>
                  {nav.signout}
                </button>
              </>
            )}
            <div className="pt-2 flex items-center gap-3">
              <LangToggle />
              {!isLoggedIn && (
                <button onClick={() => { openAuthModal(); setMobileOpen(false); }}
                  className="text-sm px-4 py-1.5 rounded-full font-medium"
                  style={{ background: T, color: "#050508" }}>
                  {nav.login}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
