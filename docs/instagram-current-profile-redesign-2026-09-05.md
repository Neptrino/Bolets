# Current Instagram profile recreated · 5 September 2026

Read all 17 public posts on [@bolets.app](https://www.instagram.com/bolets.app/), including the displayed pin order. Exported each visible original cover and retained its public caption and permalink in the local source manifest. Recreated the same ordered grid using `docs/instagram-style-guide.md`.

This deliverable is a **cover study**. It does not replace the videos or carousel interiors. The active ad at position 5 remains the reference artwork. No Instagram posts, pins, captions, ads or schedules were changed.

## Post mapping

| Position | Existing subject | Proposed cover |
| --- | --- | --- |
| 1 · pinned | Atlas introduction | Tot un món de bolets. · Original field photo |
| 2 · pinned | Evolution of conditions | El bosc canvia cada dia. · Combined map |
| 3 · pinned | Detailed species map | Mira el bosc de prop. · Orange map lens |
| 4 | Neighbouring sectors differ | Dos boscos. Dues lectures. · Forest/map lens |
| 5 | Active app advertisement | Existing artwork retained |
| 6 | Weekend conditions | On miraries aquest cap de setmana? · Avui map |
| 7 | Weekend preparation | Tria el bosc amb criteri. · Original field photo |
| 8 | Cep identification carousel | Cep · Credited catalogue photograph |
| 9 | Apagallums identification carousel | Apagallums · Current credited catalogue photograph |
| 10 | Interpreting the prediction | Què vol dir aquest número? · Cream scale |
| 11 | Atlas introduction post | Coneix els bolets. Entén el bosc. · Field photograph |
| 12 | Conditions versus exact locations | Condicions. No localitzacions. · Forest scale |
| 13 | Responsible field use | El bosc es respecta. · Orange editorial illustration |
| 14 | Petits tresors del bosc | Original photograph with discreet branding |
| 15 | El bosc comença a produir | Original photograph with discreet branding |
| 16 | Uncaptioned field photograph | Original photograph with discreet branding |
| 17 | Uncaptioned field photograph | Original photograph with discreet branding |

Map images are existing reference captures, not a reconstruction of historical predictions or verified new live readings. No historical score is silently updated. The four original field photographs remain field photographs; no identification, date or location is invented for the uncaptioned posts. Exported profile images are local review material and are not added to the product catalogue or treated as a new licence grant.

## Review files

All outputs are under `artifacts/instagram/current-profile-redesign/`:

- `index.html`: complete before/after review, expandable individual comparisons and original post links.
- `comparison.jpg`: all 17 posts before and after.
- `comparison-top-nine.jpg`: first nine posts before and after.
- `after.jpg` and `after-top-nine.jpg`: proposed profile grids.
- `covers/01.png` through `covers/17.png`: 1080 × 1350 cover files.
- `source-posts.json` and `redesign-manifest.json`: observed order, original captions, source links and design mapping.
- `originals/`: exported original covers for comparison.

Both sides of the grid use the same three-column 3:4 preview crop. This is a consistent comparison rather than a screenshot of Instagram's responsive desktop layout. Full cover files remain 4:5.

Regenerate with `npx tsx scripts/recreate-instagram-profile.tsx` after the source export is present. The shared local study components are in `scripts/instagram-profile-study-cards.tsx`; they are deliberately separate from the signed current-condition publishing routes.

Verification: all 17 unique source posts and cover dimensions checked; full proposed grid visually inspected; HTML comparison and first expandable before/after pair verified in the browser; typecheck and targeted ESLint passed. Production runtime code was not changed in this follow-up.
