import { areCanonicalForestPreferences } from "@/src/lib/my-forest/preferences";
import {
  readForestPreferences,
  saveForestPreferences,
} from "@/src/lib/my-forest/preferences.server";
import { forestPreferencesSchema } from "@/src/lib/my-forest/schema";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió." }, { status: 401 });
  try {
    return Response.json(await readForestPreferences(user.id), {
      headers: privateHeaders,
    });
  } catch {
    return Response.json(
      { error: "No s’han pogut carregar les preferències." },
      { status: 503, headers: privateHeaders },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Inicia sessió." }, { status: 401 });
  const parsed = forestPreferencesSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success || !areCanonicalForestPreferences(parsed.data)) {
    return Response.json(
      { error: "La selecció conté una espècie o un territori no disponible." },
      { status: 400, headers: privateHeaders },
    );
  }
  try {
    return Response.json(await saveForestPreferences(user.id, parsed.data), {
      headers: privateHeaders,
    });
  } catch {
    return Response.json(
      { error: "No s’han pogut desar les preferències." },
      { status: 503, headers: privateHeaders },
    );
  }
}
