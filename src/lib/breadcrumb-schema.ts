import { absoluteUrl } from "@/src/lib/seo";

export type Breadcrumb = { name: string; url: string };

/* Every trail starts at the home page, so pages pass only their own steps
   (absolute URLs) and the positions are numbered here. */
export function breadcrumbSchema(crumbs: readonly Breadcrumb[], id?: string) {
  return {
    "@type": "BreadcrumbList",
    ...(id ? { "@id": id } : {}),
    itemListElement: [{ name: "Inici", url: absoluteUrl() }, ...crumbs].map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
