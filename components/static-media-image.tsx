"use client";

import Image, { getImageProps, type ImageProps } from "next/image";
import { preload } from "react-dom";
import { staticAvifMediaLoader, staticMediaLoader } from "@/src/lib/static-media";

type StaticMediaImageProps = Omit<ImageProps, "loader">;

export function StaticMediaImage({ alt, ...props }: StaticMediaImageProps) {
  if (props.unoptimized) return <Image {...props} alt={alt} loader={staticMediaLoader} />;
  const { props: avif } = getImageProps({ ...props, alt, loader: staticAvifMediaLoader });
  const shouldPreload = props.preload || props.priority;
  if (shouldPreload) {
    // Hint only the preferred format. Preloading both formats would download
    // the WebP fallback even when the browser selects the AVIF picture source.
    preload(avif.src, {
      as: "image", type: "image/avif", imageSrcSet: avif.srcSet,
      imageSizes: avif.sizes, fetchPriority: props.fetchPriority,
      crossOrigin: props.crossOrigin, referrerPolicy: props.referrerPolicy,
    });
  }
  return <picture style={{ display: "contents" }}>
    <source type="image/avif" srcSet={avif.srcSet ?? avif.src} sizes={avif.sizes} />
    <Image {...props} alt={alt} loader={staticMediaLoader} preload={false} priority={false} loading={shouldPreload ? "eager" : props.loading} />
  </picture>;
}
