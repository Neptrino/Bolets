import {
  dispatchContributionEmails,
  enqueueContributorExpiryReminders,
} from "@/src/lib/contributions/email.server";
import { isOperationalRequestAuthorized } from "@/src/lib/operational-status-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isOperationalRequestAuthorized(request.headers)) {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const remindersConsidered = await enqueueContributorExpiryReminders();
    const delivery = await dispatchContributionEmails();
    return Response.json(
      { remindersConsidered, ...delivery },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Contribution email dispatch failed", error);
    return Response.json(
      { error: "contribution_email_dispatch_failed" },
      { status: 503, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
