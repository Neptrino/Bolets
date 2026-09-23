# Documentation

Use this index for current guidance and open plans. Dated research and completed implementation reports live in [archive](archive/README.md); their measurements and status statements apply to the original review date, not the current release.

## Engineering and operations

| Document | Use it for |
| --- | --- |
| [Frontend performance](frontend-performance.md) | Stylesheet ownership, intent prefetch, raster map rendering and verification |
| [Architecture](architecture.md) | Data flow, scoring boundaries, privacy and deployment model |
| [Repository guidance](../AGENTS.md) | Engineering conventions and required safeguards |
| [Supabase runbook](../supabase/README.md) | Environmental pipelines, imports and database operations |
| [VPS runbook](../deploy/vps/README.md) | Deployment, backups, monitoring and rollback |
| [Cloudflare zone](../deploy/vps/cloudflare.md) | DNS-only website, why the proxy is off, re-proxying during an attack |
| [Data licences](data-licenses.md) | Source provenance and reuse requirements |
| [Fruiting-model diagnosis](fruiting-model-diagnosis.md) | Historical calibration evidence and replay procedure; current constants remain in code |
| [Findings evaluation](findings-evaluation.md) | Recorded-taxon grouping, ambiguous reports, unsuccessful visits and legacy replay migration |
| [Terrain thermal exposure](terrain-thermal-exposure.md) | Optional thermal evidence, rejected hourly correction and findings comparison |
| [Observed temperature validation](station-temperature-validation.md) | Full-network XEMA/AROME diagnostics, observation quality, adjacent-cell checks and paired findings evaluation |
| [Offline AROME comparison](arome-point-artifact-comparison.md) | Reproducible private artifact comparison |

## Product and editorial work

| Document | Status / purpose |
| --- | --- |
| [Product roadmap](product-planning-journey-plan-2026-09-06.md) | Reference discovery committed; later releases remain proposed |
| [Recipe content plan](recipe-cms-and-content-plan-2026-09-03.md) | Proposed architecture; later candidate research is linked from the plan |
| [SEO operations](seo-launch-operations.md) | Release checks and measurement; account baseline is explicitly dated |
| [Species page depth rollout](species-depth-test-2026-09.md) | Running since 24 September 2026; top-20 species with hand-written text against the untreated rest, checkpoints 12 and 26 October |
| [Map discovery plan](map-discovery-plan.md) | Proposed homepage/map clarity release, followed by Avui and local-guide journey improvements |
| [Annual map price survey — closed](archive/map-price-survey-2026-09.md) | Closed experiment; historical privacy and measurement record |
| [Map discovery — 14 September](archive/map-discovery-2026-09-14.md) | Indexed-map diagnosis, query/device baseline and local navigation/freshness corrections |
| [Map-search competitors — 14 September](archive/map-search-competitors-2026-09-14.md) | Dated ranking evidence, competitor presentation and proposed map-discovery improvements |
| [Analytics review — 14 September](archive/analytics-review-2026-09-14.md) | Dated search, website and Instagram evidence with proposed optimization priorities |
| [Backlink campaign](backlink-outreach-campaign.md) | Editorial pitch material; recheck targets and campaign eligibility before contact |
| [Optional mycological review](mycological-review-checklist.md) | Future review checklist; no reviewer appointed or review planned |
| [Species field cards](species-field-cards.md) | Illustrated card assets, provenance, previews and downloads |
| [Illustration audit — 20 September](archive/field-card-illustration-review-2026-09-20.md) | Dated screening of all 62 cards; correction priorities and limits |
| [Species icon audit — 20 September](archive/species-icon-review-2026-09-20.md) | Dated raw-icon screening; eight priority corrections |
| [Numbered species icon review — 20 September](archive/species-icon-numbered-review-2026-09-20.md) | Current 61 PNGs: four corrections and nine refinements |
| [Regenerated species icons — 20 September](archive/species-icon-recheck-2026-09-20.md) | 62 species present; remaining free-gill correction and blade refinement |

## Instagram

| Document | Use it for |
| --- | --- |
| [Operating playbook](instagram-growth-playbook.md) | Publishing, profile, €200 growth ceiling and measurement |
| [Monthly content calendar](instagram-calendar-2026-09-09-to-10-08.md) | September 9–October 8: confirmed Buffer posts, completed editorial batch and automatic Story follow-ups |
| [Next content plan](instagram-content-plan-september-october-2026.md) | Proposed 21 September–4 October calendar, live September 8 performance and production briefs |
| [Visual style](instagram-style-guide.md) | Start here for production: formats, approved visual references, typography, contrast and reusable assets |
| [Illustrated carousels](instagram-illustrated-carousel-style.md) | Approved manual field-guide illustration style |
| [Asset library](../assets/README.md) | Reusable creative sources, provenance and templates |

## Keeping this folder useful

- Keep reusable guidance and genuinely open plans here, and link them from this index.
- Give plans an explicit status. A local check, a commit and a production deployment are different milestones.
- Archive dated research and completed release receipts when they still preserve evidence. Keep CSV/JSON companions beside their reports.
- Remove superseded handoffs when their useful instructions or receipts are retained elsewhere; Git preserves the old text.
- Update inbound links when moving files. Do not turn historical measurements into current claims without a fresh check.
