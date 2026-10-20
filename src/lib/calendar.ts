/** Build a booking link (Cal.com / Calendly) prefilled with the vendor's details. */
export function buildBookingLink(calendarUrl: string, vendor: { name: string; email: string; company: string }): string {
  if (!calendarUrl) return "";
  try {
    const url = new URL(calendarUrl);
    if (url.hostname.includes("calendly.com")) {
      url.searchParams.set("name", vendor.name);
      url.searchParams.set("email", vendor.email);
      url.searchParams.set("a1", vendor.company);
    } else {
      // Cal.com and most others accept name/email query params
      url.searchParams.set("name", vendor.name);
      url.searchParams.set("email", vendor.email);
      url.searchParams.set("notes", `Intro via GatekeeperAI: ${vendor.company}`);
    }
    return url.toString();
  } catch {
    return calendarUrl;
  }
}
