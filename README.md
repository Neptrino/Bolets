# Bolets

A mushroom reference for Catalonia: species, identification education, seasons, habitats and a map of current fruiting conditions. Predictions describe environmental conditions; they do not confirm presence or identify mushrooms for consumption.

Start with the [documentation index](docs/README.md) and [repository guidance](AGENTS.md). Operational procedures are in the [Supabase runbook](supabase/README.md) and [VPS runbook](deploy/vps/README.md).

## Repository map

| Location | What belongs here |
| --- | --- |
| `app/` | Next.js pages, layouts and server routes |
| `components/` | Shared interface components |
| `src/` | Application logic, adapters and utilities |
| `data/` | Version-controlled catalogue, ecology and editorial configuration |
| `public/` | Website assets; generated responsive media remains ignored |
| `supabase/` | Migrations, Edge Functions and database operations |
| `workers/`, `lambda/` | Narrow environmental-provider egress services |
| `deploy/` | Deployment and infrastructure configuration/runbooks |
| `scripts/` | Maintained build, capture and maintenance commands |
| `tests/` | Unit, integration and browser coverage |
| `video/` | Remotion source and its input assets |
| `templates/` | Reusable version-controlled creative briefs |
| `tools/` | Standalone local tools, including Photo Studio |
| `docs/` | Active guidance and explicitly open plans |
| `docs/archive/` | Dated research, receipts and historical source bundles |
| [social/](social/README.md) | Local social campaigns, exports and reusable creative sources; only its index is tracked |
| `artifacts/` | Ignored generated captures, previews and diagnostic material used by scripts |
| `output/` | Ad-hoc local deliverables or in-progress work; review files before committing |
| `.codex-tmp/` | Ignored session scratch files and temporary tooling; retained research belongs in the archive |

The application, service and script directories have distinct responsibilities; do not merge them just to reduce the top-level folder count. Build caches (`.next/`, `node_modules/`), local environment files and tool state remain outside version control. Local creative and scratch folders are excluded from the Docker build context.

## Local development

Use the Node 24 runtime used by the production image. Install dependencies with `npm ci`, configure local environment values from `.env.example`, and run `npm run dev` (port 3101). The development/build commands generate responsive media automatically. Use the database runbook for local data setup; do not copy production credentials into tracked files.

Relevant checks are `npm test`, `npm run typecheck`, `npm run lint` and `npm run build`; browser tests use `npm run test:e2e`. Select checks appropriate to the change and investigate failures before treating the work as complete.

## Keeping the layout clean

Keep source beside the subsystem that owns it. Keep reusable guidance in `docs/`, and dated evidence in its archive with linked source files. Social publishing guidance is centralized in the [Instagram operating playbook](docs/instagram-growth-playbook.md); captions and receipts stay with their media. Do not treat ignored files as backed up or assume generated-looking captures are disposable: some are reproducibility inputs for later renders.
