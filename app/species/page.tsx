import { SpeciesDirectory } from "@/components/species-directory";
import { speciesProfiles } from "@/data/species";

export const metadata = { title: "Espècies · Bolets Atles" };

export default function SpeciesIndexPage() {
  return <section className="page-width species-index"><div className="page-intro"><p className="eyebrow">Fitxer viu</p><h1>Espècies, hàbitats<br />i senyals de bosc.</h1><p>{speciesProfiles.length} fitxes per entendre la relació entre el bolet, el sòl, la pluja i el paisatge català.</p></div><SpeciesDirectory species={speciesProfiles} /></section>;
}
