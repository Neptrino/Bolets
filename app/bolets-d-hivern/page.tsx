import { SeasonalGuidePage } from "@/components/seasonal-guide-page";
import { seasonGuideMetadata, seasonGuidesById } from "@/src/lib/season-guides";

const guide = seasonGuidesById.hivern;

export const metadata = seasonGuideMetadata(guide);
export const revalidate = 3600;

export default function WinterMushroomsPage() {
  return <SeasonalGuidePage guide={guide} />;
}
