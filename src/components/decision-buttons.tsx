"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { CalendarCheck, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptAction, passAction } from "@/app/(app)/app/actions";
import { PASS_REASONS } from "@/types/domain";
import { cn } from "@/lib/utils";

function Submit({ children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {children}
    </Button>
  );
}

export function DecisionButtons({ pitchId, back, className }: { pitchId: string; back?: "inbox"; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("flex w-full flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <form action={acceptAction}>
          <input type="hidden" name="pitchId" value={pitchId} />
          <Submit variant="success" size="sm">
            <CalendarCheck className="h-4 w-4" /> Accept & send calendar link
          </Submit>
        </form>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <X className="h-4 w-4" /> Pass <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
        </Button>
      </div>
      {open ? (
        <form action={passAction} className="flex flex-wrap gap-1.5 rounded-lg bg-slate-50 p-2">
          <input type="hidden" name="pitchId" value={pitchId} />
          {back ? <input type="hidden" name="back" value={back} /> : null}
          <span className="w-full px-1 text-xs text-slate-500">One click: the vendor gets a polite, specific "no".</span>
          {PASS_REASONS.map((r) => (
            <Submit key={r.value} name="reason" value={r.value} variant="outline" size="sm" className="bg-white">
              {r.label}
            </Submit>
          ))}
        </form>
      ) : null}
    </div>
  );
}
