import { getImageProps } from "next/image";

import { staticMediaLoader } from "@/src/lib/static-media";

const WIDE_FOREST = "/media/generated/mushroom-game-forest-wide.webp";
const MOBILE_FOREST = "/media/generated/mushroom-game-forest-mobile.webp";

export function MushroomGameForestArt() {
  const common = {
    alt: "",
    fill: true,
    loader: staticMediaLoader,
    priority: true,
    quality: 86,
  } as const;
  const { props: wide } = getImageProps({ ...common, src: WIDE_FOREST, sizes: "100vw" });
  const { props: mobile } = getImageProps({ ...common, src: MOBILE_FOREST, sizes: "100vw" });

  return (
    <div className="mushroom-game-forest-art" aria-hidden="true">
      <picture>
        <source media="(max-width: 680px)" srcSet={mobile.srcSet} sizes={mobile.sizes} />
        {/* getImageProps supplies the responsive, build-time static-media URLs. */}
        <img {...wide} alt="" />
      </picture>
    </div>
  );
}
