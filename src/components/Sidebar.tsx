"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang, COPY } from "@/lib/language";
import { useAuth } from "@/lib/auth";

const T = "#00F5D4";

interface TreeItem {
  id: string;
  icon: string;
  labelKey: keyof typeof COPY["zh"]["sidebar"];
  href: string;
  badge?: number;
  children?: TreeItem[];
}

const TREE: TreeItem[] = [
  {
    id: "ideas", icon: "✦", labelKey: "ideas",
    href: "/workspace?tab=ideas",
  },
  {
    id: "models", icon: "◈", labelKey: "models",
    href: "/workspace?tab=models",
    children: [
      { id: "draft",      icon: "◌", labelKey: "draft",      href: "/workspace?tab=models&stage=draft",  badge: 1 },
      { id: "inProgress", icon: "◑", labelKey: "inProgress", href: "/workspace?tab=models&stage=collab", badge: 2 },
      { id: "ready",      icon: "◉", labelKey: "ready",      href: "/workspace?tab=models&stage=ready",  badge: 1 },
      { id: "mold",       icon: "⬡", labelKey: "mold",       href: "/workspace?tab=models&stage=mold",   badge: 1 },
    ],
  },
  {
    id: "orders", icon: "◎", labelKey: "orders",
    href: "/workspace?tab=orders",
    children: [
      { id: "cart",     icon: "·", labelKey: "cart",     href: "/workspace?tab=orders&sub=cart",     badge: 2 },
      { id: "wishlist", icon: "·", labelKey: "wishlist", href: "/workspace?tab=orders&sub=wishlist",  badge: 1 },
      { id: "ordered",  icon: "·", labelKey: "ordered",  href: "/workspace?tab=orders&sub=ordered",  badge: 1 },
      { id: "received", icon: "·", labelKey: "received", href: "/workspace?tab=orders&sub=received", badge: 0 },
    ],
  },
  {
    id: "printers", icon: "⬟", labelKey: "printers",
    href: "/printers",
    children: [
      { id: "findPrinters",  icon: "·", labelKey: "findPrinters",  href: "/printers/find"   },
      { id: "becomePrinter", icon: "·", labelKey: "becomePrinter", href: "/printers/become" },
    ],
  },
  {
    id: "wallet", icon: "⬡", labelKey: "wallet",
    href: "/wallet",
    children: [
      { id: "balance",  icon: "·", labelKey: "balance",  href: "/wallet"         },
      { id: "withdraw", icon: "·", labelKey: "withdraw", href: "/wallet/withdraw" },
      { id: "history",  icon: "·", labelKey: "history",  href: "/wallet/history"  },
    ],
  },
];

