"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { STATUS_CONFIG, ORDERED_STATUSES, SOURCE_LABELS, getInitials, formatPhone, formatDate } from "@/lib/utils";
import type { Lead, LeadStatus } from "@/lib/types";
import toast from "react-hot-toast";

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
  onUpdated: (lead: Lead) => void;
  onDeleted: (id: string) => void;
}

const SOURCE_OPTIONS = [
  { value: "website", label: "Website" }, { value: "referral", label: "Referral" },
  { value: "cold_call", label: "Cold Call" }, { value: "social", label: "Social Media" },
  { value: "email", label: "Email" }, { value: "other", label: "Other" },
];

const PROPERTY_OPTIONS = ["Beach Front", "Homes With Private Pools", "Resort Vacation", "All Vacation Rentals"];

const STAGE_DOT: Record<LeadStatus, string> = {
  new: "#737373", contacted: "#6b6b6b", nurturing: "#d4a843",
  proposal: "#737373", closed_won: "#0a0a0a", closed_lost: "#a3a3a3",
};

const lbl: React.CSSProperties = {
  display: "block", fontSize: "11px", fontWeight: 600,
  color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "5px",
};

const inp: React.CSSProperties = {
  width: "100%", padding: "9px 13px",
  backgroundColor: "#ffffff", border: "1px solid #1f1f1f",
  borderRadius: "8px", color: "#0a0a0a", fontSize: "14px", outline: "none",
};

