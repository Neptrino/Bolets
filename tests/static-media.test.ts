import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";
import {
  STATIC_MEDIA_VERSION,
  STATIC_MEDIA_WIDTHS,
  staticMediaLoader,
  staticMediaVariantPath,
} from "@/src/lib/static-media";

describe("static media variants", () => {
  it("generates every responsive width that Next can request", () => {
    const images = typeof nextConfig === "object" ? nextConfig.images : undefined;
    const configuredWidths = [
      ...(images?.imageSizes ?? []),
      ...(images?.deviceSizes ?? []),
    ].sort((left, right) => left - right);

    expect([...STATIC_MEDIA_WIDTHS]).toEqual(configuredWidths);
  });

  it("maps a catalogue source and width to its versioned build-time variant", () => {
    expect(staticMediaVariantPath("/media/wikimedia/boletus-edulis.webp", 640)).toBe(
      `/media/optimized/${STATIC_MEDIA_VERSION}/wikimedia/boletus-edulis.w640.webp`,
    );
  });

  it("uses the requested responsive width in loader URLs", () => {
    expect(staticMediaLoader({ src: "/media/wikimedia/gallery/example.webp", width: 192 })).toContain(
      ".w192.webp",
    );
  });

  it("maps editorial infographics to the same versioned media tree", () => {
    expect(staticMediaVariantPath("/media/editorial/bolets-catalunya-infografia.webp", 1280)).toBe(
      `/media/optimized/${STATIC_MEDIA_VERSION}/editorial/bolets-catalunya-infografia.w1280.webp`,
    );
  });

  it("rejects remote and non-WebP sources", () => {
    expect(() => staticMediaVariantPath("https://example.com/image.webp", 640)).toThrow();
    expect(() => staticMediaVariantPath("/media/example.jpg", 640)).toThrow();
  });
});
