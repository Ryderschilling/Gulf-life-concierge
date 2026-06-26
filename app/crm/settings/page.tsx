import { createClient } from "@/lib/supabase/server";
import Header from "@/components/layout/Header";
import type { Profile } from "@/lib/types";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user?.id ?? "")
    .single();

  const p = profile as Profile | null;

  return (
    <div>
      <Header title="Settings" subtitle="Your account and workspace settings" />

      <div className="max-w-xl space-y-6">
        {/* Profile */}
        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #e5e0d3" }}>
          <h2 className="font-serif text-lg font-medium mb-4" style={{ color: "#1a2f5a" }}>Profile</h2>
          <div className="space-y-3">
            {[
              { label: "Name", value: p?.full_name ?? "—" },
              { label: "Email", value: user?.email ?? "—" },
              { label: "Role", value: p?.role?.replace("_", " ") ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid #f4f1e8" }}>
                <span className="text-sm" style={{ color: "#9ca3af" }}>{label}</span>
                <span className="text-sm font-medium capitalize" style={{ color: "#1a2f5a" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Workspace info */}
        <div className="bg-white rounded-xl p-5" style={{ border: "1px solid #e5e0d3" }}>
          <h2 className="font-serif text-lg font-medium mb-4" style={{ color: "#1a2f5a" }}>Workspace</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-1.5" style={{ borderBottom: "1px solid #f4f1e8" }}>
              <span className="text-sm" style={{ color: "#9ca3af" }}>Company</span>
              <span className="text-sm font-medium" style={{ color: "#1a2f5a" }}>Gulf Life Concierge</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-sm" style={{ color: "#9ca3af" }}>Database</span>
              <span className="text-sm font-medium text-emerald-600 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Supabase Connected
              </span>
            </div>
          </div>
        </div>

        {/* Phase 2 coming soon */}
        <div className="rounded-xl p-5" style={{ backgroundColor: "#fef9ec", border: "1px solid #e8c06a" }}>
          <h2 className="font-serif text-lg font-medium mb-2" style={{ color: "#92700a" }}>
            Phase 2 — Automations & AI
          </h2>
          <p className="text-sm" style={{ color: "#b8943e" }}>
            Coming soon: Twilio SMS, Resend email sequences, OpenAI follow-up drafts, and a daily AI digest sent to your phone every morning.
          </p>
        </div>
      </div>
    </div>
  );
}
