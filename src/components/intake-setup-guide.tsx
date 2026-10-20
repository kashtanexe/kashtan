import { CopyButton } from "@/components/copy-button";

export function IntakeSetupGuide({ forwardAddress, alias, pitchLink }: { forwardAddress: string; alias: string; pitchLink: string }) {
  const guides = [
    {
      title: "1. Your Pitch Me link (the main channel)",
      body: "Add it to your email signature, LinkedIn “Contact info” and your out-of-office. Vendors come to you, pre-filtered.",
      value: pitchLink,
      snippet: `Vendors: please pitch me here → ${pitchLink}`,
    },
    {
      title: "2. Forward cold emails that slip through",
      body: "Outlook: Forward → paste the address (save it as a contact “Vendor Desk”). Gmail: Forward, or “Forward as attachment” for best accuracy. iPhone: Forward. We reply to the original sender, never as you.",
      value: forwardAddress,
      snippet: forwardAddress,
    },
    {
      title: "3. Public alias (optional)",
      body: "Give this to your EA or put it on your website. Mail sent here gets the same treatment.",
      value: alias,
      snippet: alias,
    },
  ];
  return (
    <div className="space-y-4">
      {guides.map((g) => (
        <div key={g.title} className="rounded-xl border border-slate-200 p-4">
          <div className="font-medium">{g.title}</div>
          <p className="mt-1 text-sm text-slate-600">{g.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <code className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-800">{g.value}</code>
            <CopyButton value={g.snippet} />
          </div>
        </div>
      ))}
      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
        <strong>About auto-forward rules:</strong> Microsoft 365 and many Google Workspace tenants block automatic forwarding to external addresses by default.
        Manual forwards always work. If your admin allows rules, forward only messages from outside your company, and we'll alert you if forwards stop arriving.
      </div>
    </div>
  );
}
