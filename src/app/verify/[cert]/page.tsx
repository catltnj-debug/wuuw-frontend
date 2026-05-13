import type { Metadata } from "next";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

// ─── Types ────────────────────────────────────────────────────────────────────
interface CertData {
  valid: boolean;
  certificate_no: string;
  issued_date: string;
  asset: { asset_no: string; title: string; format: string; version?: string | null };
  creator: { username: string; user_id: number };
  copyright: {
    file_hash_sha256: string;
    contributors: { username: string; share_pct: number }[];
    parent_certificate_no?: string | null;
  };
  verification_url: string;
  badge_url: string;
  asset_url: string;
}

// ─── Data fetching ────────────────────────────────────────────────────────────
async function getCert(certNo: string): Promise<CertData | null> {
  try {
    const res = await fetch(`${API}/verify/${certNo}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ─── Open Graph metadata ──────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ cert: string }>;
}): Promise<Metadata> {
  const { cert } = await params;
  const data = await getCert(cert);

  if (!data) {
    return {
      title: "Certificate Not Found — WuuW",
      description: "This certificate does not exist on the WuuW platform.",
    };
  }

  const title = `${data.asset.title} · ${data.certificate_no} — WuuW Verified`;
  const description = `3D model "${data.asset.title}" by ${data.creator.username} · SHA-256 verified on WuuW · Issued ${data.issued_date}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: data.verification_url,
      siteName: "WuuW",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

// ─── Components ───────────────────────────────────────────────────────────────
function HashDisplay({ hash }: { hash: string }) {
  return (
    <div
      className="rounded-lg px-4 py-3 font-mono text-xs break-all"
      style={{ background: "#0d0d0d", color: "#00F5D4", border: "1px solid #1e1e1e" }}
    >
      {hash}
    </div>
  );
}

function ContribPie({
  contributors,
}: {
  contributors: { username: string; share_pct: number }[];
}) {
  if (!contributors.length) return null;

  const colors = ["#00F5D4", "#00bfa5", "#00897b", "#004d40", "#80cbc4"];
  let cumulative = 0;
  const total = contributors.reduce((s, c) => s + c.share_pct, 0);

  const slices = contributors.map((c, i) => {
    const pct = (c.share_pct / total) * 100;
    const start = (cumulative / 100) * 360;
    cumulative += pct;
    const end = (cumulative / 100) * 360;
    const startRad = ((start - 90) * Math.PI) / 180;
    const endRad = ((end - 90) * Math.PI) / 180;
    const r = 44;
    const x1 = 50 + r * Math.cos(startRad);
    const y1 = 50 + r * Math.sin(startRad);
    const x2 = 50 + r * Math.cos(endRad);
    const y2 = 50 + r * Math.sin(endRad);
    const large = pct > 50 ? 1 : 0;
    const d = `M50,50 L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`;
    return { d, color: colors[i % colors.length], ...c, pct };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width="100" height="100" viewBox="0 0 100 100">
        {slices.map((s, i) => (
          <path key={i} d={s.d} fill={s.color} stroke="#111" strokeWidth="1" />
        ))}
      </svg>
      <div className="flex flex-col gap-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: s.color }} />
            <span style={{ color: "#ccc" }}>{s.username}</span>
            <span style={{ color: "#555" }}>{s.share_pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ cert: string }>;
}) {
  const { cert } = await params;
  const data = await getCert(cert);
  const TEAL = "#00F5D4";

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: "#0a0a0a" }}>
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">✗</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "#eee" }}>
            Certificate Not Found
          </h1>
          <p className="mb-6" style={{ color: "#666" }}>
            <code style={{ color: "#aaa" }}>{cert}</code> does not exist on the WuuW platform.
          </p>
          <Link
            href="/"
            className="px-6 py-2 rounded-lg text-sm font-semibold"
            style={{ background: TEAL, color: "#000" }}
          >
            Go to WuuW
          </Link>
        </div>
      </div>
    );
  }

  const contributors = data.copyright.contributors;
  const assetId = data.asset_url.split("/").pop();

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: "#0a0a0a" }}>
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ background: TEAL, color: "#000" }}
          >
            ✓
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: TEAL }}>
              WuuW Verified
            </p>
            <p className="text-lg font-bold" style={{ color: "#eee" }}>
              Copyright Certificate
            </p>
          </div>
          <div className="ml-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`${API}/verify/${cert}/badge`} alt="WuuW Verified Badge" className="h-6" />
          </div>
        </div>

        {/* Main card */}
        <div className="rounded-2xl overflow-hidden mb-6" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
          <div className="px-6 py-4" style={{ background: "#0d1a17", borderBottom: "1px solid #1e1e1e" }}>
            <p className="text-xs font-mono" style={{ color: "#555" }}>CERTIFICATE</p>
            <p className="text-xl font-mono font-bold" style={{ color: TEAL }}>
              {data.certificate_no}
            </p>
            <p className="text-sm mt-1" style={{ color: "#555" }}>Issued {data.issued_date}</p>
          </div>

          <div className="px-6 py-6 space-y-6">
            {/* Asset */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#444" }}>Asset</h2>
              <p className="text-lg font-semibold" style={{ color: "#eee" }}>{data.asset.title}</p>
              <p className="text-sm mt-1" style={{ color: "#666" }}>
                {data.asset.asset_no}
                {data.asset.version && ` · ${data.asset.version}`}
                {` · ${data.asset.format.toUpperCase()}`}
              </p>
              {data.copyright.parent_certificate_no && (
                <p className="text-xs mt-1" style={{ color: "#555" }}>
                  Derived from{" "}
                  <Link href={`/verify/${data.copyright.parent_certificate_no}`} style={{ color: TEAL }}>
                    {data.copyright.parent_certificate_no}
                  </Link>
                </p>
              )}
            </section>

            {/* Creator */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#444" }}>Creator</h2>
              <p className="text-sm font-semibold" style={{ color: "#eee" }}>@{data.creator.username}</p>
            </section>

            {/* Copyright distribution */}
            {contributors.length > 0 && (
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: "#444" }}>
                  Copyright Distribution
                </h2>
                <ContribPie contributors={contributors} />
              </section>
            )}

            {/* SHA-256 */}
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#444" }}>
                File Integrity · SHA-256
              </h2>
              <HashDisplay hash={data.copyright.file_hash_sha256} />
              <p className="text-xs mt-2" style={{ color: "#444" }}>
                This hash uniquely identifies the exact file that was submitted and certified.
              </p>
            </section>
          </div>
        </div>

        {/* Embed snippet */}
        <div className="rounded-xl px-5 py-4 mb-6" style={{ background: "#111", border: "1px solid #1e1e1e" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#555" }}>Embed this badge:</p>
          <code className="text-xs block break-all" style={{ color: "#888" }}>
            {`<img src="${API}/verify/${cert}/badge" alt="WuuW Verified" />`}
          </code>
        </div>

        {/* CTA */}
        <div className="flex gap-3">
          <Link
            href={`/assets/${assetId}`}
            className="flex-1 text-center px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ background: TEAL, color: "#000" }}
          >
            View Full Project on WuuW
          </Link>
          <Link
            href="/"
            className="px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ background: "#1a1a1a", color: "#aaa", border: "1px solid #222" }}
          >
            WuuW Home
          </Link>
        </div>

        <p className="text-center text-xs mt-8" style={{ color: "#333" }}>
          Publicly verifiable at <span style={{ color: "#555" }}>{data.verification_url}</span>
        </p>
      </div>
    </div>
  );
}
