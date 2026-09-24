import "@/app/styles/species-model.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PageHeader, PageShell } from "@/components/page-layout";
import { SpeciesModelViewer } from "@/components/species-profile/species-model-viewer";
import { getCatalogueSpeciesBySlug } from "@/data/catalogue";
import { getSpecies3dModel, species3dModelIds } from "@/data/species-3d-models";
import { speciesSlugForId } from "@/data/species-slugs";
import { speciesModelPath, speciesPath } from "@/src/lib/seo";
import { speciesArticle } from "@/src/lib/species-headings";

export function generateStaticParams() {
  return species3dModelIds.map((speciesId) => ({ slug: speciesSlugForId(speciesId) }));
}

function speciesWithModel(slug: string) {
  const species = getCatalogueSpeciesBySlug(slug);
  const model = species ? getSpecies3dModel(species.speciesId) : undefined;
  return species && model ? { species, model } : undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const entry = speciesWithModel(slug);
  if (!entry) notFound();
  const name = entry.species.identity.commonName;
  return {
    title: `${name} en 3D`,
    description: `Model 3D il·lustratiu ${speciesArticle(name).ofSpecies} (${entry.species.identity.scientificName}) per girar-lo i veure’n el barret, l’himeni i el peu.`,
    alternates: { canonical: speciesModelPath(entry.species) },
    // A viewing tool, not a reference page: the species profile is what search should show.
    robots: { index: false, follow: true },
  };
}

export default async function SpeciesModelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const entry = speciesWithModel(slug);
  if (!entry) notFound();
  const { species, model } = entry;
  const name = species.identity.commonName;
  const { ofSpecies } = speciesArticle(name);
  const profileHref = speciesPath(species);

  return (
    <PageShell as="article" className="species-model-page">
      <PageHeader
        eyebrow="Model 3D il·lustratiu"
        title={`${name} en 3D`}
        description={<><i>{species.identity.scientificName}</i>. Gira’l per veure el barret, l’himeni i el peu des de tots els costats.</>}
        actions={<Link href={profileHref} className="text-link species-model-back"><ArrowLeft size={16} aria-hidden="true" /> Fitxa {ofSpecies}</Link>}
      />

      <div className="species-model-layout">
        <SpeciesModelViewer model={model} label={`Model 3D il·lustratiu ${ofSpecies}`} />

        <aside className="species-model-notes">
          <section className="card">
            <p className="label-caps"><Sparkles size={15} aria-hidden="true" /> Trets clau</p>
            <ul>
              {species.morphology.keyFeatures.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
          </section>
          <p className="notice species-model-caveat">
            És un model il·lustratiu generat a partir de la descripció i de fotografies de referència, no un
            exemplar real. Identifica sempre amb el bolet sencer i les fonts de la <Link href={profileHref}>fitxa</Link>.
          </p>
        </aside>
      </div>
    </PageShell>
  );
}
