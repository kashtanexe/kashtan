import { appUrl } from "@/lib/env";
import { signToken } from "@/lib/tokens";
import { PASS_REASONS } from "@/types/domain";

export function briefUrl(pitchId: string): string {
  return `${appUrl()}/pitch/${pitchId}?t=${encodeURIComponent(signToken({ p: "pitch", s: pitchId }, 60 * 60 * 24 * 21))}`;
}

export function statusUrl(pitchId: string): string {
  return `${appUrl()}/pitch/${pitchId}/status?t=${encodeURIComponent(signToken({ p: "pitch", s: pitchId }, 60 * 60 * 24 * 60))}`;
}

export function cardUrl(pitchId: string): string {
  return `${appUrl()}/app/pitches/${pitchId}`;
}

export function acceptActionUrl(pitchId: string): string {
  return `${appUrl()}/a/${signToken({ p: "accept", s: pitchId })}`;
}

export function passActionUrls(pitchId: string): { label: string; url: string }[] {
  return PASS_REASONS.slice(0, 3).map((r) => ({ label: r.label, url: `${appUrl()}/a/${signToken({ p: "pass", s: pitchId, x: r.value })}` }));
}
