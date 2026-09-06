# Instagram growth playbook

This is the low-maintenance operating system for `@bolets.app`. Automated
content must remain derived from the signed, verified Catalonia daily overview;
it must never imply that a prediction confirms mushroom presence or reveal a
collection location.

## Publishing rhythm

| When (Europe/Madrid) | Format | Purpose | Ownership |
| --- | --- | --- | --- |
| Daily, 07:00 | Feed prediction + Story | Build a reliable daily habit | Automated |
| Wednesday, 19:00 | Five-image carousel | Teach people how to interpret the model | Automated |
| Friday, 18:00 | Short vertical Reel | Give a shareable weekend preparation update | Automated |
| Sunday, 15 minutes | Replies and review | Turn attention into conversation and improve topics | Human |

Every automated job checks that the observation belongs to the current
Catalonia civil day, verifies its scheduled weekday when applicable, and checks
the Buffer channel for its own date marker before publishing.

### Weekend Reel design

The Friday Reel opens with “Aquest cap de setmana, on miraries?” and the
combined Avui map as its main visual. Five frames cover the map, territorial
comparisons, the leading species, the extent of its signal, and a save/share
invitation. The map appears on frame one; `WEEKEND_MAP_SLIDE` is shared with the signed image route.

Use solid cream and forest panels, orange accents, and the shared Nunito Sans
image fonts. Keep the main content inside the central feed crop, away from
Reel controls. Every frame carries the observation date and the presence
limitation. Label scores as best-sector maxima and show both positive-cell and
20+-cell prevalence; a zero reading must not become a positive recommendation.
Photographs are labelled as references, never as today's sightings.

`components/instagram-weekend-card.tsx` owns the composition;
`src/lib/instagram-weekend-render.tsx` loads the existing catalogue photograph
and shared fonts. The signed, current-day publication checks remain unchanged.
Run `npx tsx scripts/preview-instagram-weekend.tsx [map-image-path]` to render
five PNGs, a contact sheet and the encoded Reel under
`artifacts/instagram/weekend-redesign`. This local preview uses fictional
readings marked **MOSTRA**, and an optional map is only a visual reference.
It does not publish anything.

## Profile setup

Recommended name field:

> Bolets Atles · Predicció Catalunya

Recommended bio:

> Condicions per trobar bolets a Catalunya 🍄
> Dades ambientals i hàbitat, actualitzats cada dia.
> No confirma presència ni revela localitzacions.
> ↓ Consulta el mapa d’avui

Keep the profile link pointed at `https://bolets.app/bolets-avui`. The website
already links back to the Instagram profile.

## Three pinned posts

1. **Què és Bolets Atles?** A simple introduction: what the map measures, who it
   is for, and the fact that it does not confirm presence.
2. **Com llegir un 0–100?** Pin the automated educational carousel after its
   first publication.
3. **Sortir al bosc amb criteri.** A safety and responsibility post covering
   identification, local rules, respect for habitat, and collection limits.

The first and third posts require a one-time manual publish because they are
editorial statements rather than a current prediction. Pinning also remains a
manual Instagram action.

## Weekly human routine

Once a week, spend 15 minutes on the parts automation cannot do well:

1. Reply to every genuine comment and question in the account’s voice.
2. Save recurring questions as future carousel topics.
3. Comment thoughtfully on three relevant Catalan accounts; do not paste a
   generic promotional message.
4. Review `/admin/status/instagram` and compare reach, shares, saves, profile
   visits, and follows. A high-reach post with no follows needs a clearer profile
   promise; a low-reach post with many shares should be repeated in a new form.

## Collaboration targets and message

Prioritize public institutions, nature educators, mycological associations,
responsible outdoor communities, local tourism organizations, and forest or
weather communicators. Avoid accounts centered on disclosing exact collection
spots.

Suggested outreach message:

> Hola! Som Bolets Atles, un projecte que publica cada dia una lectura de les
> condicions per a la fructificació de bolets a Catalunya sense revelar punts de
> recol·lecció. Ens agradaria preparar una peça conjunta sobre [tema concret]
> que aporti valor a les dues comunitats. Nosaltres podem aportar la lectura de
> dades i vosaltres [aportació específica]. Us encaixaria explorar-ho?

Personalize the topic and the other account’s contribution before sending it.
No outreach is sent automatically.

## Review rule

After four weeks, keep a format only when it improves at least one useful
signal: non-follower reach, shares, saves, profile visits, follows, or site
visits. Do not optimize for raw publication count.
