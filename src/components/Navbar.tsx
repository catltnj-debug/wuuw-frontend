"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang, COPY } from "@/lib/language";
import { useAuth } from "@/lib/auth";
import { apiGetUnreadCount } from "@/lib/api";

const T = "#00F5D4";

function TaichiLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <circle cx="50" cy="50" r="47" stroke={T} strokeWidth="1.5" />
      <path
        d="M50 3 A47 47 0 0 1 50 97 A23.5 23.5 0 0 1 50 50 A23.5 23.5 0 0 0 50 3Z"
        fill={T} fillOpacity="0.12"
      />
      <circle cx="50" cy="26.5" r="9" fill={T} fillOpacity="0.75" />
      <circle cx="50" cy="73.5" r="9" fill="none" stroke={T} strokeWidth="1.2" />
      <circle cx="50" cy="50" r="47" stroke={T} strokeWidth="0.4" strokeDasharray="3 8" />
    </svg>
  );
}

export function LangToggle() {
  const { lang, toggle } = useLang();
  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-medium transition-all duration-200"
      style={{ borderColor: "rgba(0,245,212,0.25)", color: "#666", background: "transparent" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T; (e.currentTarget as HTMLElement).style.color = T; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(0,245,212,0.25)"; (e.currentTarget as HTMLElement).style.color = "#666"; }}
    >
      <span style={{ color: lang === "zh" ? T : "#444" }}>中</span>
      <span style={{ color: "#333" }}>/</span>
      <span style={{ color: lang === "en" ? T : "#444" }}>EN</span>
    </button>
  );
}

function BellIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function NotifBell({ count }: { count: number }) {
  return (
    <Link href="/notifications" className="relative flex items-center justify-center w-8 h-8 rounded-full transition-all"
      style={{ color: "#666" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#666"; }}>
      <BellIcon />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
          style={{ background: "#ff4545", fontSize: 9, padding: "0 3px" }}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { lang } = useLang();
  const { isLoggedIn, user, logout, openAuthModal } = useAuth();
  const nav = COPY[lang].nav;

  // 轮询未读通知数
  useEffect(() => {
    if (!isLoggedIn) { setUnreadCount(0); return; }
    const fetchCount = () =>
      apiGetUnreadCount().then(d => setUnreadCount(d.unread_count)).catch(() => {});
    fetchCount();
    const id = setInterval(fetchCount, 60_000);
    return () => clearInterval(id);
  }, [isLoggedIn]);

  const publicLinks = [
    { href: "/",            label: lang === "zh" ? "首页"     : "Home"        },
    { href: "/models",      label: lang === "zh" ? "模型库"   : "Models"      },
    { href: "/ideas",       label: "Ideas"                                    },
    { href: "/projects",    label: "Projects"                                 },
    { href: "/tasks",       label: lang === "zh" ? "任务市场" : "Tasks"       },
    { href: "/bounties",    label: lang === "zh" ? "悬赏大厅" : "Bounties"    },
    { href: "/leaderboard", label: lang === "zh" ? "排行榜"   : "Leaderboard" },
  ];

  const authLinks: { href: string; label: string }[] = [];

  const allLinks = isLoggedIn ? [...publicLinks, ...authLinks] : publicLinks;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{ background: "rgba(5,5,8,0.88)", backdropFilter: "blur(16px)", borderColor: "rgba(255,255,255,0.055)" }}>
      <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="transition-transform duration-700 group-hover:rotate-180">
            <TaichiLogo size={26} />
          </div>
          <span className="font-bold text-base tracking-widest uppercase"
            style={{ color: T, textShadow: `0 0 18px rgba(0,245,212,0.35)` }}>
            WUUW
          </span>
        </Link>

        {/* 桌面导航 */}
        <div className="hidden md:flex items-center gap-7">
          {allLinks.map(({ href, label }) => {
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

        {/* 右侧操作区 */}
        <div className="hidden md:flex items-center gap-3">
          <LangToggle />

          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <NotifBell count={unreadCount} />
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: "rgba(0,245,212,0.12)", color: T, border: `1px solid rgba(0,245,212,0.25)` }}>
                {user?.username?.[0]?.toUpperCase() ?? "?"}
              </div>
              <button onClick={logout}
                className="text-xs px-3 py-1.5 rounded-full border transition-all"
                style={{ borderColor: "rgba(255,255,255,0.1)", color: "#555" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#aaa"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#555"; }}>
                {nav.logout}
              </button>
            </div>
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

        {/* 移动端汉堡 */}
        <button className="md:hidden p-2" style={{ color: "#666" }} onClick={() => setOpen(!open)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {open
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </nav>

      {/* 移动端菜单 */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="md:hidden border-t px-6 py-4 space-y-3"
            style={{ background: "rgba(5,5,8,0.96)", borderColor: "rgba(255,255,255,0.06)" }}>
            {allLinks.map(({ href, label }) => (
              <Link key={href} href={href} className="block py-1.5 text-sm"
                style={{ color: "#777" }} onClick={() => setOpen(false)}>{label}</Link>
            ))}
            {isLoggedIn && (
              <Link href="/notifications" className="block py-1.5 text-sm flex items-center gap-2"
                style={{ color: "#777" }} onClick={() => setOpen(false)}>
                通知
                {unreadCount > 0 && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: "#ff4545" }}>{unreadCount}</span>
                )}
              </Link>
            )}
            <div className="pt-2 flex items-center gap-3">
              <LangToggle />
              {!isLoggedIn && (
                <button onClick={() => { openAuthModal(); setOpen(false); }}
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
