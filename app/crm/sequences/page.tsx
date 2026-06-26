import Header from "@/components/layout/Header";

export const metadata = { title: "Sequences" };

export default function SequencesPage() {
  return (
    <div>
      <Header
        title="Sequences"
        subtitle="Automated email & SMS drip campaigns"
      />

      <div className="flex items-center justify-center h-80">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#d4a843]/10 border border-[#d4a843]/20 flex items-center justify-center mx-auto mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-white mb-1">Sequences — Coming in Phase 2</h2>
          <p className="text-sm text-[#52525b] max-w-sm">
            Build automated email and SMS drip sequences. Enroll leads automatically based on status, trigger messages, and track open rates.
          </p>
        </div>
      </div>
    </div>
  );
}
