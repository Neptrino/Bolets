import { MapPinned } from "lucide-react";

export function TerritoryPortrait({
  atlasLabel,
  name,
  regionLabel,
  count,
  countLabel,
}: {
  atlasLabel: string;
  name: string;
  regionLabel: string;
  count: number;
  countLabel: string;
}) {
  return (
    <div className="location-hub-portrait territory-portrait" role="img" aria-label={`${name}, ${regionLabel}`}>
      <svg className="territory-portrait-contours" viewBox="0 0 640 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M-28 616C85 533 118 646 224 578s143-9 232-87 143-45 226-94" />
        <path d="M-54 548c121-77 180 19 274-49s172-11 244-78 146-50 221-123" />
        <path d="M-72 474c124-60 195 25 288-42s175-24 247-93 137-56 226-150" />
        <path d="M-93 397c149-59 218 42 316-32s171-27 247-102 135-61 229-167" />
        <path d="M-108 320c163-45 234 55 334-22s166-28 244-104S600 129 708 21" />
      </svg>
      <div className="territory-portrait-grid" aria-hidden="true" />
      <div className="territory-portrait-place">
        <MapPinned size={22} aria-hidden="true" />
        <span>{regionLabel}</span>
        <strong>{name}</strong>
      </div>
      <div className="location-hub-portrait-label">
        <span>{atlasLabel} · {name.toLocaleUpperCase("ca")}</span>
        <strong>{count.toString().padStart(2, "0")}</strong>
        <small>{countLabel}</small>
      </div>
    </div>
  );
}
