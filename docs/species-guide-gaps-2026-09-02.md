# Species-guide competitor gaps — 2 September 2026

The best next expansion is **12 descriptive species profiles**, focused on missing lookalikes and familiar Catalan names. The current working catalogue contains **56 profiles: 52 in `data/species.ts` and four reference-only profiles**. A competitor advertising 69 species does not mean we need 13 additions: the overlap is much smaller, and several names require reconciliation.

The accompanying [comparison matrix](species-competitor-matrix-2026-09-02.csv) contains 144 evidence rows: every record in Boletaires.cat's 69-entry public dataset, the 67 profiles linked from bolets.info's homepage, and eight selected additional subjects from bolets.com. Priorities are editorial judgments based on existing guide connections, coverage and naming value; they are **not measured keyword demand or traffic forecasts**.

## Baseline and method

- Counted actual species objects in both local catalogues and checked the explicit slug inventory. Existing uncommitted additions—Lycoperdon perlatum, Calvatia gigantea and Russula cyanoxantha—are included, so they are not recommended again. Hygrophoropsis aurantiaca is also already covered.
- Used the current working tree, not an assumption about deployment. The direct production sitemap request was refused in this environment; production parity was not verified.
- Retrieved Boletaires.cat's public `species-data.min.js` referenced by its catalogue HTML and parsed its object literals without executing the JavaScript. Its page initially displays a loading placeholder. The matrix links to the actual dataset; individual species-page rendering was not exhaustively verified.
- Followed all 67 bolets.info homepage profile links and read their scientific-name fields. Its headline advertises 69, but this run found 67 linked profiles. Mycena pura initially timed out and was successfully retrieved on retry.
- Read bolets.com's catalogue and selected species/comparison articles. This is supplemental coverage, not a complete inventory of that domain. Its linked greixa article returned 404; Sparassis crispa is supported as a coverage gap by Boletaires.cat instead.
- Matched scientific identities and explicit name overlaps. A species mentioned in `similarSpecies` is **mentioned-only**, not a dedicated profile. Missing means absent from the catalogue; the distinction between missing and mentioned-only comes from exact scientific-name checks in `data`, `src/lib` and `app`, not an exhaustive semantic search of every public page.
- Did not infer occurrence in Catalonia, current conservation status, edibility or numerical ecology merely because a competitor has an entry. Micopedia could not be opened and was excluded.

## Coverage comparison

