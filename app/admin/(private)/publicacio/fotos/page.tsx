import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, PageShell, PageTitleAccent } from "@/components/page-layout";
import { requireOperationalSession } from "@/src/lib/operational-status-session";
import { PhotoStudioFrame } from "./photo-studio-frame";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Estudi de fotos · Administració",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminPhotoStudioPage() {
  await requireOperationalSession();
  return (
    <PageShell as="article" className="admin-page">
      <PageHeader
        eyebrow="Administració · publicació"
        title={<>Estudi de <PageTitleAccent>fotos</PageTitleAccent></>}
        description="Prepara les teves fotos per a Instagram. Les imatges es processen al navegador: no es pugen al servidor ni es publiquen automàticament."
        actions={<Link href="/admin/publicacio">Torna a publicació</Link>}
        tone="forest"
      />
      <PhotoStudioFrame />
    </PageShell>
  );
}
