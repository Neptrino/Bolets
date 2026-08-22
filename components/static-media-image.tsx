"use client";

import Image, { type ImageProps } from "next/image";
import { staticMediaLoader } from "@/src/lib/static-media";

type StaticMediaImageProps = Omit<ImageProps, "loader">;

export function StaticMediaImage({ alt, ...props }: StaticMediaImageProps) {
  return <Image {...props} alt={alt} loader={staticMediaLoader} />;
}
