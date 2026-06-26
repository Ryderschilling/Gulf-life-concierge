import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import type { LeadStatus, KanbanColumn } from "./types";

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Date formatting
export function timeAgo(date: string | null): string {
  if (!date) return "Never";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatDate(date: string | null): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: string | null): string {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

// Lead status config
export const STATUS_CONFIG: Record<
  LeadStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    dotColor: string;
  }
> = {
  new: {
    label: "New",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    dotColor: "bg-blue-500",
  },
  contacted: {
    label: "Contacted",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    dotColor: "bg-violet-500",
  },
  nurturing: {
    label: "Nurturing",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    dotColor: "bg-amber-500",
  },
  proposal: {
    label: "Proposal",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    dotColor: "bg-orange-500",
  },
  closed_won: {
    label: "Won",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    dotColor: "bg-emerald-500",
  },
  closed_lost: {
    label: "Lost",
    color: "text-stone-500",
    bgColor: "bg-stone-100",
    borderColor: "border-stone-200",
    dotColor: "bg-stone-400",
  },
};

export const ORDERED_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "nurturing",
  "proposal",
  "closed_won",
  "closed_lost",
];

export const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Referral",
  cold_call: "Cold Call",
  social: "Social Media",
  email: "Email",
  other: "Other",
};

// Get initials from a name
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Format phone number
export function formatPhone(phone: string | null): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

// Build kanban columns from flat leads array
export function buildKanbanColumns(leads: import("./types").Lead[]): KanbanColumn[] {
  const pipeline: LeadStatus[] = [
    "new",
    "contacted",
    "nurturing",
    "proposal",
    "closed_won",
    "closed_lost",
  ];

  return pipeline.map((status) => ({
    status,
    label: STATUS_CONFIG[status].label,
    color: STATUS_CONFIG[status].color,
    bgColor: STATUS_CONFIG[status].bgColor,
    borderColor: STATUS_CONFIG[status].borderColor,
    leads: leads.filter((l) => l.status === status),
  }));
}
