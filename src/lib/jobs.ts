import { after } from "next/server";
import { logger } from "@/lib/logger";

/**
 * Minimal background-work abstraction. Runs the task after the response is sent
 * (Next.js `after`, supported on Vercel). Swap for Inngest or Supabase pgmq when volume grows.
 */
export function enqueue(name: string, task: () => Promise<unknown>): void {
  const run = async () => {
    try {
      await task();
    } catch (err) {
      logger.error("job failed", { job: name, err: String(err) });
    }
  };
  try {
    after(run);
  } catch {
    // Outside a request scope (tests, scripts): run immediately.
    void run();
  }
}
