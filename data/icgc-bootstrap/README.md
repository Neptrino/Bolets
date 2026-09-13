# Opening map cartography

This frozen set contains the 18 default relief/reference tiles requested by the
412 × 823 mobile opening views of `/map`, `/bolets-avui`, `/bolets/cep` and
`/bolets/pinetell`: zoom 7, x 63–65, y 46–48, two layers, 62,920 bytes total.
It contains background cartography only, never predictions or findings.

The manifest records capture time, production source revision, public source URL,
byte length and SHA-256 for each unmodified v2 WebP response. The encoding and
WMS sources are defined in `src/lib/icgc-map-tile.ts`. Relief retains its alpha
channel; the reference layer retains its opaque background. Build-time copying
verifies every record before exporting into the versioned optimized-media path.
Builds make no provider requests. Other tiles use the normal API.

Source: [ICGC Base Map Service](https://www.icgc.cat/ca/Geoinformacio-i-mapes/Servei-de-Mapa-Base),
retrieved 13 September 2026 (Catalonia time).
[ICGC reuse terms](https://www.icgc.cat/ca/LICGC/Informacio-publica/Transparencia/Reutilitzacio-de-la-informacio)
permit reuse with attribution under CC BY 4.0. Reference cartography outside
Catalonia incorporates OpenMapTiles/OpenStreetMap under ODbL; the reference layer
credits ICGC, OpenMapTiles and OpenStreetMap contributors in the map.

Refresh by capturing only the allowlisted coordinates through the public v2
endpoint, validating WebP dimensions and preserving exact bytes. Use a new dated
directory and `ICGC_BOOTSTRAP_VERSION`; regenerate the checksum manifest and run
the bootstrap unit and browser tests. Do not overwrite immutable asset URLs or
expand the set without measuring actual opening-view demand.
