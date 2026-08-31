import { INSTAGRAM_PROFILE_URL } from "@/src/lib/seo";

export const dynamic = "force-dynamic";

function instagramProfileUrl() {
  const configured = process.env.INSTAGRAM_PROFILE_URL?.trim() || INSTAGRAM_PROFILE_URL;
  try {
    const url = new URL(configured);
    if (url.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(url.hostname)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function GET() {
  const profileUrl = instagramProfileUrl();
  if (!profileUrl) {
    return new Response("Instagram profile is not configured", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
  return Response.redirect(profileUrl, 307);
}
