# Instagram publishing workflow

> Historical snapshot, consolidated 8 September 2026. Use the [Instagram playbook](../instagram-growth-playbook.md) for current operating guidance. Dates, account observations and proposed actions below are not a current queue or spending instruction.

Configured and checked on 7 September 2026 for `@bolets.app`.

## Where to publish

- **Meta Business Suite:** new manually prepared carousels, Reels and other editorial content. Use the [Bolets Planner](https://business.facebook.com/latest/content_calendar?business_id=1640525320823709&asset_id=1323226590867929).
- **Buffer Free:** retain the existing server integration for signed, verified current-condition publication. Keep its channel connected; this setup does not change publishing code, credentials or automated jobs.
- **Migration in progress:** five image posts/carousels were moved from Buffer into Meta and removed from Buffer after checking their saved captions, media and original schedule. Four Reels remain scheduled in Buffer until equivalent Meta copies are verified. Check both calendars before assigning new slots. The migration receipt is `social/asset-library/templates/meta-migration-2026-09-07.json`; the full original export and media backup are in `social/meta-migration-2026-09-07/`.

The Buffer channel is `6a960174065799be4662a8f5`; its [queue](https://publish.buffer.com/channels/6a960174065799be4662a8f5/schedule) showed nine posts during setup; five were subsequently migrated. This is a point-in-time observation, not a permanent queue count.

## Setup verified

Signed into Meta Business Suite using the existing `bolets.app` Instagram session, completed the welcome step, and confirmed Instagram message access for the Business Suite Inbox. The selected Instagram asset is `1323226590867929`, under business `1640525320823709`.

The Planner opens and the post composer targets `bolets.app`. The composer exposes photo/video upload (up to ten media items in this account's current UI) and a **Set date and time** switch that enables scheduling. The home dashboard also exposes Create reel, Create story and bulk scheduling. No test post was published or scheduled during setup.

## Manual publishing procedure

1. Check both Meta Planner and the remaining Buffer queue for existing content and timing conflicts.
2. Prepare media using the [Instagram style guide](../instagram-style-guide.md) and [illustrated carousel style](../instagram-illustrated-carousel-style.md). Source resources live in [assets](../../social/asset-library/README.md).
3. Select `bolets.app`, upload the final files in slide order, and add the approved Catalan caption and available alt text. Preserve source credits and use Instagram's AI disclosure controls where applicable; do not add an AI label to the artwork itself.
4. Review the preview, caption, media order and destination. Select a concrete date/time in Europe/Madrid; verify the timezone presented by the scheduler before confirming. Europe/Madrid was verified during migration; use 12 PM for noon and check the persisted calendar placement.
5. Confirm the scheduled item in Meta's calendar and record its platform, date/time and source files with the campaign. Changing a local export does not update an uploaded post.

This workflow does not reactivate the retired automatic educational carousel series. Current-condition publication remains subject to its signed, current-day data checks.

## Migration checks and composer limitations

Paste captions into the Reel content editor using native paste and verify the saved caption afterward. Setting its contenteditable value made text visible without persisting it in the first two attempts; those incomplete Meta copies were deleted and their Buffer originals retained.

The bulk Reel uploader and later individual Reel retries stalled at 0%. Do not remove a Buffer original until the correct Meta copy is confirmed. Upload carousel images one at a time and check slide order.

This account’s Meta photo composer does not expose a native AI-disclosure control. Soil and litter caption disclosures were preserved. The cutting/pulling illustration originally had the Buffer AI flag; its Meta caption adds “Il·lustració creada amb IA.” to preserve disclosure without adding a label to the artwork. This caption disclosure is not the platform’s native AI label.