interface TreeNodeProps {
  item: TreeItem;
  depth?: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function TreeNode({ item, depth = 0, selectedId, onSelect }: TreeNodeProps) {
  const { lang } = useLang();
  const s = COPY[lang].sidebar;
  const label = s[item.labelKey];
  const isActive = item.id === selectedId;
  const hasChildren = !!item.children?.length;
  const [open, setOpen] = useState(depth === 0 && ["models", "orders"].includes(item.id));
  const indent = depth * 14;

  const handleClick = () => {
    onSelect(item.id);
    if (hasChildren) setOpen(o => !o);
  };

  return (
    <div>
      <div
        className="flex items-center gap-2 rounded-lg cursor-pointer select-none transition-all duration-150"
        style={{
          paddingLeft: `${8 + indent}px`,
          paddingRight: "8px",
          paddingTop: "6px",
          paddingBottom: "6px",
          color: isActive ? "rgba(0,245,212,0.85)" : depth === 0 ? "#666" : "#484848",
          background: isActive ? "rgba(0,245,212,0.06)" : "transparent",
        }}
        onMouseEnter={e => {
          if (!isActive) (e.currentTarget as HTMLElement).style.color = "#888";
        }}
        onMouseLeave={e => {
          if (!isActive) (e.currentTarget as HTMLElement).style.color = depth === 0 ? "#666" : "#484848";
        }}
        onClick={handleClick}
      >
        {/* collapse arrow */}
        {hasChildren ? (
          <span
            className="text-xs transition-transform duration-200 flex-shrink-0"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", color: "#444", fontSize: "9px" }}
          >
            ▶
          </span>
        ) : (
          <span style={{ width: "10px", flexShrink: 0 }} />
        )}

        {/* icon */}
        <span className="text-xs flex-shrink-0"
          style={{ color: isActive ? "rgba(0,245,212,0.7)" : depth === 0 ? "#555" : "#383838" }}>
          {item.icon}
        </span>

        {/* label — clicking always bubbles up to parent div handleClick */}
        <Link
          href={item.href}
          className="flex-1 text-sm truncate"
          style={{ color: "inherit" }}
          onClick={e => { if (hasChildren) e.preventDefault(); }}
        >
          {label}
        </Link>

        {/* badge */}
        {item.badge != null && item.badge > 0 && (
          <span
            className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ background: "rgba(0,245,212,0.12)", color: T, fontSize: "10px" }}
          >
            {item.badge}
          </span>
        )}
      </div>

      {/* children */}
      <AnimatePresence initial={false}>
        {hasChildren && open && (
          <motion.div
            key="children"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div className="ml-3 border-l" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {item.children!.map(child => (
                <TreeNode
                  key={child.id}
                  item={child}
                  depth={depth + 1}
                  selectedId={selectedId}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const PROFILE_STATS = [
  { labelZh: "出品量", labelEn: "Models", value: "4"    },
  { labelZh: "点赞",   labelEn: "Likes",  value: "847"  },
  { labelZh: "显化数", labelEn: "Prints", value: "23"   },
  { labelZh: "贡献值", labelEn: "Score",  value: "2.3k" },
];

export default function Sidebar() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <aside
      className="fixed left-0 bottom-0 flex flex-col"
      style={{
        top: "64px",
        width: "220px",
        background: "rgba(3,3,6,0.92)",
        borderRight: "1px solid rgba(255,255,255,0.055)",
        backdropFilter: "blur(10px)",
        zIndex: 40,
      }}
    >
      {/* Profile area */}
      <div
        className="flex flex-col items-center px-4 pt-6 pb-5 border-b"
        style={{ borderColor: "rgba(255,255,255,0.055)" }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl mb-3"
          style={{
            background: "rgba(0,245,212,0.1)",
            color: T,
            border: `1px solid rgba(0,245,212,0.22)`,
            boxShadow: `0 0 18px rgba(0,245,212,0.12)`,
          }}
        >
          {user?.avatar ?? "?"}
        </div>

        <div className="text-sm font-medium mb-0.5" style={{ color: "#bbb" }}>
          {user?.name ?? "Guest"}
        </div>
        <div className="text-xs mb-4" style={{ color: "rgba(0,245,212,0.55)" }}>
          {user?.tokens ?? 0} WUUW
        </div>

        <div className="grid grid-cols-2 gap-1.5 w-full">
          {PROFILE_STATS.map(st => (
            <div
              key={st.labelZh}
              className="flex flex-col items-center py-2 rounded-lg"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-sm font-semibold" style={{ color: "#c0c0c0" }}>
                {st.value}
              </span>
              <span className="text-xs mt-0.5" style={{ color: "#444" }}>
                {lang === "zh" ? st.labelZh : st.labelEn}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tree menu */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {TREE.map(item => (
          <TreeNode
            key={item.id}
            item={item}
            depth={0}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        ))}
      </nav>

      <div
        className="px-4 py-3 border-t text-xs"
        style={{ borderColor: "rgba(255,255,255,0.04)", color: "#333" }}
      >
        Dream · Create · Manifest
      </div>
    </aside>
  );
}
