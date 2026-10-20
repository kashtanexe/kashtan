import { Logo } from "@/components/logo";
import { DemoBadge } from "@/components/demo-badge";

export function VendorShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5">
        <Logo />
        <DemoBadge />
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-20">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-10 text-center text-xs text-slate-400">
        Powered by GatekeeperAI · Any Fast-Track fee goes to GatekeeperAI, never to the executive · <a href="/for-vendors" className="underline">How this works</a>
      </footer>
    </div>
  );
}
