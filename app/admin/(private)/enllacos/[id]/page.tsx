import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { backlinkDetailId, safeBacklinkReturnPath } from "@/src/lib/backlinks/admin-table";
import { requireOperationalSession } from "@/src/lib/operational-status-session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Detall de l’enllaç editorial · Administració",
  robots: { index: false, follow: false, nocache: true },
};

export default async function LegacyBacklinkDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  await requireOperationalSession();
  const { id } = await params;
  if (!backlinkDetailId({ detail: id })) notFound();

  const collectionPath = safeBacklinkReturnPath((await searchParams).returnTo);
  const collectionUrl = new URL(collectionPath, "https://bolets.app");
  collectionUrl.searchParams.set("detail", id);
  redirect(`${collectionUrl.pathname}${collectionUrl.search}`);
}