export default function LeadDetailModal({ lead, onClose, onUpdated, onDeleted }: LeadDetailModalProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const supabase = createClient();

  const [form, setForm] = useState({
    name: lead.name, email: lead.email ?? "", phone: lead.phone ?? "",
    company: lead.company ?? "", source: lead.source ?? "",
    property_interest: lead.property_interest ?? "", budget_range: lead.budget_range ?? "",
    move_in_timeline: lead.move_in_timeline ?? "", status: lead.status,
  });

  function set(key: string, value: string) { setForm((p) => ({ ...p, [key]: value })); }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const { data, error } = await supabase.from("leads")
      .update({
        name: form.name.trim(), email: form.email.trim() || null, phone: form.phone.trim() || null,
        company: form.company.trim() || null, source: form.source || null,
        property_interest: form.property_interest || null, budget_range: form.budget_range.trim() || null,
        move_in_timeline: form.move_in_timeline.trim() || null,
        status: form.status as LeadStatus, updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id).select().single();
    setSaving(false);
    if (error) { toast.error("Failed to save changes"); return; }
    toast.success("Lead updated");
    onUpdated({ ...lead, ...data });
    setEditing(false);
  }

  async function handleStatusChange(newStatus: LeadStatus) {
    if (newStatus === lead.status) return;
    const { data, error } = await supabase.from("leads")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", lead.id).select().single();
    if (error) { toast.error("Failed to update status"); return; }
    await supabase.from("lead_activities").insert({
      lead_id: lead.id, type: "status_change",
      body: `Status changed from ${STATUS_CONFIG[lead.status].label} to ${STATUS_CONFIG[newStatus].label}`,
      metadata: { from_status: lead.status, to_status: newStatus },
    });
    toast.success(`Moved to ${STATUS_CONFIG[newStatus].label}`);
    onUpdated({ ...lead, ...data });
    setForm((p) => ({ ...p, status: newStatus }));
  }

  async function handleDelete() {
    const { error } = await supabase.from("leads").delete().eq("id", lead.id);
    if (error) { toast.error("Failed to delete lead"); return; }
    toast.success("Lead deleted");
    onDeleted(lead.id);
  }

  

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.25)" }} onClick={onClose} />
      <div
        className="relative h-full flex flex-col overflow-hidden"
        style={{ width: "480px", maxWidth: "100vw", backgroundColor: "#ffffff", borderLeft: "1px solid #1f1f1f", boxShadow: "-12px 0 48px rgba(0,0,0,0.12)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 flex-shrink-0" style={{ borderBottom: "1px solid #1f1f1f" }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: "#f0f0f0", color: "#525252" }}>
              {getInitials(lead.name)}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold truncate" style={{ color: "#0a0a0a" }}>{lead.name}</h2>
              {lead.company && <p className="text-xs truncate" style={{ color: "#a3a3a3" }}>{lead.company}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!editing && (
              <button onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors"
                style={{ backgroundColor: "#e5e5e5", color: "#737373" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#d4d4d4"; (e.currentTarget as HTMLElement).style.color = "#0a0a0a"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#e5e5e5"; (e.currentTarget as HTMLElement).style.color = "#737373"; }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
            )}
            <button onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
              style={{ color: "#a3a3a3" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "#e5e5e5"; (e.currentTarget as HTMLElement).style.color = "#0a0a0a"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#a3a3a3"; }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {!editing && (
            <div>
              <p style={lbl}>Pipeline Stage</p>
              <div className="flex flex-wrap gap-1.5">
                {ORDERED_STATUSES.map((s) => {
                  const isActive = lead.status === s;
                  const dot = STAGE_DOT[s];
                  return (
                    <button key={s} onClick={() => handleStatusChange(s)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all"
                      style={isActive
                        ? { backgroundColor: "#d4d4d4", color: "#0a0a0a", border: "1px solid #3a3a3a" }
                        : { backgroundColor: "#ffffff", color: "#737373", border: "1px solid transparent" }}
                      onMouseEnter={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.backgroundColor = "#ebebeb"; (e.currentTarget as HTMLElement).style.color = "#737373"; } }}
                      onMouseLeave={(e) => { if (!isActive) { (e.currentTarget as HTMLElement).style.backgroundColor = "#f5f5f5"; (e.currentTarget as HTMLElement).style.color = "#737373"; } }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isActive ? dot : "#0c0c0c" }} />
                      {STATUS_CONFIG[s].label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {editing ? (
            <div className="space-y-4">
              <div>
                <label style={lbl}>Pipeline Stage</label>
                <select value={form.status} onChange={(e) => set("status", e.target.value)} style={inp}
                  onFocus={(e) => ((e.target as HTMLSelectElement).style.borderColor = "#d4a843")}
                  onBlur={(e) => ((e.target as HTMLSelectElement).style.borderColor = "#e5e5e5")}
                >
                  {ORDERED_STATUSES.map((s) => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Full Name <span style={{ color: "#d4a843" }}>*</span></label>
                <input value={form.name} onChange={(e) => set("name", e.target.value)} style={inp}
                  onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "#d4a843")}
                  onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "#e5e5e5")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={lbl}>Email</label>
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} style={inp}
                    onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "#d4a843")}
                    onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "#e5e5e5")}
                  />
                </div>
                <div>
                  <label style={lbl}>Phone</label>
                  <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} style={inp}
                    onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "#d4a843")}
                    onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "#e5e5e5")}
                  />
                </div>
              </div>
              <div>
                <label style={lbl}>Company</label>
                <input value={form.company} onChange={(e) => set("company", e.target.value)} style={inp}
                  onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "#d4a843")}
                  onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "#e5e5e5")}
                />
              </div>
              <div>
                <label style={lbl}>Lead Source</label>
                <select value={form.source} onChange={(e) => set("source", e.target.value)} style={inp}
                  onFocus={(e) => ((e.target as HTMLSelectElement).style.borderColor = "#d4a843")}
                  onBlur={(e) => ((e.target as HTMLSelectElement).style.borderColor = "#e5e5e5")}
                >
                  <option value="">Select source</option>
                  {SOURCE_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Property Interest</label>
                <select value={form.property_interest} onChange={(e) => set("property_interest", e.target.value)} style={inp}
                  onFocus={(e) => ((e.target as HTMLSelectElement).style.borderColor = "#d4a843")}
                  onBlur={(e) => ((e.target as HTMLSelectElement).style.borderColor = "#e5e5e5")}
                >
                  <option value="">Select property type</option>
                  {PROPERTY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={lbl}>Budget Range</label>
                  <input value={form.budget_range} onChange={(e) => set("budget_range", e.target.value)} placeholder="$3,000–5,000/mo" style={inp}
                    onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "#d4a843")}
                    onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "#e5e5e5")}
                  />
                </div>
                <div>
                  <label style={lbl}>Move-in Timeline</label>
                  <input value={form.move_in_timeline} onChange={(e) => set("move_in_timeline", e.target.value)} placeholder="ASAP, 3 months..." style={inp}
                    onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = "#d4a843")}
                    onBlur={(e) => ((e.target as HTMLInputElement).style.borderColor = "#e5e5e5")}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <Section label="Contact">
                <DR icon={<PhoneIcon />} label="Phone" value={lead.phone ? formatPhone(lead.phone) : null} />
                <DR icon={<EmailIcon />} label="Email" value={lead.email} />
                <DR icon={<CompanyIcon />} label="Company" value={lead.company} />
              </Section>
              <Section label="Property Interest">
                <DR icon={<HomeIcon />} label="Type" value={lead.property_interest} />
                <DR icon={<BudgetIcon />} label="Budget" value={lead.budget_range} />
                <DR icon={<CalIcon />} label="Timeline" value={lead.move_in_timeline} />
              </Section>
              <Section label="Details">
                <DR icon={<GlobeIcon />} label="Source" value={lead.source ? (SOURCE_LABELS[lead.source] ?? lead.source) : null} />
                <DR icon={<ClockIcon />} label="Added" value={formatDate(lead.created_at)} />
              </Section>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderTop: "1px solid #1f1f1f" }}>
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm rounded-lg transition-colors" style={{ color: "#a3a3a3" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#0a0a0a")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "#a3a3a3")}
              >Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 font-semibold rounded-lg text-sm transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#d4a843", color: "#0a0a0a" }}
                onMouseEnter={(e) => { if (!saving) (e.currentTarget as HTMLElement).style.backgroundColor = "#e8c06a"; }}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#d4a843")}
              >{saving ? "Saving..." : "Save Changes"}</button>
            </>
          ) : (
            <>
              {confirmDelete ? (
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "#737373" }}>Delete this lead?</span>
                  <button onClick={handleDelete} className="px-3 py-1.5 text-xs font-semibold rounded-lg"
                    style={{ backgroundColor: "rgba(239,68,68,0.15)", color: "#ef4444" }}>Yes, delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs rounded-lg" style={{ color: "#a3a3a3" }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors" style={{ color: "#a3a3a3" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(239,68,68,0.1)"; (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = "#a3a3a3"; }}
                >
                  <TrashIcon /> Delete Lead
                </button>
              )}
              <span className="text-xs" style={{ color: "#a3a3a3" }}>Updated {formatDate(lead.updated_at)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ display: "block", fontSize: "11px", fontWeight: 600, color: "#a3a3a3", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
        {label}
      </p>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1f1f1f" }}>
        {children}
      </div>
    </div>
  );
}

function DR({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
      <span style={{ color: "#a3a3a3" }}>{icon}</span>
      <span className="text-xs w-20 flex-shrink-0" style={{ color: "#a3a3a3" }}>{label}</span>
      <span className="text-sm" style={{ color: value ? "#0a0a0a" : "#d4d4d4" }}>{value ?? "—"}</span>
    </div>
  );
}

const PhoneIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
const EmailIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>;
const CompanyIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
const HomeIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>;
const BudgetIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
const CalIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const GlobeIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
const ClockIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>;
