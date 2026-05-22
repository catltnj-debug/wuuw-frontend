"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiAdminStats, type ApiAdminStats } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useLang } from "@/lib/language";

const T = "#00F5D4";

export default function AdminPage() {
  const { user, isLoggedIn } = useAuth();
  const { lang } = useLang();
  const zh = lang === "zh";
  const [stats, setStats] = useState<ApiAdminStats | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoggedIn) return;
    apiAdminStats()
      .then(setStats)
      .catch(e => setError(e instanceof Error ? e.message : "Error"));
  }, [isLoggedIn]);

  if (!isLoggedIn || !user) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#555" }}>{zh ? "请先登录" : "Please log in"}</p>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
      <p style={{ color: "#f56" }}>{zh ? "需要管理员权限" : "Admin access required"}</p>
    </div>
  );

  const navItems = [
    { href: "/admin/users",        label: zh ? "用户管理" : "Users",       icon: "👤" },
    { href: "/admin/models",       label: zh ? "模型管理" : "Models",       icon: "⬡" },
    { href: "/admin/reports",      label: zh ? "举报处理" : "Reports",      icon: "🚩", badge: stats?.pending_reports },
    { href: "/admin/certificates", label: zh ? "证书管理" : "Certificates", icon: "📜" },
    { href: "/admin/invite-codes", label: zh ? "邀请码管理" : "Invite Codes", icon: "🔑" },
  ];

  const statCards = stats ? [
    { label: zh ? "注册用户" : "Users",             value: stats.user_count.toLocaleString(),          color: T },
    { label: zh ? "上架模型" : "Models",             value: stats.asset_count.toLocaleString(),         color: "#BF5FFF" },
    { label: zh ? "版权证书" : "Certificates",       value: stats.cert_count.toLocaleString(),          color: "#F5A623" },
    { label: zh ? "Credits 流通" : "Credits Circ.", value: stats.credits_circulation.toLocaleString(), color: "#22d3ee" },
    { label: zh ? "待处理举报" : "Pending Reports", value: stats.pending_reports.toLocaleString(),     color: stats.pending_reports > 0 ? "#f56" : "#555" },
    { label: zh ? "支付收入 USD" : "Revenue USD",    value: `$${stats.total_revenue_usd.toFixed(2)}`,  color: "#4ade80" },
  ] : [];

  return (
    <div style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="max-w-5xl mx-auto px-6 py-10">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "#eee" }}>{zh ? "管理后台" : "Admin Dashboard"}</h1>
            <p className="text-sm mt-1" style={{ color: "#555" }}>{zh ? "平台数据概览" : "Platform overview"}</p>
          </div>
          <span className="text-xs px-2 py-1 rounded-lg" style={{ background: "rgba(245,166,35,0.1)", color: "#F5A623", border: "1px solid rgba(245,166,35,0.2)" }}>
            Admin
          </span>
        </div>

        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
            {statCards.map(s => (
              <div key={s.label} className="p-5 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-xs mb-2" style={{ color: "#555" }}>{s.label}</p>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.04)" }} />
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {navItems.map(n => (
            <Link key={n.href} href={n.href}
              className="relative p-5 rounded-2xl flex flex-col items-center gap-2 transition-all hover:-translate-y-0.5"
              style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              {n.badge != null && n.badge > 0 && (
                <span className="absolute top-3 right-3 text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{ background: "#f56", color: "#fff" }}>{n.badge}</span>
              )}
              <span className="text-2xl">{n.icon}</span>
              <span className="text-sm font-medium" style={{ color: "#ccc" }}>{n.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
