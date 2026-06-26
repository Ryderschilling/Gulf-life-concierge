import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/layout/Sidebar";
import { Toaster } from "react-hot-toast";
import type { Profile } from "@/lib/types";

export default async function CRMLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const rawName = profile?.full_name ?? "";
  const isEmailUsedAsName = rawName.includes("@");
  const displayName = rawName && !isEmailUsedAsName
    ? rawName
    : user.email?.split("@")[0] ?? "User";

  const profileWithName: Profile | null = profile
    ? { ...profile, full_name: displayName }
    : null;

  // Pending to-do count for sidebar badge (graceful if migration not yet run)
  let pendingTodoCount = 0;
  try {
    const now = new Date().toISOString();
    const [draftsCount, followUpsCount] = await Promise.all([
      supabase.from("email_drafts").select("count").eq("status", "pending").single(),
      supabase.from("leads").select("count").lte("next_follow_up_at", now).not("status", "in", '("closed_won","closed_lost")').single(),
    ]);
    pendingTodoCount =
      ((draftsCount.data as { count: number } | null)?.count ?? 0) +
      ((followUpsCount.data as { count: number } | null)?.count ?? 0);
  } catch {
    // Migration not run yet — badge will show 0 until DB is updated
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "#ffffff" }}>
      <Sidebar profile={profileWithName as Profile | null} pendingTodoCount={pendingTodoCount} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#ffffff",
            color: "#0a0a0a",
            border: "1px solid #1f1f1f",
            borderRadius: "10px",
            fontSize: "14px",
            fontFamily: "Inter, system-ui, sans-serif",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          },
          success: { iconTheme: { primary: "#d4a843", secondary: "#ffffff" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: "#ffffff" } },
        }}
      />
    </div>
  );
}
