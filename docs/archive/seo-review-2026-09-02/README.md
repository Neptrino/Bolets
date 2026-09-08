# SEO review source bundle · 2 September 2026

Historical research moved out of `.codex-tmp` on 8 September 2026. These measurements describe the original audit, not the current site.

- [Findings](report-source.md): written interpretation.
- [Workbook data](seo-review-data.json): original inputs.
- [Local audit](seo-audit-local.json) and [4xx audit](seo-audit-4xx.json): evidence snapshots.
- [Original workbook builder](build-seo-workbook.mjs): preserved source, not a maintained application command. It retains the original absolute checkout path, `.codex-tmp` inputs and `outputs/` destination and depends on the separate `@oai/artifact-tool` authoring runtime. Adapt paths and supply that runtime before attempting a new export; do not add it as an application dependency merely to retain this historical report.

Source files are preserved byte-for-byte. The original workbook/export is not required by the application. See the [current documentation index](../../README.md) for ongoing SEO operations.
