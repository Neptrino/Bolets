# External data licences

Application source code and external datasets have separate rights. A repository code licence does not relicense source data.

## FungaCAT through GBIF

- Dataset: **FungaCAT: Banco de datos de los hongos de Cataluña**
- Publisher: Banc de dades de biodiversitat de Catalunya
- GBIF dataset key: `8583f4f6-f762-11e1-a439-00145eb45e9a`
- DOI: [10.15468/ttivpp](https://doi.org/10.15468/ttivpp)
- Dataset page: [GBIF](https://www.gbif.org/dataset/8583f4f6-f762-11e1-a439-00145eb45e9a)
- Licence: [Creative Commons Attribution-NonCommercial 4.0 International](https://creativecommons.org/licenses/by-nc/4.0/)

The application retrieves occurrence records from the GBIF API for internal/non-commercial and open-source operation. Raw records are not committed or distributed with the source code. The production database stores record identifiers and privacy-safe 10 km support cells, not exact coordinates. Any reuse of the data must preserve attribution and comply independently with the dataset licence; commercial reuse requires separate permission or a differently licensed source.

## Copernicus CLMS soil moisture

- Dataset: **Surface Soil Moisture Europe 1 km Daily v1**
- DOI: [10.2909/e934b15f-7d48-4c6d-a9c6-6484488aa58f](https://doi.org/10.2909/e934b15f-7d48-4c6d-a9c6-6484488aa58f)
- Dataset: **Soil Water Index Europe 1 km Daily v2**
- DOI: [10.2909/709c4b92-a925-4dec-bab2-d110fe97b3c3](https://doi.org/10.2909/709c4b92-a925-4dec-bab2-d110fe97b3c3)
- Provider: Copernicus Land Monitoring Service, implemented by the JRC and EEA on behalf of the European Commission
- Access: [Copernicus Data Space CLMS catalogue](https://documentation.dataspace.copernicus.eu/Data/ComplementaryData/CLMS.html)
- Machine-readable SWI band/flag schema: [CDSE STAC collection](https://stac.dataspace.copernicus.eu/v1/collections/clms_swi_europe_1km_daily_v2_cog)
- Terms: Copernicus products are available free of charge for any purpose, with source/product citation required

The repository contains only the ingestion adapter and source metadata, not the downloaded rasters. Private hot shadow storage retains raw quality and mask values together with product IDs, versions, timestamps, asset provenance, completion state, and 1 km native resolution. Public scores do not currently consume these products. Any derived publication must cite the relevant DOI and identify European Union Copernicus Land Monitoring Service information.

## Météo-France AROME direct WCS shadow

- Dataset: **AROME France 0.01-degree numerical weather prediction fields**
- Provider: Météo-France
- Access: [Météo-France AROME targeted WCS API](https://confluence-meteofrance.atlassian.net/wiki/spaces/OpenDataMeteoFrance/pages/854032416)
- Terms: [Licence Ouverte d’Etalab](https://donneespubliques.meteofrance.fr/?fond=geoservices)

The direct provider stream is an authenticated, private evaluation source. The repository stores request/validation code and source metadata but no credentials or provider files. A named-token Edge Function may retain a bounded single-message GRIB2 response in private object storage with requested model run, valid time, native grid, level, unit, bounds and checksum metadata. GRIB2 framing alone does not verify those requested semantics, which remain explicitly pending until decoded. These objects do not currently populate production weather snapshots or suitability scores. Any derived redistribution must preserve Météo-France attribution and the applicable open-licence notice.

### CDSE access method

The CDSE product-download service does not accept OAuth client-credentials
tokens: they authenticate, but the download endpoint rejects their audience
(`DAT-ZIP-609`). Rasters are therefore fetched as SigV4-signed objects from the
S3-compatible endpoint `https://eodata.dataspace.copernicus.eu` using path-style
addressing (bucket `eodata`, region `default`). Keys are generated per account
at <https://eodata-s3keysmanager.dataspace.copernicus.eu/> and supplied through
`CDSE_S3_ACCESS_KEY` and `CDSE_S3_SECRET_KEY`; they are never committed. STAC
discovery itself needs no credentials.

## Meteocat XEMA station precipitation

- Dataset: **Dades meteorològiques de la XEMA** (semi-hourly automatic-station measurements)
- Dataset page: [Dades Obertes de Catalunya](https://analisi.transparenciacatalunya.cat/Medi-Ambient/Dades-meteorol-giques-de-la-XEMA/nzvn-apee)
- Station inventory: [Metadades estacions meteorològiques automàtiques](https://analisi.transparenciacatalunya.cat/Medi-Ambient/Metadades-estacions-meteorol-giques-autom-tiques/yqwd-vj5e)
- Provider: Servei Meteorològic de Catalunya (Meteocat), Generalitat de Catalunya
- Licence: [Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/)

The application ingests only the semi-hourly precipitation variable (code 35)
collapsed to station hours, as a private shadow stream for validating and
correcting model rain accumulations. Station coordinates are public
infrastructure locations, never ecological sites. Any derived publication must
attribute the Servei Meteorològic de Catalunya as the data source.

## AEMET OpenData daily precipitation (validation only)

- Dataset: **Valores climatológicos diarios**
- Access: [AEMET OpenData](https://opendata.aemet.es/) (free personal API key required)
- Licence: reuse permitted with attribution under AEMET's [legal notice](https://www.aemet.es/es/nota_legal)

AEMET daily gauge values are used only as an independent cross-check inside
the offline station-versus-model comparison CLI when `AEMET_API_KEY` is set.
Nothing from AEMET is stored in the database or shipped with the source code.
Its daily precipitation follows AEMET's climatological day (07:00 to 07:00 UTC),
which the comparison reports as a caveat.
