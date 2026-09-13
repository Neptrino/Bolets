# Responsive AVIF imagery — 13 September 2026

Historical candidate measurements. Production activation and post-release
PageSpeed scores must be verified separately; this receipt does not itself
prove deployment. Current implementation guidance is in
[frontend performance](../frontend-performance.md).

Google's species-page audit still identified approximately 61 KiB of possible
savings in Cep's mobile hero, despite correctly sized WebP delivery. The source
photograph remains unchanged. The candidate exports AVIF alongside the existing
WebP variants, selects it through a native picture element and preserves WebP
fallbacks. AVIF quality is 50 below 960 pixels and 60 for larger variants, effort
3; WebP remains quality 72, effort 4. The encoding change advances URLs to v15.

A [four-run comparison](avif-performance-2026-09-13.json) against an isolated
production build of `55f47d4` measures median mobile LCP decreasing from 2,532
to 1,922 ms (24.1%). The hero falls from 110,140 to 63,537 bytes (42.3%), and
observed image transfer falls from 163,398 to 92,729 bytes (43.2%). All four runs
finish without browser errors. These measurements are not Lighthouse scores.

Ten browser cases verify home, catalogue, species and comparison imagery,
gallery navigation, lightbox behavior, primary-image priority, one hero download
and fallback without JavaScript. Twenty-seven unit cases cover variant paths
and service-worker behavior, including AVIF direct navigations. The Caddy
verification checks the actual production configuration's AVIF MIME type and
immutable cache headers alongside its existing privacy checks.

Side-by-side 640-pixel Cep and Pinetell images preserve visible identification
detail. Home, Cep and Pinetell image boxes match the baseline within one pixel
at 412 and 1,350 pixels wide, without horizontal overflow. Source dimensions,
cropping, credits and descriptions remain unchanged.

The Chromium `setDisabledImageTypes` test switch disables picture selection but
still requests typed AVIF preload links, reproduced in a minimal HTML control.
The fallback test therefore substitutes an unknown preferred MIME type in the
server HTML with JavaScript disabled, exercising both native unsupported-format
checks and preload suppression. A separate normal-browser check verifies that
the AVIF hero is downloaded exactly once and WebP is not also downloaded.

Older image checks still expected runtime `/_next/image` URLs and three Pinetell
photos; they now verify the existing static variant contract and derive the
gallery count from its actual thumbnails.

The production build, type checks and lint/source-size checks also pass.

## Deployed PageSpeed check

Release `fbfe76f` deployed successfully through Actions run 34726502096 and
reported healthy on the VPS. The [Google reports](avif-pagespeed-live-2026-09-13.json)
retain mobile and desktop results, including the outlier and tool failure:

| Route | Mobile | Desktop |
| --- | ---: | ---: |
| `/` | 91 | 100 |
| `/bolets` | 93 | 100 |
| `/bolets-avui` | 95; repeat 95 | Google driver error; repeat 99 |
| `/bolets/cep` | 91 | 100 |
| `/bolets/pinetell` | 79; repeat 89 | 100; repeat 100 |
| `/zones/ceps` | 96 | 100 |

All completed SEO audits score 100. Pinetell's first mobile report includes
517 ms TBT; the repeat has 69 ms, but a slower FCP of 2.3 seconds. Neither result
is discarded. Both report zero layout shift and no browser console errors.
Images are discovered from initial HTML with high fetch priority; Cep's
observed mobile LCP breakdown now spends 90 ms loading the image but 1,050 ms
waiting to render. Remaining first-paint/render work therefore matters more
than further image compression. The local controlled AVIF gains do not imply
that every deployed audit score improved.

Three live browser checks also pass: the single preferred-format hero preload,
gallery navigation/lightbox and descriptive thumbnails.
