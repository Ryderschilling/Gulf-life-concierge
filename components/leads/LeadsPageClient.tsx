"use client";

import { useState } from "react";
import LeadTable from "./LeadTable";
import NewLeadModal from "./NewLeadModal";
import type { Lead } from "@/lib/types";
import { useRouter } from "next/navigation";

interface LeadsPageClientProps {
  leads: Lead[];
}

export default function LeadsPageClient({ leads: initialLeads }: LeadsPageClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [showModal, setShowModal] = useState(false);
  const router = useRouter();

  function handleLeadCreated(lead: Lead) {
    setLeads((prev) => [lead, ...prev]);
  }

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#0a0a0a" }}>
            Leads
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#737373" }}>
            {leads.length === 0
              ? "No leads yet — add your first one"
              : `${leads.length} lead${leads.length !== 1 ? "s" : ""} in pipeline`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 font-semibold rounded-lg text-sm transition-colors"
          style={{ backgroundColor: "#d4a843", color: "#0a0a0a" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#e8c06a")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = "#d4a843")}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Lead
        </button>
      </div>

      <LeadTable leads={leads} onLeadsChange={setLeads} />

      {showModal && (
        <NewLeadModal
          onClose={() => setShowModal(false)}
          onLeadCreated={handleLeadCreated}
        />
      )}
    </div>
  );
}
