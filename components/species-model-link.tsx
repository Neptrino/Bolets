import "@/app/styles/species-model-link.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";

/** Card link to an illustrative 3D model page, shown with the model's still render. */
export function SpeciesModelLink({
  href,
  thumb,
  title,
  description,
}: {
  href: string;
  thumb: string;
  title: ReactNode;
  description: ReactNode;
}) {
  return (
    <Link href={href} className="species-model-link">
      {/* eslint-disable-next-line @next/next/no-img-element -- still render served as-is beside its GLB */}
      <img src={thumb} alt="" loading="lazy" decoding="async" />
      <span>
        <b>{title} <ArrowUpRight size={16} aria-hidden="true" /></b>
        <small>{description}</small>
      </span>
    </Link>
  );
}
