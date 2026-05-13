"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth";
import { useLang, COPY } from "@/lib/language";
import { useSidebar } from "@/lib/sidebar";
import {
  apiGetMyCreatedProjects, apiGetMyJoinedProjects, apiGetProjectTasks,
  type ApiProject,
} from "@/lib/api";

const T = "#00F5D4";
const PROJECT_COLORS = ["#00F5D4", "#F5A623", "#BF5FFF", "#4FC3F7", "#81C784"];
const projectColor = (id: number) => PROJECT_COLORS[id % PROJECT_COLORS.length];

// ── Badge ──────────────────────────────────────────────────────────────────────
function Badge({ count, red }: { count: number; red?: boolean }) {
  if (count <= 0) return null;
  return (
    <span style={{
      background: red ? "#e53e3e" : "rgba(0,245,212,0.15)",
      color: red ? "#fff" : T,
      fontSize: 9, fontWeight: 700,
      minWidth: 16, height: 16,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      padding: "0 4px", borderRadius: 99, flexShrink: 0,
    }}>
      {count > 99 ? "99+" : count}
    </span>
  );
}

// ── Tooltip (collapsed mode) ───────────────────────────────────────────────────
function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute left-full top-1/2 ml-2 px-2 py-1 rounded-lg text-xs whitespace-nowrap z-50 pointer-events-none"
          style={{ transform: "translateY(-50%)", background: "#1a1a22", border: "1px solid rgba(255,255,255,0.1)", color: "#ccc" }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ── Static menu items ──────────────────────────────────────────────────────────
interface MenuItem { id: string; icon: string; label: string; href: string; badge?: number; children?: MenuItem[] }

function useMenuItems(): { before: MenuItem[]; after: MenuItem[] } {
  const { lang } = useLang();
  const s = COPY[lang].sidebar;
  const before: MenuItem[] = [
    { id: "ideas",  icon: "✦", label: s.ideas,  href: "/ideas" },
    { id: "models", icon: "◈", label: s.models, href: "/models",
      children: [
        { id: "draft",      icon: "◌", label: s.draft,      href: "/workspace?tab=models&stage=draft",  badge: 0 },
        { id: "inProgress", icon: "◑", label: s.inProgress, href: "/workspace?tab=models&stage=collab", badge: 0 },
        { id: "ready",      icon: "◉", label: s.ready,      href: "/workspace?tab=models&stage=ready",  badge: 0 },
        { id: "mold",       icon: "⬡", label: s.mold,       href: "/workspace?tab=models&stage=mold",   badge: 0 },
      ],
    },
    { id: "orders", icon: "◎", label: s.orders, href: "/workspace?tab=orders",
      children: [
        { id: "cart",     icon: "·", label: s.cart,     href: "/workspace?tab=orders&sub=cart"    },
        { id: "wishlist", icon: "·", label: s.wishlist, href: "/workspace?tab=orders&sub=wishlist" },
        { id: "ordered",  icon: "·", label: s.ordered,  href: "/workspace?tab=orders&sub=ordered" },
        { id: "received", icon: "·", label: s.received, href: "/workspace?tab=orders&sub=received"},
      ],
    },
  ];
  const after: MenuItem[] = [
    { id: "printers", icon: "⬟", label: s.printers, href: "/printers",
      children: [
        { id: "findPrinters",  icon: "·", label: s.findPrinters,  href: "/printers/find"   },
        { id: "becomePrinter", icon: "·", label: s.becomePrinter, href: "/printers/become" },
      ],
    },
    { id: "wallet", icon: "⬡", label: s.wallet, href: "/wallet",
      children: [
        { id: "balance",  icon: "·", label: s.balance,  href: "/wallet"         },
        { id: "withdraw", icon: "·", label: s.withdraw, href: "/wallet/withdraw" },
        { id: "history",  icon: "·", label: s.history,  href: "/wallet/history" },
      ],
    },
  ];
  return { before, after };
}

function MenuNode({ item, depth = 0, collapsed }: { item: MenuItem; depth?: number; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + "?") || pathname.startsWith(item.href + "/");
  const hasChildren = !!item.children?.length;
  const anyChildActive = item.children?.some(c => pathname.startsWith(c.href));
  const [open, setOpen] = useState(anyChildActive ?? false);
  const indent = depth * 14;

  if (collapsed) {
    if (depth > 0) return null;
    return (
      <Tooltip label={item.label}>
        <Link href={hasChildren ? "#" : item.href}
          className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto my-0.5 text-xs transition-all"
          style={{ color: isActive || anyChildActive ? T : "#555", background: isActive || anyChildActive ? "rgba(0,245,212,0.08)" : "transparent" }}>
          {item.icon}
        </Link>
      </Tooltip>
    );
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg cursor-pointer select-none transition-all"
        style={{
          paddingLeft: `${8 + indent}px`, paddingRight: 8, paddingTop: 5, paddingBottom: 5,
          color: isActive ? T : depth === 0 ? "#666" : "#484848",
          background: isActive ? "rgba(0,245,212,0.06)" : "transparent",
        }}
        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = "#888"; }}
        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.color = depth === 0 ? "#666" : "#484848"; }}
        onClick={() => { if (hasChildren) setOpen(o => !o); }}
      >
        {hasChildren ? (
          <span className="text-xs flex-shrink-0 transition-transform duration-200"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0)", color: "#444", fontSize: 9 }}>▶</span>
        ) : (
          <span style={{ width: 10, flexShrink: 0 }} />
        )}
        <span className="text-xs flex-shrink-0" style={{ color: isActive ? "rgba(0,245,212,0.7)" : depth === 0 ? "#555" : "#383838" }}>{item.icon}</span>
        <Link href={item.href} className="flex-1 text-xs truncate" style={{ color: "inherit" }}
          onClick={e => { if (hasChildren) e.preventDefault(); }}>
          {item.label}
        </Link>
        {(item.badge ?? 0) > 0 && <Badge count={item.badge!} />}
      </div>
      <AnimatePresence initial={false}>
        {hasChildren && open && (
          <motion.div key="c" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: "hidden" }}>
            <div className="ml-3 border-l" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {item.children!.map(child => <MenuNode key={child.id} item={child} depth={depth + 1} collapsed={false} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Individual project row (sub-item of Projects) ─────────────────────────────
function ProjectRow({ project, taskCount }: { project: ApiProject; taskCount: number }) {
  const pathname = usePathname();
  const { lang } = useLang();
  const s = COPY[lang].sidebar;
  const basePath = `/projects/${project.id}`;
  const isAnyActive = pathname.startsWith(basePath);
  const [open, setOpen] = useState(isAnyActive);
  const color = projectColor(project.id);

  const SUB_ITEMS = [
    { key: "overview",   label: s.overview,     icon: "◉", path: "" },
    { key: "discussion", label: s.discussion,    icon: "◎", path: "/discussion" },
    { key: "tasks",      label: s.tasks,         icon: "◈", path: "/tasks",      showBadge: true },
    { key: "models",     label: s.modelVersions, icon: "⬡", path: "/models" },
    { key: "milestones", label: s.milestones,    icon: "⬟", path: "/milestones" },
    { key: "members",    label: s.members,       icon: "·", path: "/members" },
  ];

  useEffect(() => { if (isAnyActive) setOpen(true); }, [isAnyActive]);

  return (
    <div>
      <div className="flex items-center gap-1.5 rounded-lg cursor-pointer select-none transition-all"
        style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 4, paddingBottom: 4, color: isAnyActive ? T : "#666" }}
        onMouseEnter={e => { if (!isAnyActive) (e.currentTarget as HTMLElement).style.color = "#888"; }}
        onMouseLeave={e => { if (!isAnyActive) (e.currentTarget as HTMLElement).style.color = "#666"; }}
        onClick={() => setOpen(o => !o)}>
        <span className="text-xs flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0)", color: "#444", fontSize: 9 }}>▶</span>
        <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: `${color}18`, color, fontSize: 9, fontWeight: 700 }}>
          {project.title[0]?.toUpperCase() ?? "P"}
        </div>
        <span className="flex-1 text-xs truncate" style={{ color: isAnyActive ? T : "#888" }}>{project.title}</span>
        <Badge count={taskCount} red />
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="sub" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: "hidden" }}>
            <div className="ml-3 border-l pl-1" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {SUB_ITEMS.map(item => {
                const href = `${basePath}${item.path}`;
                const active = item.path === "" ? pathname === basePath : pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link key={item.key} href={href}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all"
                    style={{ color: active ? T : "#555", background: active ? "rgba(0,245,212,0.07)" : "transparent" }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#888"; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = "#555"; }}>
                    <span style={{ fontSize: 10, color: active ? T : "#444" }}>{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
                    {item.showBadge && <Badge count={taskCount} red />}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Projects menu item — flat, same level as other items ──────────────────────
function ProjectsMenuItem({ created, joined, taskCounts, totalTasks, collapsed }: {
  created: ApiProject[];
  joined: ApiProject[];
  taskCounts: Record<number, number>;
  totalTasks: number;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const { lang } = useLang();
  const s = COPY[lang].sidebar;
  const isAnyActive = pathname.startsWith("/projects");
  const [open, setOpen] = useState(isAnyActive);
  const allProjects = [...created, ...joined];

  useEffect(() => { if (isAnyActive) setOpen(true); }, [isAnyActive]);

  if (collapsed) {
    return (
      <Tooltip label={s.projectsHeader}>
        <Link href="/projects"
          className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto my-0.5 text-xs transition-all"
          style={{ color: isAnyActive ? T : "#555", background: isAnyActive ? "rgba(0,245,212,0.08)" : "transparent" }}>
          ◫
        </Link>
      </Tooltip>
    );
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg cursor-pointer select-none transition-all"
        style={{
          paddingLeft: 8, paddingRight: 8, paddingTop: 5, paddingBottom: 5,
          color: isAnyActive ? T : "#666",
          background: isAnyActive ? "rgba(0,245,212,0.06)" : "transparent",
        }}
        onMouseEnter={e => { if (!isAnyActive) (e.currentTarget as HTMLElement).style.color = "#888"; }}
        onMouseLeave={e => { if (!isAnyActive) (e.currentTarget as HTMLElement).style.color = "#666"; }}
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-xs flex-shrink-0 transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0)", color: "#444", fontSize: 9 }}>▶</span>
        <span className="text-xs flex-shrink-0" style={{ color: isAnyActive ? "rgba(0,245,212,0.7)" : "#555" }}>◫</span>
        <Link href="/projects" className="flex-1 text-xs truncate" style={{ color: "inherit" }}
          onClick={e => e.preventDefault()}>
          {s.projectsHeader}
        </Link>
        <Badge count={totalTasks} red />
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div key="projects-open" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: "hidden" }}>
            <div className="ml-3 border-l" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {allProjects.length === 0 ? (
                <div className="px-2 py-2">
                  <p className="text-xs" style={{ color: "#2a2a2a" }}>{s.noProjects}</p>
                  <Link href="/projects" className="text-xs mt-1 inline-block transition-colors"
                    style={{ color: "#383838" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#383838"; }}>
                    {s.projectPlaza}
                  </Link>
                </div>
              ) : (
                <>
                  {allProjects.map(p => (
                    <ProjectRow key={p.id} project={p} taskCount={taskCounts[p.id] ?? 0} />
                  ))}
                  <Link href="/projects"
                    className="flex items-center gap-1.5 px-2 py-1 mt-0.5 rounded-lg text-xs transition-all"
                    style={{ color: "#383838" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#383838"; }}>
                    <span style={{ fontSize: 10 }}>⊕</span>
                    <span>{s.projectPlaza}</span>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Profile strip ─────────────────────────────────────────────────────────────
const STATS_DEF = [
  { zh: "出品量", en: "Models", key: "models" },
  { zh: "点赞",   en: "Likes",  key: "likes"  },
  { zh: "显化数", en: "Prints", key: "prints" },
  { zh: "贡献值", en: "Score",  key: "score"  },
];

// ── Main Sidebar ──────────────────────────────────────────────────────────────
export default function Sidebar() {
  const { user, isLoggedIn } = useAuth();
  const { lang } = useLang();
  const { collapsed, setCollapsed } = useSidebar();
  const { before, after } = useMenuItems();

  const [created, setCreated] = useState<ApiProject[]>([]);
  const [joined, setJoined] = useState<ApiProject[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<number, number>>({});

  const fetchProjects = useCallback(async () => {
    if (!isLoggedIn) return;
    try {
      const [c, j] = await Promise.all([apiGetMyCreatedProjects(), apiGetMyJoinedProjects()]);
      setCreated(c.items);
      setJoined(j.items);
      const all = [...c.items, ...j.items];
      if (!all.length) return;
      const counts = await Promise.all(all.map(p => apiGetProjectTasks(p.id, "pending")));
      const map: Record<number, number> = {};
      all.forEach((p, i) => { map[p.id] = counts[i].total; });
      setTaskCounts(map);
    } catch { /* silent */ }
  }, [isLoggedIn]);

  useEffect(() => {
    fetchProjects();
    const id = setInterval(fetchProjects, 60_000);
    return () => clearInterval(id);
  }, [fetchProjects]);

  const totalTasks = Object.values(taskCounts).reduce((a, b) => a + b, 0);
  const w = collapsed ? 48 : 240;

  return (
    <aside className="fixed left-0 bottom-0 flex flex-col transition-all duration-300"
      style={{ top: 64, width: w, background: "rgba(3,3,6,0.95)", borderRight: "1px solid rgba(255,255,255,0.055)", backdropFilter: "blur(10px)", zIndex: 40, overflow: "hidden" }}>

      {/* Profile */}
      {!collapsed ? (
        <div className="flex flex-col items-center px-4 pt-5 pb-4 border-b flex-shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.055)" }}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg mb-2"
            style={{ background: "rgba(0,245,212,0.1)", color: T, border: `1px solid rgba(0,245,212,0.22)`, boxShadow: `0 0 16px rgba(0,245,212,0.1)` }}>
            {user?.username?.[0]?.toUpperCase() ?? "?"}
          </div>
          <p className="text-xs font-medium mb-0.5" style={{ color: "#bbb" }}>{user?.username ?? "Guest"}</p>
          <p className="text-xs mb-3" style={{ color: "rgba(0,245,212,0.55)" }}>{user?.token_balance ?? 0} WuuW</p>
          <div className="grid grid-cols-2 gap-1 w-full">
            {STATS_DEF.map(st => (
              <div key={st.key} className="flex flex-col items-center py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.03)" }}>
                <span className="text-xs font-semibold" style={{ color: "#c0c0c0" }}>—</span>
                <span className="text-xs mt-0.5" style={{ color: "#444" }}>{lang === "zh" ? st.zh : st.en}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-3 border-b flex-shrink-0" style={{ borderColor: "rgba(255,255,255,0.055)" }}>
          <Tooltip label={user?.username ?? "Guest"}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(0,245,212,0.1)", color: T, border: `1px solid rgba(0,245,212,0.22)` }}>
              {user?.username?.[0]?.toUpperCase() ?? "?"}
            </div>
          </Tooltip>
        </div>
      )}

      {/* Collapse toggle */}
      <div className="flex items-center border-b flex-shrink-0"
        style={{ borderColor: "rgba(255,255,255,0.04)", height: 32, padding: "0 8px" }}>
        {!collapsed && <span className="flex-1" />}
        <button onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center rounded-lg w-6 h-6 transition-all"
          style={{ marginLeft: collapsed ? "auto" : 0, marginRight: collapsed ? "auto" : 0, color: "#333" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = T; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "#333"; }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
          </svg>
        </button>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto space-y-0.5" style={{ padding: "6px" }}>
        {before.map(item => <MenuNode key={item.id} item={item} depth={0} collapsed={collapsed} />)}
        <ProjectsMenuItem
          created={created} joined={joined}
          taskCounts={taskCounts} totalTasks={totalTasks}
          collapsed={collapsed}
        />
        {after.map(item => <MenuNode key={item.id} item={item} depth={0} collapsed={collapsed} />)}
      </nav>
    </aside>
  );
}
