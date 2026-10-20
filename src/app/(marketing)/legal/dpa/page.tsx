export const metadata = { title: "Data Processing Agreement" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Data Processing Agreement</h1>
      <p className="mt-6 leading-relaxed text-slate-700">Our standard DPA covers: subject matter and duration of processing; categories of data (business contact details, email content forwarded by the controller, vendor brief answers); sub-processors (Supabase (EU), Postmark, Stripe, Anthropic); security measures (encryption in transit and at rest, row-level security, least-privilege access); retention (raw bodies 90 days); and assistance with data-subject requests. Contact dpa@filtr.ai for a signed copy. Placeholder for the MVP.</p>
    </div>
  );
}
