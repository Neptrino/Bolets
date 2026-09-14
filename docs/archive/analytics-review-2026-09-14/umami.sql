BEGIN READ ONLY;
SET LOCAL statement_timeout = '20s';
WITH e AS (
 SELECT *, CASE WHEN created_at >= '2026-09-07 00:00 Europe/Madrid'::timestamptz THEN 'Sep 7–13' ELSE 'Aug 31–Sep 6' END AS period
 FROM website_event WHERE website_id='ce97249f-b2de-44bd-899c-56f8fc05cb54'
 AND created_at >= '2026-08-31 00:00 Europe/Madrid'::timestamptz AND created_at < '2026-09-14 00:00 Europe/Madrid'::timestamptz
), report AS (
 SELECT 'totals' AS section,period,'pageviews' AS item,count(*) AS events,count(DISTINCT session_id) AS visitors,count(DISTINCT visit_id) AS visits FROM e WHERE event_type=1 GROUP BY period
 UNION ALL SELECT 'pages',period,url_path,count(*),count(DISTINCT session_id),count(DISTINCT visit_id) FROM e WHERE event_type=1 AND url_path IN ('/','/map','/map/cep','/bolets-avui','/zones/ceps','/bolets','/temporada') GROUP BY period,url_path
 UNION ALL SELECT 'referrers',period,coalesce(nullif(referrer_domain,''),'(direct/unknown)'),count(*),count(DISTINCT session_id),count(DISTINCT visit_id) FROM e WHERE event_type=1 GROUP BY period,referrer_domain
 UNION ALL SELECT 'events',period,event_name,count(*),count(DISTINCT session_id),count(DISTINCT visit_id) FROM e WHERE event_type=2 GROUP BY period,event_name
 UNION ALL SELECT 'devices',e.period,s.device,count(*),count(DISTINCT e.session_id),count(DISTINCT e.visit_id) FROM e JOIN session s USING(session_id) WHERE e.event_type=1 GROUP BY e.period,s.device
)
SELECT * FROM report WHERE section!='referrers' OR visitors>=5 ORDER BY section,item,period;
COMMIT;
