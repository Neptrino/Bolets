# Homepage video engagement

Read from the authenticated Bolets Umami dashboard on 6 September 2026. All work remains local; no product or analytics settings changed.

## Last seven days

The [traffic report](https://analytics.bolets.app/websites/ce97249f-b2de-44bd-899c-56f8fc05cb54?date=7day) showed 230 visitors to `/`. Event-filtered reports distinguish visitors from repeated events:

| Action | Umami visitors | Event occurrences |
|---|---:|---:|
| [Video started](https://analytics.bolets.app/websites/ce97249f-b2de-44bd-899c-56f8fc05cb54/events?date=7day&event=eq.homepage-video-play) | 13 | 46 |
| [Video completed](https://analytics.bolets.app/websites/ce97249f-b2de-44bd-899c-56f8fc05cb54/events?date=7day&event=eq.homepage-video-complete) | 4 | 5 |
| [Homepage map button clicked](https://analytics.bolets.app/websites/ce97249f-b2de-44bd-899c-56f8fc05cb54/events?date=7day&event=eq.homepage-map-cta-click) | 83 | 98 |

As a rough comparison with the homepage audience, these are 5.7%, 1.7% and 36.1%, respectively. They are separately filtered report counts, not a verified sequential funnel. Umami visitor identifiers are not a verified count of distinct people; owner/test traffic was not excluded.

The initial rolling last-24-hours event snapshot showed four video starts, one completion and 35 homepage map clicks. This is a separate window, not evidence of a trend on its own.

## Visibility and tracking limits

The scroll heatmap contained homepage observations from 43 visitors. The selected 360–393 px width group contained 19 sessions: 18 reached the 10% depth band, 10 reached 20%, and seven reached 50%. This is a small sampled group. The displayed page places the video around the first fifth of the page, but its current rendered height differs from the recorded height. These bands cannot establish an exact video-impression denominator.

The current component records `homepage-video-play` only once per mounted player after playback has advanced beyond 0.05 seconds, and records completion once on `ended`. It does not emit dedicated visibility, play-attempt, playback-error or partial-watch events. Low recorded starts therefore do not distinguish lack of exposure, lack of interest and unsuccessful attempts.

Commit `7320b13` changed playback confirmation on 3 September, following playback-control fixes on 2 September. Those commits fall within the seven-day window; their production activation times were not verified. The present local homepage rearrangement has not been deployed, so these results do not measure it.

## Recommendation

The video has a small audience, while the homepage map action attracts substantially more visitors. Preserve the video as an optional “Bolets en 48 segons” action or a compact section on a how-it-works page, and use the main homepage space for the prediction preview and reference discovery. Do not treat 46 play occurrences as 46 viewers or discard the video as having no audience.

This is a recommendation only. No video removal or tracking change was implemented during this review.
