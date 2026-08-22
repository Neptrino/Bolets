import Image, { type ImageProps } from "next/image";
import { StaticMediaImage } from "@/components/static-media-image";
import type { MediaAsset } from "@/src/lib/types";

type MediaImageProps = Omit<ImageProps, "loader" | "src"> & {
  asset: MediaAsset;
};

export function MediaImage({ asset, alt, ...props }: MediaImageProps) {
  if (asset.localPath) {
    return <StaticMediaImage {...props} alt={alt} src={asset.localPath} />;
  }

  return (
    <Image
      {...props}
      alt={alt}
      src={asset.imageUrl ?? asset.sourceUrl}
    />
  );
}
