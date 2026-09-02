import { contributionRequestInputSchema } from "@/src/lib/contributions";
import {
  createContributionRequest,
  listUserContributionRequests,
  readContributorAccess,
} from "@/src/lib/contributions/server";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

const PRIVATE_HEADERS = { "Cache-Control": "private, no-store" };

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401, headers: PRIVATE_HEADERS });
  try {
    const [access, requests] = await Promise.all([
      readContributorAccess(user),
      listUserContributionRequests(user.id),
    ]);
    return Response.json({ access, requests }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    console.error("Unable to read contribution requests", error);
    return Response.json({ error: "No s’han pogut carregar les aportacions." }, { status: 503, headers: PRIVATE_HEADERS });
  }
}

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401, headers: PRIVATE_HEADERS });
  const parsed = contributionRequestInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Revisa el tipus, la descripció, l’enllaç i les fotografies de l’aportació." }, { status: 400, headers: PRIVATE_HEADERS });
  }
  try {
    const contribution = await createContributionRequest(user.id, parsed.data);
    return Response.json({ contribution }, { status: 201, headers: PRIVATE_HEADERS });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No s’ha pogut enviar l’aportació.";
    const conflict = message.startsWith("Ja tens") || message.startsWith("Has arribat");
    const invalid = message.startsWith("La troballa") || message.startsWith("Només les troballes")
      || message.startsWith("La fotografia") || message.startsWith("No s’ha trobat una fotografia");
    const expected = conflict || invalid;
    if (!expected) console.error("Unable to create contribution request", error);
    return Response.json({ error: expected ? message : "No s’ha pogut enviar l’aportació." }, { status: conflict ? 409 : invalid ? 400 : 503, headers: PRIVATE_HEADERS });
  }
}
