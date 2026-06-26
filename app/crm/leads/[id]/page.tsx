import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import LeadDetailClient from "@/components/leads/LeadDetailClient";
import type { Lead, LeadActivity, LeadNote, LeadAddress } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("leads").select("name").eq("id", id).single();
  return { title: data?.name ?? "Lead" };
}

export default async function LeadDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [leadResult, activitiesResult, notesResult, addressesResult] = await Promise.all([
    supabase
      .from("leads")
      .select("*, profiles(full_name, role, avatar_url)")
      .eq("id", id)
      .single(),
    supabase
      .from("lead_activities")
      .select("*, profiles(full_name)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_notes")
      .select("*, profiles(full_name)")
      .eq("lead_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("lead_addresses")
      .select("*")
      .eq("lead_id", id)
      .order("is_primary", { ascending: false }),
  ]);

  if (!leadResult.data) {
    notFound();
  }

  const twilioEnabled = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  );

  return (
    <LeadDetailClient
      lead={leadResult.data as Lead}
      activities={(activitiesResult.data ?? []) as LeadActivity[]}
      notes={(notesResult.data ?? []) as LeadNote[]}
      addresses={(addressesResult.data ?? []) as LeadAddress[]}
      twilioEnabled={twilioEnabled}
    />
  );
}
