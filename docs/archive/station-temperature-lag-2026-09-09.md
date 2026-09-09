# Bounded station-publication delay, 9 September 2026

Versioned release evidence for `xema-arome-blend-v2`. The [active procedure](../station-temperature-validation.md) owns the current contract. [Aggregate results and input hashes](station-temperature-lag-2026-09-09.json) contain no finding locations.

## Change

The user authorized up to 12 missing recent station hours. Keep the complete 480-hour model window and require station support for every earlier sample. Only a contiguous trailing gap is allowed. Its means use the model aligned to cell altitude; its heat/frost contributions retain original provider thresholds, without a model-only hourly lapse recount. At least 468 samples remain station-supported. Record the maximum model-only tail across pooled sources in `temperatureModelOnlyHours`. Older holes, longer delays, geographic undercoverage and failed source controls preserve the entire original baseline. Water and ecology priors do not change.

Freeze this state with the publication; late observations do not mutate an existing window. Continue reading complete v1 frozen inputs. The attachment job must advance past already-attached snapshots without waiting for a v2 window that those snapshots do not need.

## Frozen boundary replay

Same 4,816 cells, 137 comparable cross-weather neighbours and previously selected screenshot pair. No new provider requests.

| Simulated missing tail | Pair scores | Mean comparable cross-weather gap | Maximum gap | Gaps ≥20 |
| --- | --- | --- | --- | --- |
| Original AROME | 23 / 60 | 7.401 | 41 | 18 |
| 0 hours | 57 / 59 | 2.153 | 14 | 0 |
| 6 hours | 57 / 59 | 2.161 | 14 | 0 |
| 12 hours | 53 / 59 | 2.474 | 14 | 0 |
| 13 hours | 23 / 60 | 7.401 | 41 | 18 |

Coverage stays at 3,958 blended cells and 858 unchanged fallbacks through 12 hours. The 13-hour case intentionally retains baseline everywhere. The complete-window result reproduces v1 exactly. Smoother selected boundaries do not imply every neighbouring pair improves.

## Findings replay

The standard `weather:evaluate-findings --metrics` passed for 0-, 6- and 12-hour scenarios. The primary comparison collapses species-expanded records into the same 32 positive reports, 96 seasonal background dates and four unsuccessful searches used previously.

| Tail | Positive mean opportunity | Conditions seasonal AUC | Opportunity seasonal AUC |
| --- | --- | --- | --- |
| 0 hours | 49.281 | 0.74821 | 0.70475 |
| 6 hours | 49.281 | 0.74723 | 0.70557 |
| 12 hours | 49.250 | 0.74723 | 0.70622 |

All 596 supported records remain supported; every protected nonthermal component is unchanged. Differences are small and mixed. These reused exploratory findings do not establish equivalence or independent validation.

## Held-out station sensitivity

Remove the last 12 hours of peer observations while retaining the held-out target observations for measurement. These are interval-mean diagnostics with model fallback on identical test hours, not the supported-only metrics from the original report or exact production instantaneous exposure counts.

| Period | Complete-feed MAE | 12-hour-lag MAE | Relevant classification errors, complete → lag |
| --- | --- | --- | --- |
| 20 Aug–8 Sep 2026 | 1.590°C | 1.600°C | Heat 62 → 66 |
| 20 Jul–8 Aug 2026 | 1.577°C | 1.578°C | Heat 58 → 57 |
| 10–29 Jan 2026 | 1.106°C | 1.129°C | Frost 237 → 247 |

The fallback loses a small amount of station information during the delay, as expected, while retaining the preceding supported window.

## Reproduction

Use the commands in the active procedure with `--blend-mode=tapered --station-lag-hours=0`, `6`, `12` or `13` for boundary and finding replays, writing each scenario separately. The station diagnostic accepts `--station-lag-hours=12 --offline`; its `lagSensitivity` reports the additional scenario. All frozen input hashes and aggregate outputs are in the evidence companion. Detailed finding outputs remain outside the repository.

Focused coverage verifies trailing delays, rejection of older holes and 13-hour delays, source-control fallback, legacy windows, full model windows, correct mean alignment, unchanged provider extremes and public provenance. Unit tests, type checks, lint, build and Edge Function checks are release gates.
