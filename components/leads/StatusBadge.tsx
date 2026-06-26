import { STATUS_CONFIG } from "@/lib/utils";
import type { LeadStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: LeadStatus;
  size?: "sm" | "md";
}

export default function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-medium rounded-full border",
        cfg.bgColor,
        cfg.color,
        cfg.borderColor,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dotColor)} />
      {cfg.label}
    </span>
  );
}
