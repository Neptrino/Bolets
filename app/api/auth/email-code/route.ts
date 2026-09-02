import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { consumeRateLimit, requestIp } from "@/src/lib/abuse-rate-limit.server";
import { serverSupabaseConfig } from "@/src/lib/supabase/config";

const requestSchema = z.object({ email: z.email().max(254) });

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "El correu no és vàlid." }, { status: 400 });
  const email = parsed.data.email.trim().toLowerCase();
  const [networkAllowed, emailAllowed] = await Promise.all([
    consumeRateLimit(`ip:${requestIp(request)}`, "auth_email_ip", 900, 5),
    consumeRateLimit(`email:${email}`, "auth_email_address", 900, 3),
  ]).catch(() => [false, false]);
  if (!networkAllowed || !emailAllowed) {
    return Response.json({ error: "Hi ha massa intents seguits. Torna-ho a provar d’aquí a uns minuts." }, { status: 429 });
  }

  const { url, key } = serverSupabaseConfig();
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
  if (error) return Response.json({ error: "No hem pogut enviar el codi. Torna-ho a provar d’aquí a uns minuts." }, { status: 503 });
  return Response.json({ ok: true });
}
