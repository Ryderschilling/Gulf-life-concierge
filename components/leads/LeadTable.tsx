"use client";

import { useState } from "react";
import { STATUS_CONFIG, SOURCE_LABELS, getInitials, formatPhone, formatDate } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/types";
import LeadDetailModal from "./LeadDetailModal";

interface LeadTableProps {
  leads: Lead[];
  onLeadsChange: (leads: Lead[]) => void;
}

type SortKey = "name" | "status" | "source" | "budget_range" | "created_at";

// Neutral dot colors — small indicators only, no background tints
const STAGE_DOT: Record<LeadStatus, string> = {
  new:         "#737373",
  contacted:   "#6b6b6b",
  nurturing:   "#d4a843",
  proposal:    "#737373",
  closed_won:  "#0a0a0a",
  closed_lost: "#a3a3a3",
};

export default function LeadTable({ leads, onLeadsChange }: LeadTableProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const sorted = [...leads].sort((a, b) => {
    const aVal = (a[sortKey] ?? "") as string;
    const bVal = (b[sortKey] ?? "") as string;
    return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  function handleLeadUpdated(updated: Lead) {
    onLeadsChange(leads.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
  }

  function handleLeadDeleted(id: string) {
    onLeadsChange(leads.filter((l) => l.id !== id));
    setSelectedLead(null);
  }

  if (leads.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 rounded-2xl"
        style={{ border: "1px dashed #1f1f1f", color: "#a3a3a3" }}
      >
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-3 opacity-30">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <p className="text-sm">No leads yet — add your first one</p>
      </div>
    );
  }

  const SortIcon = ({ k }: { k: SortKey }) => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "inline", marginLeft: "4px", opacity: sortKey === k ? 0.8 : 0.2 }}
    >
      {sortKey === k && sortDir === "asc"
        ? <polyline points="18 15 12 9 6 15" />
        : <polyline points="6 9 12 15 18 9" />}
    </svg>
  );

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    fontSize: "11px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    padding: "11px 16px",
    color: "#a3a3a3",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
    backgroundColor: "#f0f0f0",
    borderBottom: "1px solid #1f1f1f",
  };

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th style={{ ...thStyle, width: "22%", cursor: "pointer" }} onClick={() => handleSort("name")}>Name <SortIcon k="name" /></th>
              <th style={{ ...thStyle, width: "12%", cursor: "pointer" }} onClick={() => handleSort("status")}>Status <SortIcon k="status" /></th>
              <th style={{ ...thStyle, width: "10%", cursor: "pointer" }} onClick={() => handleSort("source")}>Source <SortIcon k="source" /></th>
              <th style={{ ...thStyle, width: "16%", cursor: "default" }}>Property</th>
              <th style={{ ...thStyle, width: "11%", cursor: "pointer" }} onClick={() => handleSort("budget_range")}>Budget <SortIcon k="budget_range" /></th>
              <th style={{ ...thStyle, width: "18%", cursor: "default" }}>Contact</th>
              <th style={{ ...thStyle, width: "9%", cursor: "pointer" }} onClick={() => handleSort("created_at")}>Added <SortIcon k="created_at" /></th>
              <th style={{ ...thStyle, width: "48px", cursor: "default" }} />
            </tr>
          </thead>
          <tbody>
            {sorted.map((lead, i) => {
              const cfg = STATUS_CONFIG[lead.status];
              const dot = STAGE_DOT[lead.status];
              const isLast = i === sorted.length - 1;
              return (
                <tr
                  key={lead.id}
                  className="cursor-pointer transition-colors"
                  style={{
                    borderBottom: isLast ? "none" : "1px solid #1a1a1a",
                    backgroundColor: "#ffffff",
                  }}
                  onClick={() => setSelectedLead(lead)}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#f5f5f5")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#f5f5f5")}
                >
                  {/* Name */}
                  <td style={{ padding: "13px 16px" }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                        style={{ backgroundColor: "#f0f0f0", color: "#525252" }}
                      >
                        {getInitials(lead.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#0a0a0a" }}>{lead.name}</p>
                        {lead.company && <p className="text-xs truncate" style={{ color: "#a3a3a3" }}>{lead.company}</p>}
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td style={{ padding: "13px 16px" }}>
                    <span
                      className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: "#ffffff", color: "#6b6b6b" }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                      {cfg.label}
                    </span>
                  </td>

                  {/* Source */}
                  <td style={{ padding: "13px 16px" }}>
                    <span className="text-sm" style={{ color: "#737373" }}>
                      {lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : "—"}
                    </span>
                  </td>

                  {/* Property */}
                  <td style={{ padding: "13px 16px" }}>
                    <span className="text-sm block truncate max-w-[160px]" style={{ color: "#737373" }}>
                      {lead.property_interest || "—"}
                    </span>
                  </td>

                  {/* Budget */}
                  <td style={{ padding: "13px 16px" }}>
                    <span className="text-sm" style={{ color: "#737373" }}>
                      {lead.budget_range || "—"}
                    </span>
                  </td>

                  {/* Contact */}
                  <td style={{ padding: "13px 16px" }}>
                    <div className="space-y-0.5">
                      {lead.email && <p className="text-xs truncate max-w-[170px]" style={{ color: "#737373" }}>{lead.email}</p>}
                      {lead.phone && <p className="text-xs" style={{ color: "#737373" }}>{formatPhone(lead.phone)}</p>}
                      {!lead.email && !lead.phone && <span style={{ color: "#a3a3a3" }}>—</span>}
                    </div>
                  </td>

                  {/* Added */}
                  <td style={{ padding: "13px 16px" }}>
                    <span className="text-xs whitespace-nowrap" style={{ color: "#a3a3a3" }}>
                      {formatDate(lead.created_at)}
                    </span>
                  </td>

                  {/* Detail */}
                  <td style={{ padding: "13px 8px" }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedLead(lead); }}
                      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto"
                      style={{ color: "#a3a3a3" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "#e5e5e5";
                        (e.currentTarget as HTMLElement).style.color = "#0a0a0a";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                        (e.currentTarget as HTMLElement).style.color = "#a3a3a3";
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={handleLeadUpdated}
          onDeleted={handleLeadDeleted}
        />
      )}
    </>
  );
}
