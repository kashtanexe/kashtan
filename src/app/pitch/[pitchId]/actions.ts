"use server";

import { redirect } from "next/navigation";
import type { PitchFormState } from "@/components/pitch-form/pitch-form";
import { signToken } from "@/lib/tokens";
import { createFastTrackCheckout, completeDemoCheckout } from "@/server/payments/create-checkout";
import { canAccessPitch } from "@/server/pitches/access";
import { BriefSchema, submitBrief } from "@/server/pitches/submit-brief";

export async function submitBriefAction(pitchId: string, token: string, _prev: PitchFormState, formData: FormData): Promise<PitchFormState> {
  if (!canAccessPitch(pitchId, token)) return { message: "This link is invalid or has expired." };
  const raw = {
    contactName: String(formData.get("contactName") ?? ""),
    companyName: String(formData.get("companyName") ?? ""),
    oneLiner: String(formData.get("oneLiner") ?? ""),
    acvBand: String(formData.get("acvBand") ?? ""),
    timeline: String(formData.get("timeline") ?? ""),
    compliance: formData.getAll("compliance").map(String),
    proofUrl: String(formData.get("proofUrl") ?? ""),
    proofText: String(formData.get("proofText") ?? ""),
    choice: String(formData.get("choice") ?? "free"),
  };
  const parsed = BriefSchema.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = String(issue.path[0] ?? "form");
      errors[k] ??= issue.message;
    }
    return { errors, message: "Please fix the highlighted fields.", values: raw };
  }
  const result = await submitBrief(pitchId, parsed.data);
  if (!result.ok) return { message: result.error, values: raw };
  const t = token || signToken({ p: "pitch", s: pitchId });
  if (result.next === "checkout") {
    const { url } = await createFastTrackCheckout(pitchId);
    redirect(url.startsWith("/") ? `${url}&t=${encodeURIComponent(t)}` : url);
  }
  redirect(`/pitch/${pitchId}/submitted?t=${encodeURIComponent(t)}`);
}

export async function completeDemoPaymentAction(pitchId: string, sessionId: string, token: string) {
  if (!canAccessPitch(pitchId, token)) redirect("/");
  await completeDemoCheckout(sessionId);
  redirect(`/pitch/${pitchId}/submitted?paid=1&t=${encodeURIComponent(token)}`);
}
