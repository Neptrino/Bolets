export interface GuideDirectoryItem {
  href: string;
  title: string;
  introduction: string;
  speciesId: string;
  speciesName: string;
  scientificName: string;
  areaSlug: string;
  areaName: string;
  areaType: string;
  placeName: string;
  placeType: string;
  habitats: string[];
  altitudeLabel: string;
}

export interface GuideDirectoryFilters {
  query: string;
  speciesId: string;
  areaSlug: string;
  habitat: string;
}

function searchable(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("ca");
}

export function filterGuideDirectoryItems(
  items: GuideDirectoryItem[],
  filters: GuideDirectoryFilters,
) {
  const query = searchable(filters.query.trim());

  return items.filter((item) => {
    if (filters.speciesId && item.speciesId !== filters.speciesId) return false;
    if (filters.areaSlug && item.areaSlug !== filters.areaSlug) return false;
    if (filters.habitat && !item.habitats.includes(filters.habitat)) return false;
    if (!query) return true;

    return searchable([
      item.title,
      item.speciesName,
      item.scientificName,
      item.areaName,
      item.placeName,
      ...item.habitats,
    ].join(" ")).includes(query);
  });
}
