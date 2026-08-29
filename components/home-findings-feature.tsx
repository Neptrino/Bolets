import Link from "next/link";
import { ArrowUpRight, CalendarClock, MapPinned, NotebookPen, ShieldCheck, WifiOff } from "lucide-react";
import { StaticMediaImage } from "@/components/static-media-image";

export function HomeFindingsFeature() {
  return (
    <section className="home-findings" aria-labelledby="home-findings-title">
      <div className="home-findings-layout page-width">
        <div className="home-findings-copy">
          <p className="eyebrow"><NotebookPen size={15} /> El teu quadern de camp</p>
          <h2 id="home-findings-title">Les teves troballes,<br /><i>ordenades des del bosc.</i></h2>
          <p className="home-findings-lede">Construeix el teu propi arxiu de camp, foto a foto. Anota al moment o fes les fotos al bosc i completa la troballa tranquil·lament des de casa.</p>
          <ul className="home-findings-benefits">
            <li><WifiOff size={20} aria-hidden="true" /><span><strong>Fotografia ara, completa-ho després</strong><small>Afegeix les fotos des de casa; no cal omplir el formulari durant la sortida.</small></span></li>
            <li><CalendarClock size={20} aria-hidden="true" /><span><strong>Menys camps per omplir</strong><small>Si la foto conserva la data i el GPS, el quadern els recupera automàticament.</small></span></li>
            <li><ShieldCheck size={20} aria-hidden="true" /><span><strong>El punt exacte és només teu</strong><small>Quan comparteixes, l’atles públic mostra una àrea de 10 × 10 km.</small></span></li>
          </ul>
          <div className="home-findings-actions">
            <Link href="/troballes/nova" className="button">Anota una troballa <ArrowUpRight size={17} /></Link>
            <Link href="/les-meves-troballes" className="text-link">Obre el teu quadern <NotebookPen size={16} /></Link>
          </div>
        </div>

        <div className="home-findings-preview" aria-label="Exemple d’una fotografia desada al quadern de camp">
          <div className="home-findings-photo">
            <StaticMediaImage
              src="/media/generated/macrolepiota-procera-field-aleix-v1.webp"
              alt="Un apagallums fotografiat al bosc per il·lustrar una troballa desada al quadern"
              fill
              sizes="(max-width: 760px) 88vw, 35vw"
            />
            <span className="home-findings-offline"><WifiOff size={15} /> Desada sense connexió</span>
          </div>
          <div className="home-findings-preview-data">
            <p className="home-findings-preview-kicker"><MapPinned size={18} /> Troballa nova</p>
            <strong>La foto ja ens ha ajudat.</strong>
            <dl>
              <div><dt>Data</dt><dd>Detectada</dd></div>
              <div><dt>GPS</dt><dd>Detectat</dd></div>
            </dl>
            <div className="home-findings-public-area">
              <span aria-hidden="true"><i /><i /><i /><i /></span>
              <p><small>Si la comparteixes</small><b>Només publiquem la casella de 10 × 10 km</b></p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
