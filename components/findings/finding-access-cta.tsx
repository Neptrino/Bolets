import { ArrowUpRight, Camera } from "lucide-react";
import Link from "next/link";

export function FindingAccessCta({ secondaryHref, secondaryLabel }: {
  secondaryHref: string;
  secondaryLabel: string;
}) {
  return (
    <aside className="findings-publish-cta" aria-labelledby="findings-publish-cta-title">
      <span className="findings-publish-cta-icon"><Camera size={23} aria-hidden="true" /></span>
      <div className="findings-publish-cta-copy">
        <p>Obre més detall</p>
        <h2 id="findings-publish-cta-title">Publica una troballa amb foto i obre el mapa d’1 km durant 7 dies</h2>
        <span>La foto i el dia poden ser públics; el punt exacte i les notes continuen sent privats.</span>
      </div>
      <div className="findings-publish-cta-actions">
        <Link className="finding-button" href="/troballes/nova">Afegir una troballa <ArrowUpRight size={17} aria-hidden="true" /></Link>
        <Link href={secondaryHref}>{secondaryLabel}</Link>
      </div>
    </aside>
  );
}
