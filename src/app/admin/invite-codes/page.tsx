"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { apiGetInviteCodes, apiGenerateInviteCodes, type ApiInviteCode } from "@/lib/api";
import Link from "next/link";

const T = "#00F5D4";

export default function InviteCodesPage() {
  const { user, isLoggedIn } = useAuth();
  const [codes, setCodes] = useState<ApiInviteCode[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [genCount, setGenCount] = useState(10);
  const [genDays, setGenDays] = useState(30);
  const [genMaxUses, setGenMaxUses] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [newCodes, setNewCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const r = await apiGetInviteCodes();
      setCodes(r.items);
      setTotal(r.total);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const r = await apiGenerateInviteCodes(genCount, genDays, genMaxUses);
      setNewCodes(r.codes);
      await load();
    } catch (e) { alert(e instanceof Error ? e.message : "Failed"); }
    finally { setGenerating(false); }
  }

  function copyAll() {
    navigator.clipboard.writeText(newCodes.join("\n"));
    setCopied("all");
    setTimeout(() => setCopied(null), 2000);
  }

  if (!isLoggedIn || !user?.is_admin) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-64px)]" style={{ background: "#050508" }}>
        <p style={{ color: "#555" }}>Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8" style={{ background: "#050508", minHeight: "calc(100vh - 64px)" }}>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin" className="text-sm" style={{ color: "#555" }}>← Admin</Link>
        <h1 className="font-semibold text-lg" style={{ color: "#ddd" }}>Invite Codes</h1>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,245,212,0.1)", color: T }}>{total} total</span>
      </div>

      {/* Generator */}
      <div className="p-5 rounded-2xl mb-6" style={{ background: "#0d0d12", border: "1px solid rgba(0,245,212,0.15)" }}>
        <h2 className="font-medium mb-4 text-sm" style={{ color: "#ccc" }}>Generate Codes</h2>
        <div className="flex gap-3 mb-4 flex-wrap">
          <div>
            <label className="text-xs block mb-1" style={{ color: "#555" }}>Count</label>
            <input type="number" min="1" max="100" value={genCount} onChange={e => setGenCount(Number(e.target.value))}
              className="w-20 px-3 py-2 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "#555" }}>Expires (days)</label>
            <input type="number" min="1" value={genDays} onChange={e => setGenDays(Number(e.target.value))}
              className="w-28 px-3 py-2 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "#555" }}>Max Uses</label>
            <input type="number" min="1" value={genMaxUses} onChange={e => setGenMaxUses(Number(e.target.value))}
              className="w-20 px-3 py-2 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#ddd", outline: "none" }} />
          </div>
          <div className="flex items-end">
            <button onClick={handleGenerate} disabled={generating}
              className="px-5 py-2 rounded-xl text-sm font-semibold"
              style={{ background: generating ? "rgba(0,245,212,0.3)" : T, color: "#050508" }}>
              {generating ? "Generating…" : "Generate"}
            </button>
          </div>
        </div>

        {newCodes.length > 0 && (
          <div className="p-3 rounded-xl" style={{ background: "rgba(0,245,212,0.05)", border: "1px solid rgba(0,245,212,0.15)" }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium" style={{ color: T }}>New codes ({newCodes.length})</span>
              <button onClick={copyAll} className="text-xs" style={{ color: copied === "all" ? T : "#555" }}>
                {copied === "all" ? "✓ Copied!" : "Copy All"}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1">
              {newCodes.map(c => (
                <button key={c} onClick={() => { navigator.clipboard.writeText(c); setCopied(c); setTimeout(() => setCopied(null), 2000); }}
                  className="px-2 py-1 rounded-lg text-xs font-mono text-left"
                  style={{ background: "rgba(255,255,255,0.04)", color: copied === c ? T : "#aaa" }}>
                  {copied === c ? "✓ " : ""}{c}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Code list */}
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="grid grid-cols-4 px-4 py-2 text-xs" style={{ background: "rgba(255,255,255,0.03)", color: "#555" }}>
          <span>Code</span><span>Uses</span><span>Expires</span><span>Status</span>
        </div>
        {loading ? (
          <div className="text-center py-8" style={{ color: "#444" }}>Loading…</div>
        ) : codes.length === 0 ? (
          <div className="text-center py-8" style={{ color: "#444" }}>No codes yet</div>
        ) : (
          codes.map(c => (
            <div key={c.id} className="grid grid-cols-4 px-4 py-2.5 text-xs border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              <button onClick={() => { navigator.clipboard.writeText(c.code); setCopied(c.code); setTimeout(() => setCopied(null), 2000); }}
                className="font-mono text-left" style={{ color: copied === c.code ? T : "#aaa" }}>
                {copied === c.code ? "✓ Copied" : c.code}
              </button>
              <span style={{ color: "#666" }}>{c.use_count}/{c.max_uses}</span>
              <span style={{ color: "#666" }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : "Never"}</span>
              <span style={{ color: c.used ? "#f56" : T }}>{c.used ? "Used" : "Active"}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
