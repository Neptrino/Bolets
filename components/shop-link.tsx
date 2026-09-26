"use client";

import type { AnchorHTMLAttributes } from "react";
import { shopHref, trackShopClick, type ShopPlacement } from "@/src/lib/shop";

type ShopLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  placement: ShopPlacement;
  /** Shop path such as `/products/<handle>`; the storefront home by default. */
  path?: string;
};

/** Outbound shop link that carries its UTM placement and records the matching Umami click. */
export function ShopLink({ placement, path, onClick, ...props }: ShopLinkProps) {
  return <a
    {...props}
    href={shopHref(placement, path)}
    onClick={(event) => {
      onClick?.(event);
      trackShopClick(placement);
    }}
  />;
}
