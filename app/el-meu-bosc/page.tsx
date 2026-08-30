import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PreferenceManager } from "@/components/my-forest/preference-manager";
import { JournalSummary, TodayForYou } from "@/components/my-forest/dashboard";
import {
  PageHeader,
  PageShell,
  PageTitleAccent,
  SectionHeader,
} from "@/components/page-layout";
import { loadCachedAreaOverview } from "@/src/lib/current-overview";
import {
  buildSavedForestReadings,
  savedForestCombinationsWithoutReadings,
  simulateSavedForestReadings,
} from "@/src/lib/my-forest/dashboard";
import { readOwnerJournalSummary } from "@/src/lib/my-forest/journal.server";
import { forestPreferenceOptions } from "@/src/lib/my-forest/preferences";
import { readForestPreferences } from "@/src/lib/my-forest/preferences.server";
import { monthInTimeZone } from "@/src/lib/seasonality";
import { getAuthenticatedUser } from "@/src/lib/supabase/server";

export const metadata: Metadata = {
  title: "El meu bosc",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function MyForestPage({
  searchParams,
}: {
  searchParams: Promise<{ simula?: string | string[] }>;
}) {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/acces?retorn=/el-meu-bosc");
  const query = await searchParams;
  const simulation = process.env.NODE_ENV === "development" && query.simula === "lectures";

  const [preferences, journal] = await Promise.all([
    readForestPreferences(user.id),
    readOwnerJournalSummary(user.id),
  ]);
  let overviewUnavailable = false;
  const overviewItems = preferences.speciesIds.length && preferences.territorySlugs.length
    ? await loadCachedAreaOverview().catch(() => {
        overviewUnavailable = true;
        return [];
      })
    : [];
  const currentReadings = buildSavedForestReadings(
    preferences,
    overviewItems,
    monthInTimeZone(),
    overviewUnavailable,
  );
  const readings = simulation
    ? simulateSavedForestReadings(currentReadings)
    : currentReadings;
  const unavailableCombinations = savedForestCombinationsWithoutReadings(
    preferences,
    readings,
  );
  const options = forestPreferenceOptions();

  return (
    <PageShell className="forest-page">
      <PageHeader
        eyebrow="Compte personal"
        title={<>El meu <PageTitleAccent>bosc</PageTitleAccent></>}
        description="Les teves espècies, els teus territoris i el resum privat de la temporada en un sol lloc. Les preferències no alteren la predicció pública."
        actions={<Link className="finding-button-secondary" href="/compte">Compte i privadesa</Link>}
      />
      <TodayForYou
        preferences={preferences}
        readings={readings}
        unavailableCombinations={unavailableCombinations}
        simulation={simulation}
      />
      <JournalSummary summary={journal} />
      <section className="forest-section" aria-labelledby="forest-preferences-title">
        <SectionHeader
          meta="Preferències"
          title="Fes-te teu el bosc"
          titleId="forest-preferences-title"
          description="Desa espècies del catàleg i territoris que ja existeixen a Bolets. Pots canviar la selecció sempre que vulguis."
        />
        <PreferenceManager
          initial={preferences}
          speciesOptions={options.species}
          territoryOptions={options.territories}
        />
      </section>
    </PageShell>
  );
}
