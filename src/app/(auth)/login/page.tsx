import Link from "next/link";
import { ArrowRight, MailCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { DemoBadge } from "@/components/demo-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { isDemoMode } from "@/lib/env";
import { requestMagicLink } from "./actions";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const sp = await searchParams;
  const demo = isDemoMode();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-brand-50 to-white px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <Logo />
          <DemoBadge />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-card">
          {demo ? (
            <>
              <h1 className="text-xl font-semibold">Demo mode</h1>
              <p className="mt-2 text-sm text-slate-600">
                No Supabase keys are configured, so login is bypassed. You'll enter as <strong>Claire Dubois</strong>, CISO at Northwind Pay (a fictional ~2,100-person
                EU fintech).
              </p>
              <Link href="/app" className={buttonVariants({ className: "mt-6 w-full" })}>
                Enter the demo <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          ) : sp.sent ? (
            <div className="text-center">
              <MailCheck className="mx-auto h-10 w-10 text-brand-600" />
              <h1 className="mt-4 text-xl font-semibold">Check your inbox</h1>
              <p className="mt-2 text-sm text-slate-600">We sent a sign-in link to {sp.sent}.</p>
            </div>
          ) : (
            <form action={requestMagicLink} className="space-y-4">
              <div>
                <h1 className="text-xl font-semibold">Sign in</h1>
                <p className="mt-1 text-sm text-slate-600">We'll email you a magic link. No password.</p>
              </div>
              <div>
                <Label htmlFor="email">Work email</Label>
                <Input id="email" name="email" type="email" required placeholder="you@company.com" autoComplete="email" />
              </div>
              {sp.error ? <p className="text-sm text-rose-600">{sp.error === "email" ? "Please enter a valid email." : sp.error}</p> : null}
              <Button type="submit" className="w-full">
                Send magic link
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
