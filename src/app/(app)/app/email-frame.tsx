import { appUrl } from "@/lib/env";

/** Renders an email's HTML in a sandboxed iframe; links open in a new tab. */
export function EmailFrame({ html, height = 640 }: { html: string; height?: number }) {
  const withBase = html.replace(/<head>/i, `<head><base href="${appUrl()}/" target="_blank">`);
  return <iframe title="Email preview" srcDoc={withBase} sandbox="allow-popups allow-popups-to-escape-sandbox" className="w-full rounded-lg border border-slate-200 bg-white" style={{ height }} />;
}
