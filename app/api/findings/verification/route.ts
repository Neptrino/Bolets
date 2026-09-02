import { getAuthenticatedUser } from "@/src/lib/supabase/server";
import { findingTurnstileRequired } from "@/src/lib/turnstile.server";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ required: false }, { headers: { "Cache-Control": "private, no-store" } });
  try {
    return Response.json(
      { required: await findingTurnstileRequired(user.id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return Response.json({ error: "No s’ha pogut comprovar la verificació." }, { status: 503 });
  }
}
