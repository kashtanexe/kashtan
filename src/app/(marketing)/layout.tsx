import Link from "next/link";
import { Logo } from "@/components/logo";
import { DemoBadge } from "@/components/demo-badge";
import { buttonVariants } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <DemoBadge className="hidden sm:inline-flex" />
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/for-vendors" className="hidden rounded-lg px-3 py-2 text-slate-600 hover:text-slate-900 sm:block">
              For vendors
            </Link>
            <Link href="/pricing" className="hidden rounded-lg px-3 py-2 text-slate-600 hover:text-slate-900 sm:block">
              Pricing
            </Link>
            <Link href="/login" className="rounded-lg px-3 py-2 text-slate-600 hover:text-slate-900">
              Log in
            </Link>
            <Link href="/app" className={buttonVariants({ size: "sm" })}>
              Open the demo
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <Logo />
            <span>© {new Date().getFullYear()} FILTR. Made in the EU.</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/for-vendors">For vendors</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/legal/privacy">Privacy</Link>
            <Link href="/legal/terms">Terms</Link>
            <Link href="/legal/dpa">DPA</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
