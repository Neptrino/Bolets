import type { ReactNode } from "react";
import { MapViewportProvider } from "@/components/region-map/viewport-memory";

export default function MapLayout({ children }: { children: ReactNode }) {
  return <MapViewportProvider>{children}</MapViewportProvider>;
}