| Source | Records inspected | Covered by our profiles | Named entries without our own profile | Unresolved entries |
|---|---:|---:|---:|---:|
| [Boletaires.cat](https://boletaires.cat/cataleg), [public dataset](https://boletaires.cat/js/species-data.min.js) | 69 | 36 | 33: five mentioned-only, 28 missing | 0 |
| [bolets.info](https://bolets.info/) | 67 | 32 | 33: six mentioned-only, 27 missing | 2 |
| [bolets.com](https://www.bolets.com/bolets), selected additional subjects | 8 | 0 | 8: one mentioned-only, seven missing | 0 |

These are **source-entry comparisons**, not additive counts of distinct accepted species. The two principal guides overlap substantially. Their legacy names, species complexes and questionable synonym lists need case-by-case treatment. The eight supplemental subjects include four entries in one rovelló article, one of which is only an incidental mention.

## First batch: 12 profiles

“New” below means no scientific-name mention found in the scanned product files. “Mention” means the species is already a lookalike but lacks its own profile. Ordering within this batch can follow availability of reliable sources and licensed diagnostic photographs.

| Species / intended Catalan label | Current coverage | Why prioritize it | Competitor evidence |
|---|---|---|---|
| **Lactarius chrysorrheus — Pinetell bord / lleterola de llet groga** | New | Complete the comparison around our pinetell and rovelló pages; distinguish the overlapping common names. | [bolets.info](https://bolets.info/fitxa-bolet/pinetell-bord-lleterola-de-llet-grogalactarius-chrysorrheuslactario-de-leche-dorada/), Boletaires dataset |
| **Lactarius torminosus — Rovelló de cabra** | Mention | Give the existing pinetell lookalike a full destination; do not merge it with L. chrysorrheus. | [bolets.info](https://bolets.info/fitxa-bolet/rovello-de-cabralactarius-torminosus/) |
| **Agaricus xanthodermus — Xampinyó pudent** | Mention | Complete the camperol comparison and its existing culinary caution. | [Boletaires.cat](https://boletaires.cat/especies/agaricus-xanthodermus) |
| **Ramaria formosa — Peu de rata bord** | Mention | Complete the existing comparison from peu de rata daurat. | [bolets.info](https://bolets.info/fitxa-bolet/peu-de-rata-bordramaria-formosaramaria-elegante/) |
| **Hypholoma fasciculare — Bolet de pi bord** | Mention | Complete the pollancró lookalike and improve wood-growing species coverage. | [bolets.info](https://bolets.info/fitxa-bolet/bolet-de-pihypholoma-fascicularehifoloma-de-laminas-verdes/), Boletaires dataset |
| **Tricholoma equestre group — Verderol / groguet** | New | A dedicated safety and terminology page would address conflicting historical consumption labels. Treat the competitor's T. auratum under the same editorial brief until its taxonomic scope is resolved. | Boletaires dataset; [bolets.info's T. auratum entry](https://bolets.info/fitxa-bolet/verderol-canari-groguettricholoma-auratumseta-de-los-caballeros/) |
| **Clitocybe nebularis — Bromosa / moixeró de tardor** | New | Separate this subject from our spring moixeró, Calocybe gambosa, and provide a properly sourced safety discussion. | [bolets.info](https://bolets.info/fitxa-bolet/bromosaclitocybe-nebularispardilla/), Boletaires dataset |
| **Amanita rubescens — Cua de cavall** | Mention | Complete the comparison already present on pixacà; avoid presenting it as an easy introductory edible species. | [bolets.info](https://bolets.info/fitxa-bolet/cua-de-cavallamanita-rubescensamanita-rojiza/), Boletaires dataset |
| **Lactifluus rugatus — Lleterola roja / vermella** | New | A clear Catalan coverage gap with dedicated articles on two competitors. Keep it distinct from L. volemus. | [bolets.com](https://www.bolets.com/lleterola-vermella.html), [bolets.info](https://bolets.info/fitxa-bolet/lleterola-rojalactarius-rugatus/) |
| **Leccinellum lepidum — Cigró / alzinenc** | New | Broaden the bolete guide beyond our four ceps and two Suillus species. | [bolets.info](https://bolets.info/fitxa-bolet/cigroleccinum-lepidumfaisan/) |
| **Suillus bellinii — Molleric clar** | New | A natural comparison with the two mollerics already in our catalogue. | [bolets.info](https://bolets.info/fitxa-bolet/molleric-clarsuillus-bellini/) |
| **Hydnum albidum — Llengua de bou blanca** | New | Extend the existing llengua de bou guide with a distinct competitor-covered subject. | [bolets.com](https://www.bolets.com/la-llengua-de-bou-blanca.html) |

This batch contains **five mentioned-only species and seven new subjects**. Its six most direct safety/confusion additions are L. chrysorrheus, L. torminosus, A. xanthodermus, R. formosa, H. fasciculare and the verderol group.

Primary nomenclature checks support [Lactarius rugatus → Lactifluus rugatus](https://www.gbif.org/taxon/3RS7V), [Leccinum lepidum → Leccinellum lepidum](https://www.gbif.org/taxon/6P5F2) and [Suillus bellini → Suillus bellinii](https://www.gbif.org/taxon/7B4SL). Retain older names as discovery aliases where appropriate. The competitor vocabulary is preserved in the matrix rather than silently rewritten.

## Second batch: 15 subjects

These are also absent as dedicated profiles. They extend useful clusters but are less urgent than the first batch:

| Cluster | Subjects | Evidence |
|---|---|---|
| Existing popular families | Hydnum rufescens; Hygrophorus persoonii; Craterellus cinereus; Russula delica; Cortinarius trivialis | Individual bolets.info records in the matrix; [trompeta comparison](https://www.bolets.com/trompeta-de-la-mort-vs-trompeta-cendrosa.html) |
| Broader recognition and woodland fungi | Sparassis crispa; Fistulina hepatica; Agaricus arvensis; Trametes versicolor; Ganoderma lucidum; Auricularia auricula-judae; Flammulina velutipes | [Boletaires public dataset](https://boletaires.cat/js/species-data.min.js) |
| Rovelló family extension | Lactarius salmonicolor; Lactarius quieticolor; Lactarius vinosus | Dedicated sections in [bolets.com's rovelló article](https://www.bolets.com/rovello.html); the quieticolor spelling and species limits must be checked before publication |

The rovelló family is a worthwhile extension of our existing hub. Competitor L. deterrimus coverage is only a passing mention, so it remains lower priority. L. semisanguifluus is already mentioned in our rovelló profile, but this run did not establish an equivalent dedicated competitor entry; it should not be presented as a newly discovered competitor gap.

All remaining named candidates are retained as P3 rows in the matrix. P3 means an optional future research subject, not an instruction to copy the competitor's entire catalogue. For example, the sabatera article offers a conservation-oriented subject, but its current name and conservation claims require independent source checks.

## Avoid duplicate pages and name collisions

- **Already covered:** camagroc under Cantharellus lutescens; fals camagroc under Cantharellus tubaeformis; matagent under Boletus satanas; fredolic allenegat under Tricholoma portentosum. These require aliases or clearer discovery if anything, not new species records.
- **Pollancró:** the local Cyclocybe cylindracea profile already discusses Agrocybe aegerita. The comparison treats both competitors' aegerita entries as editorial overlap. This is not a universal assertion that every taxonomic treatment makes Cyclocybe aegerita and C. cylindracea identical; resolve species concepts before splitting a page. [GBIF checklist treatment](https://www.gbif.org/species/132621471).
- **Múrgola:** Morchella rotunda is folded into our M. esculenta subject in this comparison. [Index Fungorum](https://www.indexfungorum.org/names/NamesRecord.asp?RecordID=166368) lists M. esculenta as its current name.
- **Lleterola roja:** bolets.info and bolets.com use Lactarius rugatus; Boletaires uses Lactarius volemus. Do not merge the taxa because the Catalan names overlap.
- **Rovelló de cabra:** competitor usage covers both L. chrysorrheus and L. torminosus. Each needs a specific identity and cross-links.
- **Pampa:** bolets.info's body says only “Clitocybe,” while its URL includes gibba. Boletaires has Clitocybe geotropa. The former is unresolved, not evidence that both pages concern the same species.
- **Inocybe geophilla var. lilacina:** retain as an unresolved legacy name, not a confirmed extra species.
- **Llengua de bou vermellosa:** bolets.info uses Hydnum rufescens; the Boletaires Fistulina hepatica record also includes this vernacular label. Match scientific identity.
- **Competitor synonym lists:** do not automatically merge Chlorophyllum brunneum with the rhacodes names, or Leccinum aurantiacum with L. versipelle, merely because the Boletaires dataset lists them together. Those assertions were not adopted in this comparison.

## Publication approach

Use the existing reference-only species architecture for additions unless separately justified numerical ecology is available. Each profile needs source-backed morphology, habitat and season prose, clear comparisons, truthful safety wording, licensed diagnostic photographs and an explicit Catalan slug. Add links from the existing related profiles and guide hubs.

Competitor presence establishes a **coverage opportunity**, not the accuracy of its biological or consumption advice. Several bolets.info pages expose a “comestible” image label alongside cautionary or non-edible text. Validate safety content against institutional/mycological sources; the [ACSA mushroom guidance](https://acsa.gencat.cat/ca/detall/article/Bolets) and its [sector hygiene guide](https://acsa.gencat.cat/web/.content/Documents/eines_i_recursos/guia_practiques_castellano/gpch_setas_trufas.pdf) provide starting points, including historical discussion of T. equestre. This audit does not issue consumption advice or a current legal determination.

No independent mycological review is planned; state that truthfully without describing review as pending or adding an indexing gate. Descriptive additions must remain outside prediction selectors, habitat caches and quantified calendars. Do not invent ranges or scores to make catalogue coverage look complete.

## Deliverables and checks

- `species-competitor-matrix-2026-09-02.csv`: source name, comparison name, local coverage, priority, evidence type, source URL and exact local mention locations for 144 source entries.
- Reconciled totals against the parsed inventories; verified that all first- and second-batch candidates lack their own local profile; checked local mention references and all 56 canonical species IDs.
- Research documents only. No runtime catalogue edits, deployments or prediction changes were made by this audit; application tests were not needed for these documentation changes.
