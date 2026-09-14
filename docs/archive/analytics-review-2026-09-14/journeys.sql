BEGIN READ ONLY;
SET LOCAL statement_timeout='20s';
WITH e AS (
 SELECT *, CASE WHEN created_at >= '2026-09-07 00:00 Europe/Madrid'::timestamptz THEN 'Sep 7–13' ELSE 'Aug 31–Sep 6' END AS period
 FROM website_event WHERE website_id='ce97249f-b2de-44bd-899c-56f8fc05cb54' AND created_at >= '2026-08-31 00:00 Europe/Madrid'::timestamptz AND created_at < '2026-09-14 00:00 Europe/Madrid'::timestamptz
), v AS (
 SELECT period,visit_id,min(created_at) FILTER(WHERE event_type=1) AS first_view,
 (array_agg(referrer_domain ORDER BY created_at) FILTER(WHERE event_type=1))[1] AS entry_referrer,
 bool_or(event_name='map-cell-click') AS map_click,bool_or(event_name='map-timeline-used') AS timeline,
 min(created_at) FILTER(WHERE event_name='signup-started') AS signup_start,
 max(created_at) FILTER(WHERE event_name='user-signup') AS signup_end,
 bool_or(event_type=1 AND (url_path='/map' OR url_path LIKE '/map/%')) AS map_view,
 count(*) FILTER(WHERE event_type=1) AS views
 FROM e GROUP BY period,visit_id
)
SELECT period,CASE WHEN entry_referrer LIKE '%instagram.com' THEN 'Instagram' WHEN entry_referrer='google.com' THEN 'Google' ELSE 'Other/direct' END AS source,
 count(*) FILTER(WHERE first_view IS NOT NULL) AS entry_visits,
 count(*) FILTER(WHERE first_view IS NOT NULL AND map_view) AS visits_with_map,
 count(*) FILTER(WHERE first_view IS NOT NULL AND map_click) AS visits_with_cell_click,
 count(*) FILTER(WHERE first_view IS NOT NULL AND timeline) AS visits_with_timeline,
 count(*) FILTER(WHERE first_view IS NOT NULL AND signup_start IS NOT NULL) AS visits_with_signup_start,
 count(*) FILTER(WHERE first_view IS NOT NULL AND signup_end>=signup_start) AS ordered_signup_completions
 FROM v GROUP BY period,source ORDER BY source,period;
SELECT (created_at AT TIME ZONE 'Europe/Madrid')::date AS day,count(lcp) AS lcp_samples,round(percentile_cont(.75) WITHIN GROUP(ORDER BY lcp)::numeric) AS lcp_p75_ms,count(inp) AS inp_samples,round(percentile_cont(.75) WITHIN GROUP(ORDER BY inp)::numeric) AS inp_p75_ms
FROM website_event WHERE website_id='ce97249f-b2de-44bd-899c-56f8fc05cb54' AND created_at >= '2026-09-07 00:00 Europe/Madrid'::timestamptz AND created_at < '2026-09-14 00:00 Europe/Madrid'::timestamptz AND (url_path='/map' OR url_path LIKE '/map/%') GROUP BY day ORDER BY day;
COMMIT;
