import { createClient } from "@/lib/supabase/server";
import LeadsPageClient from "@/components/leads/LeadsPageClient";
import type { Lead } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const supabase = await createClient();

  const { data: leads } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  return <LeadsPageClient leads={(leads ?? []) as Lead[]} />;
}
