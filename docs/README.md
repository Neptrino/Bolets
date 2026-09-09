# Documentation

Use this index for current guidance and open plans. Dated research and completed implementation reports live in [archive](archive/README.md); their measurements and status statements apply to the original review date, not the current release.

## Engineering and operations

| Document | Use it for |
| --- | --- |
| [Architecture](architecture.md) | Data flow, scoring boundaries, privacy and deployment model |
| [Repository guidance](../AGENTS.md) | Engineering conventions and required safeguards |
| [Supabase runbook](../supabase/README.md) | Environmental pipelines, imports and database operations |
| [VPS runbook](../deploy/vps/README.md) | Deployment, backups, monitoring and rollback |
| [Cloudflare edge configuration](../deploy/vps/cloudflare.md) | TLS, caching rules and rollback |
| [Data licences](data-licenses.md) | Source provenance and reuse requirements |
| [Fruiting-model diagnosis](fruiting-model-diagnosis.md) | Historical calibration evidence and replay procedure; current constants remain in code |
| [Terrain thermal exposure](terrain-thermal-exposure.md) | Optional thermal evidence, rejected hourly correction and findings comparison |
| [Observed temperature validation](station-temperature-validation.md) | XEMA/AROME diagnostics, observation quality, adjacent-cell checks and paired findings evaluation |
| [Offline AROME comparison](arome-point-artifact-comparison.md) | Reproducible private artifact comparison |

## Product and editorial work

| Document | Status / purpose |
| --- | --- |
| [Product roadmap](product-planning-journey-plan-2026-09-06.md) | Reference discovery committed; later releases remain proposed |
| [Recipe content plan](recipe-cms-and-content-plan-2026-09-03.md) | Proposed architecture; later candidate research is linked from the plan |
| [SEO operations](seo-launch-operations.md) | Release checks and measurement; account baseline is explicitly dated |
| [Backlink campaign](backlink-outreach-campaign.md) | Editorial pitch material; recheck targets and campaign eligibility before contact |
| [Optional mycological review](mycological-review-checklist.md) | Future review checklist; no reviewer appointed or review planned |

## Instagram

| Document | Use it for |
| --- | --- |
| [Operating playbook](instagram-growth-playbook.md) | Publishing, profile, €200 growth ceiling and measurement |
| [Monthly content calendar](instagram-calendar-2026-09-09-to-10-08.md) | September 9–October 8: confirmed Buffer posts, completed editorial batch and automatic Story follow-ups |
| [Next content plan](instagram-content-plan-september-october-2026.md) | Proposed 21 September–4 October calendar, live September 8 performance and production briefs |
| [Visual style](instagram-style-guide.md) | Shared typography, palette, covers and reusable assets |
| [Illustrated carousels](instagram-illustrated-carousel-style.md) | Approved manual field-guide illustration style |
| [Asset library](../social/asset-library/README.md) | Reusable creative sources, provenance and templates |

## Keeping this folder useful

- Keep reusable guidance and genuinely open plans here, and link them from this index.
- Give plans an explicit status. A local check, a commit and a production deployment are different milestones.
- Archive dated research and completed release receipts when they still preserve evidence. Keep CSV/JSON companions beside their reports.
- Remove superseded handoffs when their useful instructions or receipts are retained elsewhere; Git preserves the old text.
- Update inbound links when moving files. Do not turn historical measurements into current claims without a fresh check.
