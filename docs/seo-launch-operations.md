# SEO launch operations

Last updated: 2026-08-13

These account-level actions are deliberately separate from the application release. They require the domain owner’s Google, Bing and SE Ranking accounts.

## Google Search Console and Bing

1. Verify the `sc-domain:bolets.app` Google Search Console property through DNS.
2. Submit `https://bolets.app/sitemap.xml`.
3. Inspect `/`, `/bolets`, `/bolets/boletus-edulis`, `/map`, `/bolets-avui` and `/compare/rovello-vs-pinetell`.
4. Request indexing only for those representative pages.
5. Import the verified Search Console property into Bing Webmaster Tools and confirm that the same sitemap is present.
6. Record discovered, crawled and indexed URLs on days 7, 14 and 30. Segment exclusions by route template and record the first non-branded impressions.

## SE Ranking configuration

- Search engine: Google Spain
- Device: mobile
- Language: Catalan
- Location: Barcelona or Catalonia, where supported
- Competitors: `boletaires.cat`, `micopedia.cat`, `bolets.info`, `bolets.com`, `fotosdebolets.com`, `vadebolets.cat`
- Export fields: monthly volume, monthly trend, difficulty, CPC, intent, SERP features and top-10 ranking URLs

Track this first keyword set:

`bolets`, `bolets de catalunya`, `tipus de bolets`, `bolets comestibles`, `bolets verinosos`, `mapa bolets catalunya`, `bolets catalunya avui`, `on trobar bolets`, `on trobar bolets avui`, `temporada bolets catalunya`, `rovellons`, `on trobar rovellons`, `camagrocs`, `ceps bolets`, `fredolics`, `llenegues`, `rossinyols bolets`, `trompeta de la mort`, `ou de reig`, `múrgoles`, `bolets de primavera`, `quants dies després de ploure surten els bolets`.

Do not add GA4 during this sprint. Vercel Analytics and Speed Insights remain the only product analytics integrations.
