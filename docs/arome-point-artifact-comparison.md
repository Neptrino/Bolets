# Offline AROME point-artifact comparison

This diagnostic samples previously downloaded direct Météo-France AROME WCS
GeoTIFFs. It performs no network requests, accepts no provider credentials and
does not update production weather or prediction scores.

Keep the manifest, Capabilities response, three DescribeCoverage responses and
three GeoTIFFs in one directory outside the repository. Keep the private points
file outside the repository too. The command resolves symlinks and rejects any
input whose real path enters the repository.

```sh
npm run weather:compare-arome-artifacts -- \
  --manifest=/absolute/external/arome-artifacts/manifest.json \
  --points-file=/absolute/external/private-points.json
```

The private points file is a non-empty JSON array with at most 20 entries:

```json
[
  { "latitude": 41.0, "longitude": 1.0 }
]
```

An optional private `label` is accepted for compatibility but discarded. Other
fields are rejected. Output deliberately renames entries by order as
`Location 1`, `Location 2`, and so on, and never prints coordinates, source
labels, raster bounds, pixel positions or input paths.

## Artifact manifest

Every artifact reference is a safe path relative to the manifest and a
lowercase SHA-256 digest. The manifest binds the TIFFs to the validated WCS
request metadata saved at download time. All three variables must use one model
run and one valid hour.

```json
{
  "schema": "arome-point-artifacts-v1",
  "runAt": "2026-08-15T03:00:00.000Z",
  "validAt": "2026-08-15T04:00:00.000Z",
  "capabilities": {
    "file": "capabilities.xml",
    "sha256": "<64 lowercase hexadecimal characters>"
  },
  "coverages": {
    "temperature_2m": {
      "description": {
        "file": "temperature_2m.xml",
        "sha256": "<64 lowercase hexadecimal characters>"
      },
      "geotiff": {
        "file": "temperature_2m.tiff",
        "sha256": "<64 lowercase hexadecimal characters>",
        "contentType": "image/tiff",
        "request": {
          "variable": "temperature_2m",
          "coverageId": "<exact CoverageId selected from Capabilities>",
          "runAt": "2026-08-15T03:00:00.000Z",
          "validAt": "2026-08-15T04:00:00.000Z",
          "leadSeconds": 3600,
          "level": { "axis": "height", "value": 2, "unit": "m" },
          "valueUnit": "K",
          "transport": {
            "format": "image/tiff",
            "valueUnit": "C",
            "scaleToDeclaredUnit": 1,
            "offsetToDeclaredUnit": 273.15
          }
        }
      }
    },
    "relative_humidity_2m": {
      "description": { "file": "relative_humidity_2m.xml", "sha256": "<sha256>" },
      "geotiff": {
        "file": "relative_humidity_2m.tiff",
        "sha256": "<sha256>",
        "contentType": "image/tiff",
        "request": {
          "variable": "relative_humidity_2m",
          "coverageId": "<exact CoverageId selected from Capabilities>",
          "runAt": "2026-08-15T03:00:00.000Z",
          "validAt": "2026-08-15T04:00:00.000Z",
          "leadSeconds": 3600,
          "level": { "axis": "height", "value": 2, "unit": "m" },
          "valueUnit": "%",
          "transport": {
            "format": "image/tiff",
            "valueUnit": "%",
            "scaleToDeclaredUnit": 1,
            "offsetToDeclaredUnit": 0
          }
        }
      }
    },
    "wind_speed_10m": {
      "description": { "file": "wind_speed_10m.xml", "sha256": "<sha256>" },
      "geotiff": {
        "file": "wind_speed_10m.tiff",
        "sha256": "<sha256>",
        "contentType": "image/tiff",
        "request": {
          "variable": "wind_speed_10m",
          "coverageId": "<exact CoverageId selected from Capabilities>",
          "runAt": "2026-08-15T03:00:00.000Z",
          "validAt": "2026-08-15T04:00:00.000Z",
          "leadSeconds": 3600,
          "level": { "axis": "height", "value": 10, "unit": "m" },
          "valueUnit": "m s-1",
          "transport": {
            "format": "image/tiff",
            "valueUnit": "m/s",
            "scaleToDeclaredUnit": 1,
            "offsetToDeclaredUnit": 0
          }
        }
      }
    }
  }
}
```

The comparison fails closed unless Capabilities contains a complete common run,
each description retains the exact field, integer lexical height subset, unit,
lead and native 0.01° grid contract. The TIFFs must be aligned single-band,
north-up pixel-point rasters on the Météo-France GRIB geographic sphere. Their
embedded GRIB field, level, unit, reference time, valid time and forecast lead
must match the request. The provider's TIFF transport converts temperature from
Kelvin to Celsius, so the validator explicitly adds 273.15 before checking the
described Kelvin range; humidity and wind require identity conversions. Results
remain an operational forecast shadow diagnostic, not observed weather or a
replacement for the production multi-day hydrothermal model.
