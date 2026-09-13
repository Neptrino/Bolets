# Opening map static tiles — 13 September 2026

Historical implementation receipt. Current ownership and refresh guidance live
in [frontend performance](../frontend-performance.md) and the
[source catalogue](../../data/icgc-bootstrap/README.md).

After the hidden-selector release, valid mobile map PageSpeed reports still
scored 77 and 80, with LCP 5.3 and 4.9 seconds. The first report's observed LCP
breakdown included 900 ms loading its tile. Opening tiles still passed through
the application API, which intentionally bypasses Cloudflare edge caching.

The [view inventory](icgc-bootstrap-2026-09-13.json) records map viewports from
320 to 1920 pixels and mobile/desktop Avui, Cep and Pinetell views. The mobile
opening views share 18 zoom-7 tiles: relief/reference, x 63–65, y 46–48. Freeze
only that set (62,920 bytes), preserving exact WebP responses and provenance.
Build-time checksum validation exports them through the existing public static
CDN path; all other tile coordinates keep the normal API. No prediction data,
viewport persistence, provider configuration or edge caching rules change.

Validation passes: production build, lint/source-size, type checks, 14 unit
cases, and 17 browser cases covering static tile byte identity, normal API
requests after zooming, camera restoration, geolocation, provider switching,
seams, hidden selectors, incremental predictions and Avui viewport loading.
The new browser case initially tried mobile-hidden zoom buttons; it was fixed
to use the actual double-click zoom gesture and passed. Those failures were in
the test's interaction, not missing or damaged map tiles.

This candidate removes the application's tile handling from the opening view.
Its deployed PageSpeed impact remains to be measured; no score improvement is
claimed from the path change alone.
