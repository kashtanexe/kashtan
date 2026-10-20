import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-semibold tracking-tight text-slate-900", className)}>
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600 text-white shadow-sm">
        <ShieldCheck className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm tracking-widest">FILTR</span>
    </Link>
  );
}
