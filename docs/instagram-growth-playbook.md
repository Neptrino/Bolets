# Instagram operating playbook

Consolidated on 8 September 2026 for `@bolets.app`. This is the single place for publishing responsibilities, profile direction, growth decisions and measurement. The [visual guide](instagram-style-guide.md) owns design; the [illustrated-carousel reference](instagram-illustrated-carousel-style.md) owns the detailed manual illustration standard. Local campaigns and source files are indexed in [social](../social/README.md).

Repository automation was checked during consolidation. Live accounts, queues, ad spend and results were not re-audited. Historical receipts and planned dates are not instructions to publish, contact someone or change a campaign.

## Positioning and profile

Bolets is a mushroom reference for Catalonia: a dated conditions map, species, names, identification education, seasons and responsible field use. Lead timely posts with the practical benefit of comparing conditions; reward profile browsing with useful species and field guidance.

The bio recorded after the 5 September update is:

> Bolets de Catalunya, amb criteri 🍄
> Mapa de condicions · Espècies · Guies de camp
> ↓ Consulta el mapa d’avui

Keep the profile destination at [Bolets avui](https://bolets.app/bolets-avui). Suggested highlights are **Mapa · Espècies · Al bosc · Guies**, populated with useful existing stories.

Pin roles are introduction, interpreting conditions and responsible field use. The paid-growth draft also proposed featuring the current promo. These are alternatives to evaluate against the actual profile; no current pin order was verified. Reuse completed material and inspect existing pins before preparing replacements. The [account receipt](archive/instagram-account-update-2026-09-05.md) preserves the bio change, published replacements and mobile cover handoff.

## Publishing responsibilities

| Content | Timing / ownership | Destination |
| --- | --- | --- |
| Verified daily conditions | Repository timer: daily 07:00 Europe/Madrid | Automated **Story only**, through Buffer |
| Verified weekend conditions | Repository timer: Friday 18:00 Europe/Madrid | Automated Reel through Buffer |
| Species, illustrated lessons, photos and campaign Reels | Manual editorial slots; check the Buffer queue | Buffer |
| Existing queued entries | Thirteen Meta replacements verified on September 8 | Buffer; do not reactivate cancelled Meta copies |

The daily publisher does not publish a feed card. A feed-format renderer or preview is not evidence of a feed schedule. Automatic education and species timers are retired. Species rendering/manual queue controls remain available; do not infer a recurring job from them.

Automated current-condition posts require signed, verified observations for the current Catalonia civil day, no preview data, and the channel's duplicate-publication checks. Withheld, stale or unavailable readings cannot produce a post. The weekend map represents current conditions even when the headline invites weekend planning. Operational setup lives in the [VPS runbook](../deploy/vps/README.md); this playbook does not replace its deployment instructions.

## Manual publishing

Buffer is the single scheduling queue for manual content, as requested on 8 September 2026. All thirteen upcoming Meta posts were recreated in [Buffer](https://publish.buffer.com/channels/6a960174065799be4662a8f5/schedule), alongside nine existing posts. Their Meta schedules were cancelled with Move to Drafts after the replacements were verified. Meta inconsistently displays cancelled copies as Failed to publish; do not retry or reschedule them. See the [completed transfer receipt](archive/buffer-migration-2026-09-08.md). Buffer remains the signed automation integration.

1. Check Buffer for existing media, duplicate subjects and timing conflicts. Campaign manifests and `buffer-manual-schedule.md` are preparation records, not proof that a slot is booked.
2. Prepare the final media, caption, alt text and credits using the visual guides. Verify source rights; a downloaded image or user finding does not itself grant social reuse permission.
3. Select `bolets.app`, upload in slide order, and verify the actual saved caption. Preserve generation disclosures in provenance/captions and use the platform's applicable AI controls; the creative preference is no burned-in AI label on the artwork.
4. Review crop, media order, spelling, credits, destination and date. Use Europe/Madrid and verify the saved calendar placement; 12 PM means noon.
5. Confirm the saved item and retain its platform ID, scheduled time and source files with the campaign. Editing a local file does not update uploaded media.

During migration, verify the replacement's video, cover, caption and original scheduled time before removing any original from its source platform. The [7 September receipt](../social/meta-migration-2026-09-07/STATUS.md) records five image/carousel transfers, four Reels still in Buffer and three additional unscheduled Reels. Those counts and proposed September 15–17 slots are historical, not a fresh queue audit; the September 8 reverse-transfer pack supersedes them as the latest planning record.

That receipt records repeated Reel uploads stuck at 0%; the cause remained unconfirmed even after file-access permission was verified. It also records captions that appeared in an editor but did not persist. Use native paste and verify saved content. The photo composer then lacked a native AI toggle, so applicable caption disclosures were retained. Recheck available controls rather than assuming these UI limitations are permanent. Do not rerun the migration's `export.mjs` over its original backup; its `audit-queue.mjs` is the read-only inventory helper.

## Growth decision: €200 total ceiling

The 8 September decision caps total paid spend at **€200, including money already spent**. Its snapshot estimated approximately €63 spent/committed (current boost up to €60 plus a €3 test), leaving about €137. Reconcile actual spend and outstanding commitments before allocating anything; this is not a refreshed balance.

Retained campaign rules from that decision:

- Prioritize the lowest-cost observed Catalonia outdoor audience, recorded as men aged 45–65+. Recheck performance rather than treating that result as permanent.
- The proposed pacing was €5–6/day from September 10, optionally concentrated on wet Fridays/weekends, always within the remaining total. No open-ended campaign or automatic budget increase.
- Review the creative test on September 13 and stop it under the recorded plan. Whether it is running or has already stopped requires an account check.
- Stop paid activity at the €200 ceiling or when reliably measured cost per acquired follower exceeds €0.06. If attribution is unavailable, do not substitute profile visits for followers or assume the threshold passed.

The earlier €600–900 scenario, €10–20/day schedules, audience-expansion ladder and October 10K target are superseded. They remain only in the [original growth snapshot](archive/instagram-growth-snapshot-2026-09-08.md).

That snapshot recorded 572 followers and estimated €0.05–0.06 per follower. Dividing the approximate €137 balance by that rate gives roughly 2,300–2,700 additional paid followers **if the rate holds**. This is a scenario, not a forecast: spend does not establish linear growth. The revised 3,000–3,500 mid-October and 5,000–6,000 end-November figures remain aspirational targets; 10K is not funded by the current budget. Older claims about fixed CPM, guaranteed reach or a particular feature's availability should not be used as operating facts.

## Editorial and community routine

Reuse the completed campaign after checking what is already published or scheduled. The capped plan proposes two manual Reels a week after the prepared series; treat this as a planning target alongside the daily Story and Friday automated Reel, not a new automation. Pair map utility with seasonal species, original field detail and manual illustrated lessons. Off-season topics can include identification, preservation and winter species; recipes depend on actual published recipe content.

Keep one useful action per post: open the map, save, share or answer. Use natural Catalan, a specific opening question and relevant caption keywords. Do not carry the older mandatory photo-first rule into the approved illustrated series, or treat old timing/hashtag experiments as platform rules.

The retained organic ideas are website-to-profile discovery, useful posts in relevant Facebook groups, selective co-authored posts and reader photographs. Check group rules and obtain permission for reused material; retain credits and omit sensitive locations. A submitted find is not proof that the model predicted it correctly. The older “Mapa vs realitat” intake/product work remains a proposal, not an implemented validation workflow.

Prioritize nature educators, mycological associations, tourism/forest communicators and creators whose work fits responsible field use. Older drafts disagree about contacting direct competitor `@boletada`; no partnership is established by those drafts. Select an actual editorial partner and concrete topic before any outreach. Historical competitor follower counts are not a current contact shortlist.

Suggested message, adapted to the actual recipient:

> Hola! Som Bolets, un projecte sobre els bolets de Catalunya. Ens agradaria preparar una peça conjunta sobre [tema concret]. Podem aportar una lectura de condicions amb data i límits clars, i vosaltres [aportació específica]. Us encaixaria explorar-ho?

Reply to comments when practical and collect recurring questions. Review results on Monday. Fifteen minutes covers a basic review; filming, editing, permissions and collaborations require separate planned time. No outreach or reposting happens automatically.

## Measurement and next decisions

Record the reporting period, source and paid/organic scope with every measurement. Use native Instagram/ad reporting for follower and paid metrics, `/admin/publicacio` for available post performance, and the existing privacy-preserving website analytics for site actions. Profile visits divided into total follower growth are not a verified paid conversion funnel.

| Measure | Decision it informs |
| --- | --- |
| Actual spend plus committed spend | Remaining room under the €200 ceiling |
| Attributed followers and cost per follower, when available | The recorded €0.06 stop rule |
| Profile visits, follows and unfollows | Profile clarity and retention; keep attribution limits visible |
| Non-follower reach, watch time and completion | Hook and Reel structure |
| Saves, shares and useful replies | Whether a topic warrants another treatment |
| Website clicks and landing-page outcomes | Whether ad attention reaches the intended product journey |

After four comparable weeks, retain formats that improve a useful signal rather than raw publication count. Compare similar periods and allow for autumn seasonality and paid promotion. Keep historical measurements in dated receipts instead of duplicating them here.

Pending account checks are the latest transfer destination/completion, actual ad spend/test state, pin order and recent outcomes. This consolidation does not assert that any of those actions have been completed.

## Evidence

- [4 September competitor research](archive/instagram-competitor-comparison-and-growth-plan-2026-09-04.md) and [benchmark CSV](archive/instagram-competitor-benchmark-2026-09-04.csv): original observations, limitations and unimplemented proposals.
- [5 September account and design receipt](archive/instagram-account-update-2026-09-05.md): published replacements and creative verification history.
- [7 September publishing setup](archive/instagram-publishing-setup-2026-09-07.md): original platform setup observations; later retries are in the local migration receipt.
- [8 September growth snapshot](archive/instagram-growth-snapshot-2026-09-08.md): original numbers and superseded uncapped scenario.
