"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { suppressBacklinkToken } from "@/src/lib/backlinks/admin.server";

const schema = z.object({ token: z.string().min(20).max(2000) });

export async function suppressBacklinkAction(formData: FormData) {
  const parsed = schema.safeParse({ token: formData.get("token") });
  if (!parsed.success || !await suppressBacklinkToken(parsed.data.token)) {
    redirect("/baixa-comunicacions?error=invalid");
  }
  redirect("/baixa-comunicacions?fet=1");
}
