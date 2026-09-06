# Instagram templates

The visual rules live in `docs/instagram-style-guide.md`. Shared colours, type and canvas margins live in `src/lib/instagram-design.ts`.

Render a local draft from one of these briefs:

```sh
npx tsx scripts/render-instagram-template.tsx templates/instagram/species-photo.json feed
npx tsx scripts/render-instagram-template.tsx templates/instagram/education-question.json story
npx tsx scripts/render-instagram-template.tsx templates/instagram/field-detail.json feed
```

Outputs are under `artifacts/instagram/template-drafts/` and carry ESBORRANY. Edit the JSON title, eyebrow and subtitle to reuse a layout. Photo briefs accept a catalogue species identifier and load its credited reference image. Question briefs accept the water, trees, scale, extent, calendar or field illustration with a cream, orange or forest background. Unknown fields and unsupported layouts are rejected. A map is deliberately not a generic JSON template.

Recreate the full kit and nine-post preview:

```sh
npx tsx scripts/preview-instagram-kit.tsx artifacts/instagram/weekend-redesign/avui-map.jpg
```

The supplied map is an archived reference, not a current-day reading. The preview includes fictional territorial data labelled MOSTRA. Outputs are under `artifacts/instagram/profile-kit/`; `profile-preview.jpg` combines the existing ad, a newer Reel and proposed covers. Full Reel frames are contained in the grid cells, not cropped exactly as Instagram would display them. The kit does not publish or schedule anything.
