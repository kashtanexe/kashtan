import { FlaskConical } from "lucide-react";
import { isDemoMode } from "@/lib/env";
import { cn } from "@/lib/utils";

export function DemoBadge({ className }: { className?: string }) {
  if (!isDemoMode()) return null;
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300", className)}
      title="No keys configured: running on a seeded in-memory store. Emails go to the Outbox, payments are simulated."
    >
      <FlaskConical className="h-3.5 w-3.5" />
      Demo mode
    </span>
  );
}
