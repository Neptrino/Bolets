import { SeasonalGuidePage } from "@/components/seasonal-guide-page";
import { seasonGuideMetadata, seasonGuidesById } from "@/src/lib/season-guides";

const guide = seasonGuidesById.tardor;

export const metadata = seasonGuideMetadata(guide);
export const revalidate = 3600;

export default function AutumnMushroomsPage() {
  return <SeasonalGuidePage guide={guide} />;
}
