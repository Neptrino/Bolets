import "server-only";

import { createSupabaseAdminClient } from "@/src/lib/supabase/admin";
import { SITE_URL } from "@/src/lib/seo";

type OutboxEvent = "approved" | "rejected" | "revoked" | "expiry_reminder";

type OutboxRow = {
  id: string;
  user_id: string;
  event: OutboxEvent;
  dedupe_key: string;
  payload: Record<string, unknown>;
  attempt_count: number;
};

function htmlEscape(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  })[character]!);
}

const dateFormatter = new Intl.DateTimeFormat("ca-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

function optionalText(payload: Record<string, unknown>, key: string) {
  return typeof payload[key] === "string" && payload[key].trim()
    ? payload[key].trim()
    : null;
}

function messageFor(row: OutboxRow) {
  const reviewNote = optionalText(row.payload, "reviewNote");
  const reason = optionalText(row.payload, "reason");
  const activeUntil = optionalText(row.payload, "activeUntil");
  if (row.event === "approved") {
    return {
      subject: "La teva aportació a Bolets ha estat aprovada",
      heading: "Ja tens obert el mapa detallat",
      body: `Pots consultar els sectors d’1 km i 250 m fins al ${activeUntil ? dateFormatter.format(new Date(activeUntil)) : "final del període indicat al compte"}.`,
      note: reviewNote,
    };
  }
  if (row.event === "rejected") {
    return {
      subject: "Hem revisat la teva aportació a Bolets",
      heading: "Aquesta aportació no ha obert el mapa detallat",
      body: "Pots consultar el motiu i proposar una altra aportació des del compte quan no tinguis cap revisió pendent.",
      note: reviewNote,
    };
  }
  if (row.event === "revoked") {
    return {
      subject: "S’ha revocat l’accés al mapa detallat de Bolets",
      heading: "L’accés al detall ja no és actiu",
      body: "El mapa públic de 2,5 km continua disponible. Si creus que és un error, respon a aquest correu.",
      note: reason,
    };
  }
  return {
    subject: "El detall del mapa de Bolets caduca aviat",
    heading: "Queda aproximadament una setmana d’accés",
    body: `L’accés als sectors d’1 km i 250 m caduca el ${activeUntil ? dateFormatter.format(new Date(activeUntil)) : "dia indicat al compte"}. Una nova aportació aprovada hi afegeix 30 dies.`,
    note: null,
  };
}

function emailHtml(row: OutboxRow) {
  const message = messageFor(row);
  const note = message.note
    ? `<div style="margin:24px 0;padding:16px;border-left:4px solid #c55425;background:#f7f1e7;color:#554d46"><strong>Nota de revisió</strong><br>${htmlEscape(message.note)}</div>`
    : "";
  return {
    subject: message.subject,
    html: `<!doctype html><html lang="ca"><body style="margin:0;background:#f2efe5;color:#273c30;font-family:Georgia,serif"><div style="max-width:600px;margin:0 auto;padding:40px 20px"><div style="padding:30px;border-radius:20px;background:#fffaf0;border:1px solid #d9d0bd"><p style="margin:0 0 10px;color:#c55425;font:700 12px Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase">Bolets Atles · Col·laboració</p><h1 style="margin:0 0 16px;font-size:28px;line-height:1.15">${htmlEscape(message.heading)}</h1><p style="font:16px/1.6 Arial,sans-serif;color:#554d46">${htmlEscape(message.body)}</p>${note}<p style="margin:26px 0 0"><a href="${SITE_URL}/compte/col-laboracio" style="display:inline-block;padding:12px 18px;border-radius:999px;background:#273c30;color:#fff;text-decoration:none;font:700 14px Arial,sans-serif">Veure la col·laboració</a></p></div><p style="font:12px/1.5 Arial,sans-serif;color:#70685e;text-align:center">Aquest correu informa d’un canvi demanat o revisat al teu compte de Bolets.</p></div></body></html>`,
  };
}

export async function enqueueContributorExpiryReminders() {
  const admin = createSupabaseAdminClient();
  const now = Date.now();
  const start = new Date(now + 6 * 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(now + 8 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("contributor_access")
    .select("user_id,active_until")
    .is("revoked_at", null)
    .gte("active_until", start)
    .lte("active_until", end);
  if (error) throw error;
  if (!data?.length) return 0;
  const rows = data.map((access) => ({
    user_id: access.user_id,
    event: "expiry_reminder",
    dedupe_key: `contribution-expiry:${access.user_id}:${access.active_until}`,
    payload: { activeUntil: access.active_until },
  }));
  const result = await admin
    .from("contribution_email_outbox")
    .upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
  if (result.error) throw result.error;
  return rows.length;
}

export async function dispatchContributionEmails() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTRIBUTION_EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Contribution email delivery is not configured");
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("contribution_email_outbox")
    .select("id,user_id,event,dedupe_key,payload,attempt_count")
    .eq("status", "pending")
    .lte("deliver_after", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(25);
  if (error) throw error;

  let sent = 0;
  let failed = 0;
  for (const row of (data ?? []) as OutboxRow[]) {
    const user = await admin.auth.admin.getUserById(row.user_id);
    const email = user.data.user?.email;
    if (!email) {
      await admin.from("contribution_email_outbox").update({
        status: "failed",
        attempt_count: row.attempt_count + 1,
        last_error: "The account has no deliverable email address",
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      failed += 1;
      continue;
    }

    const message = emailHtml(row);
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": row.dedupe_key,
        },
        body: JSON.stringify({ from, to: [email], subject: message.subject, html: message.html }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`Resend returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
      await admin.from("contribution_email_outbox").update({
        status: "sent",
        attempt_count: row.attempt_count + 1,
        last_error: null,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      sent += 1;
    } catch (sendError) {
      const attempts = row.attempt_count + 1;
      await admin.from("contribution_email_outbox").update({
        status: attempts >= 5 ? "failed" : "pending",
        attempt_count: attempts,
        last_error: (sendError instanceof Error ? sendError.message : "Email delivery failed").slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", row.id);
      failed += 1;
    }
  }
  return { attempted: data?.length ?? 0, sent, failed };
}
