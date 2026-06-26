import { createClient } from "@/lib/supabase/server";
import { STATUS_CONFIG, timeAgo, getInitials, SOURCE_LABELS } from "@/lib/utils";
import type { Lead, LeadStatus, LeadSource, DashboardStats } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard" };

// ── Status dot colors (functional only — used for small dots, not backgrounds) ──
const STAGE_DOT: Record<LeadStatus, string> = {
  new:         "#737373",
  contacted:   "#6b6b6b",
  nurturing:   "#d4a843",
  proposal:    "#737373",
  closed_won:  "#0a0a0a",
  closed_lost: "#a3a3a3",
};

// ── SVG bar chart — monochrome ──────────────────────────────────────────────────
function BarChart({ data, height = 130 }: {
  data: { label: string; value: number }[];
  height?: number;
}) {
  const max     = Math.max(...data.map((d) => d.value), 1);
  const barW    = 28;
  const gap     = 14;
  const totalW  = data.length * (barW + gap) - gap;
  const padL    = 24;
  const padB    = 26;
  const chartH  = height - padB;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${totalW + padL + 4} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: "visible" }}
    >
      {[0, 0.5, 1].map((frac) => {
        const y = chartH - frac * chartH;
        return (
          <g key={frac}>
            <line x1={padL} y1={y} x2={totalW + padL + 4} y2={y} stroke="#e5e5e5" strokeWidth="1" />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="9" fill="#a3a3a3">
              {Math.round(frac * max)}
            </text>
          </g>
        );
      })}

      {data.map((d, i) => {
        const barH = max > 0 ? (d.value / max) * chartH : 0;
        const x    = padL + i * (barW + gap);
        const y    = chartH - barH;
        return (
          <g key={d.label}>
            <rect x={x} y={0} width={barW} height={chartH} fill="#eeeeee" rx="4" />
            {barH > 0 && (
              <rect x={x} y={y} width={barW} height={barH} fill="#0a0a0a" rx="4" />
            )}
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="10" fontWeight="600" fill="#737373">
                {d.value}
              </text>
            )}
            <text x={x + barW / 2} y={height - 4} textAnchor="middle" fontSize="9" fill="#a3a3a3">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Horizontal bar row ─────────────────────────────────────────────────────────
function HBar({ label, count, pct, rank }: { label: string; count: number; pct: number; rank: number }) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: "1px solid #1f1f1f" }}>
      <span className="text-xs font-medium w-5 shrink-0 text-center" style={{ color: "#a3a3a3" }}>
        {String(rank).padStart(2, "0")}
      </span>
      <span className="text-sm w-24 shrink-0 truncate" style={{ color: "#737373" }}>{label}</span>
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: "#f5f5f5" }}
        />
      </div>
      <span className="text-xs font-semibold w-6 text-right shrink-0" style={{ color: "#6b6b6b" }}>
        {count}
      </span>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, sub }: {
  label: string; value: string | number; icon: React.ReactNode; sub?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3"
      style={{ backgroundColor: "#ffffff", border: "1px solid #1f1f1f" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "#a3a3a3" }}>
          {label}
        </span>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: "#ffffff", color: "#737373" }}
        >
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight" style={{ color: "#0a0a0a" }}>{value}</div>
      {sub && <p className="text-xs" style={{ color: "#a3a3a3" }}>{sub}</p>}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: leads = [] } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  const all = (leads ?? []) as Lead[];

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const stats: DashboardStats = {
    total_leads:     all.length,
    new_leads:       all.filter((l) => new Date(l.created_at) > oneWeekAgo).length,
    contacted:       all.filter((l) => l.status === "contacted").length,
    nurturing:       all.filter((l) => l.status === "nurturing").length,
    proposals:       all.filter((l) => l.status === "proposal").length,
    closed_won:      all.filter((l) => l.status === "closed_won").length,
    closed_lost:     all.filter((l) => l.status === "closed_lost").length,
    conversion_rate: all.length > 0
      ? Math.round((all.filter((l) => l.status === "closed_won").length / all.length) * 100)
      : 0,
  };

  const pipelineStages: LeadStatus[] = ["new", "contacted", "nurturing", "proposal", "closed_won", "closed_lost"];

  const barData = pipelineStages.map((s) => ({
    label: STATUS_CONFIG[s].label.slice(0, 5),
    value: all.filter((l) => l.status === s).length,
  }));

  const allSources = ["website", "referral", "cold_call", "social", "email", "other"] as LeadSource[];
  const sourceRows = allSources
    .map((src) => ({ src, label: SOURCE_LABELS[src], count: all.filter((l) => l.source === src).length }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
  const maxSrc = sourceRows[0]?.count || 1;

  const funnelStages = [
    { label: "Total Leads",  count: all.length },
    { label: "Contacted",    count: all.filter((l) => l.status !== "new").length },
    { label: "Nurturing",    count: all.filter((l) => ["nurturing", "proposal", "closed_won", "closed_lost"].includes(l.status)).length },
    { label: "Proposal",     count: all.filter((l) => ["proposal", "closed_won"].includes(l.status)).length },
    { label: "Closed Won",   count: stats.closed_won },
  ];
  const maxFunnel = funnelStages[0]?.count || 1;

  const recent = all.slice(0, 6);

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const followUp = all
    .filter((l) =>
      l.status !== "closed_won" && l.status !== "closed_lost" &&
      (!l.last_contacted_at || new Date(l.last_contacted_at) < threeDaysAgo)
    )
    .slice(0, 4);

  const card: React.CSSProperties = {
    backgroundColor: "#ffffff",
    border: "1px solid #1f1f1f",
    borderRadius: "14px",
    padding: "20px 22px",
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "#0a0a0a" }}>Dashboard</h1>
          <p className="text-sm mt-0.5" style={{ color: "#737373" }}>
            {all.length} lead{all.length !== 1 ? "s" : ""} in pipeline
          </p>
        </div>
        <Link
          href="/crm/leads"
          className="flex items-center gap-2 px-4 py-2 font-semibold rounded-lg text-sm transition-colors hover:bg-[#e8c06a]"
          style={{ backgroundColor: "#d4a843", color: "#0a0a0a" }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Lead
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Leads" value={stats.total_leads}
          sub={stats.new_leads > 0 ? `+${stats.new_leads} this week` : "No new this week"}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
        />
        <StatCard label="New This Week" value={stats.new_leads}
          sub="Added in last 7 days"
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
        />
        <StatCard label="Proposals Out" value={stats.proposals}
          sub={`${stats.closed_won} closed won`}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>}
        />
        <StatCard label="Win Rate" value={`${stats.conversion_rate}%`}
          sub={`${stats.closed_won} won / ${all.length} total`}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>}
        />
      </div>

      {/* Row 2: Pipeline chart + Sources */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div style={card} className="lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "#0a0a0a" }}>Pipeline Activity</h2>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Leads by stage</p>
            </div>
          </div>
          <BarChart data={barData} height={130} />
        </div>

        <div style={card} className="lg:col-span-2">
          <div className="mb-4">
            <h2 className="text-sm font-semibold" style={{ color: "#0a0a0a" }}>Lead Sources</h2>
            <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Where leads come from</p>
          </div>
          {sourceRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-sm" style={{ color: "#a3a3a3" }}>No data yet</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 pb-2 mb-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: "#a3a3a3", borderBottom: "1px solid #1f1f1f" }}>
                <span className="w-5 shrink-0" /><span className="w-24 shrink-0">Source</span>
                <span className="flex-1">Share</span><span className="w-6 text-right">N</span>
              </div>
              {sourceRows.map((r, i) => (
                <HBar key={r.src} rank={i + 1} label={r.label} count={r.count} pct={(r.count / maxSrc) * 100} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Funnel + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
        <div style={card} className="lg:col-span-2">
          <div className="mb-5">
            <h2 className="text-sm font-semibold" style={{ color: "#0a0a0a" }}>Conversion Funnel</h2>
            <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Lead progression</p>
          </div>
          <div className="space-y-4">
            {funnelStages.map((f, i) => {
              const pct = maxFunnel > 0 ? (f.count / maxFunnel) * 100 : 0;
              return (
                <div key={f.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-medium" style={{ color: "#a3a3a3" }}>{i + 1}</span>
                      <span className="text-sm" style={{ color: "#737373" }}>{f.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: "#0a0a0a" }}>{f.count}</span>
                      <span className="text-xs w-8 text-right" style={{ color: "#a3a3a3" }}>{Math.round(pct)}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: "#f5f5f5" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 rounded-xl px-4 py-3 flex items-center justify-between"
            style={{ backgroundColor: "#ffffff", border: "1px solid #262626" }}>
            <span className="text-sm" style={{ color: "#6b6b6b" }}>Win Rate</span>
            <span className="text-xl font-bold" style={{ color: "#d4a843" }}>{stats.conversion_rate}%</span>
          </div>
        </div>

        <div style={card} className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "#0a0a0a" }}>Recent Leads</h2>
              <p className="text-xs mt-0.5" style={{ color: "#a3a3a3" }}>Latest additions</p>
            </div>
            <Link href="/crm/leads" className="text-xs font-medium transition-colors"
              style={{ color: "#d4a843" }}>
              View all →
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10" style={{ color: "#a3a3a3" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-40">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              </svg>
              <p className="text-sm">No leads yet.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-3 pb-2 mb-0.5" style={{ borderBottom: "1px solid #1f1f1f" }}>
                <span className="flex-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: "#a3a3a3" }}>Name</span>
                <span className="w-20 text-[10px] font-medium uppercase tracking-wider text-center" style={{ color: "#a3a3a3" }}>Stage</span>
                <span className="w-16 text-[10px] font-medium uppercase tracking-wider text-right" style={{ color: "#a3a3a3" }}>Added</span>
              </div>
              {recent.map((lead) => {
                const cfg   = STATUS_CONFIG[lead.status];
                const dot   = STAGE_DOT[lead.status];
                return (
                  <Link key={lead.id} href="/crm/leads"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-[#f5f5f5]"
                    style={{ color: "inherit" }}
                  >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: "#ffffff", color: "#6b6b6b" }}>
                      {getInitials(lead.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#0a0a0a" }}>{lead.name}</p>
                      <p className="text-xs truncate" style={{ color: "#a3a3a3" }}>
                        {lead.property_interest ?? lead.email ?? "—"}
                      </p>
                    </div>
                    <span className="w-20 inline-flex items-center justify-center gap-1.5 text-xs px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "#ffffff", color: "#6b6b6b" }}>
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />
                      {cfg.label}
                    </span>
                    <span className="w-16 text-[11px] text-right shrink-0" style={{ color: "#a3a3a3" }}>
                      {timeAgo(lead.created_at)}
                    </span>
                  </Link>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Follow-up */}
      {followUp.length > 0 && (
        <div style={card}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ backgroundColor: "#ffffff" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold" style={{ color: "#737373" }}>Follow-up Needed</h2>
                <p className="text-xs" style={{ color: "#a3a3a3" }}>{followUp.length} lead{followUp.length !== 1 ? "s" : ""} need attention</p>
              </div>
            </div>
            <Link href="/crm/leads" className="text-xs font-medium" style={{ color: "#d4a843" }}>View →</Link>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {followUp.map((lead) => (
              <Link key={lead.id} href="/crm/leads"
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-colors hover:bg-[#222222]"
                style={{ backgroundColor: "#ffffff" }}
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ backgroundColor: "#d4d4d4", color: "#737373" }}>
                  {getInitials(lead.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#0a0a0a" }}>{lead.name}</p>
                  <p className="text-xs" style={{ color: "#a3a3a3" }}>
                    {lead.last_contacted_at ? timeAgo(lead.last_contacted_at) : "Never contacted"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
