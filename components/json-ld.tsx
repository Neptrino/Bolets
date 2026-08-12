import { jsonLd } from "@/src/lib/seo";

export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLd(data) }}
    />
  );
}
