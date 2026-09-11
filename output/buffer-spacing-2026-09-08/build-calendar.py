from pathlib import Path
import json,datetime
from zoneinfo import ZoneInfo
root=Path('.')
audit=json.loads((root/'output/buffer-spacing-2026-09-08/calendar-audit.json').read_text())
posts=[e['node'] for e in audit['posts']['edges'] if e['node']['status']=='scheduled']
titles={
'6aa07c15d50df2c6dc5e7893':'Tres valls del Pirineu · carousel',
'6aa07c02554a8974b1644c88':'El mateix bosc: comparing species · carousel',
'6aa07bef741a08a4a5ba4a87':'Cada bolet, una fitxa · carousel',
'6aa07bdffd7d3172a90b6ba7':'Abans de collir, identifica · Reel',
'6aa07bcbedb8de67a74608d1':'Records de la primavera · photos',
'6aa07bb7c4e8349f29377aa0':'El mateix bosc: species comparison · Reel',
'6aa07bb67082feb000dd5c8f':'El mapa no és un GPS de troballes · carousel',
'6aa07bb47082feb000dd5c2f':'Rovelló, níscalo: names explained · image',
'6aa07bb3c4e8349f29377a7a':'Tallar o arrencar? · image',
'6aa07bb26c58ba7c25f12c8b':'Dissabte. Abans de sortir · Reel',
'6aa07bb17082feb000dd5c00':'Sota les fulles hi ha 62 espècies · Reel',
'6aa07bb006c021630288ba68':'La brossa torna amb tu · carousel',
'6aa07ba3c1d4ab903c885683':'Ripollès i Cerdanya · Reel'}
new={
'2026-09-21':('12:00','Cep negre · species carousel'),
'2026-09-22':('19:00','Ha plogut. Ja val la pena sortir? · practical Reel'),
'2026-09-23':('12:00','Farinera borda · species carousel'),
'2026-09-24':('19:00','Una foto del barret no explica tot el bolet · lesson carousel'),
'2026-09-26':('12:00','Llengua de bou · species carousel'),
'2026-09-28':('12:00','Reig bord · species carousel'),
'2026-09-29':('19:00','Què miro abans de fer quilòmetres? · map Reel'),
'2026-09-30':('12:00','Carlet · species carousel'),
'2026-10-01':('19:00','Làmines, plecs o porus? · lesson carousel'),
'2026-10-03':('12:00','Fredolic · species carousel'),
'2026-10-05':('12:00','Pimpinella morada · species carousel'),
'2026-10-06':('19:00','Quan el mapa té poc senyal, què faig? · practical Reel'),
'2026-10-07':('12:00','Bolet d’olivera · species carousel'),
'2026-10-08':('19:00','El meu bosc, abans de cada sortida · product Reel')}
rows=[]
for offset in range(30):
 d=datetime.date(2026,9,9)+datetime.timedelta(days=offset); iso=d.isoformat(); existing=[]
 for p in posts:
  dt=datetime.datetime.fromisoformat(p['dueAt'].replace('Z','+00:00')).astimezone(ZoneInfo('Europe/Madrid'))
  if dt.date()==d:
   title=titles.get(p['id'],p['text'].split(' (')[0]+' · species carousel')
   existing.append((dt.strftime('%H:%M'),title))
 have='; '.join(t+' '+title for t,title in sorted(existing)) or '—'
 need='—'
 if d.weekday()==4:need='18:00 Conditions Reel · existing automation, generated that day'
 if iso in new: need=' '.join(new[iso])+' · CREATE + SCHEDULE'
 if d.weekday()==6 and iso not in ['2026-09-13','2026-09-20']:need='No new feed post; Stories / replies'
 rows.append(f'| {d.strftime("%a %d %b")} | {have} | {need} |')
body='''# Instagram calendar · 9 September–8 October 2026

Status: editorial plan, prepared 8 September. Existing entries re-read from Buffer after the six spacing changes. New briefs below are not created or scheduled. This rolling month replaces the earlier proposed September 21–October 4 mix with the user's requested species-led cadence. All times Europe/Madrid.

## Calendar

Scheduled column = existing media and bookings confirmed in Buffer. Create + schedule = proposed new content, with final assets/captions still required. Friday automation is a documented existing workflow reservation, not an already-created Buffer item; its output depends on verified current-day data. Keep the existing daily 07:00 conditions Story throughout; it is not repeated in each row.

| Date | Already scheduled in Buffer | To create / planned automation |
| --- | --- | --- |
'''+ '\n'.join(rows)+'''

## Production checklist

- Eight species carousels: Cep negre, Farinera borda, Llengua de bou, Reig bord, Carlet, Fredolic, Pimpinella morada and Bolet d’olivera. Use the existing shared species renderer/template, cited profile, licensed photographs, credits and alt text. Produce and inspect final slides/captions; do not assume a catalogue page is already a finished social asset. Teach distinguishing features and confusions without presenting a carousel as an edibility guarantee or expert sign-off.
- Four Reels: rain/conditions, planning before driving, low-signal readings and El meu bosc. Need a short script, original/licensed footage or current product capture, subtitles, cover, caption and alt text where supported. No invented current readings, outing stories or precise sensitive locations.
- Two educational carousels: observation checklist and underside features. Need source checks, visual examples, final text, credits and alt text. Illustrated assets follow the approved field-guide style; photographic examples retain their actual provenance.
- Four Friday conditions Reels (11, 18, 25 September and 2 October): existing signed workflow. Do not manually duplicate them; missing or stale data means no post. Daily Story also requires current verified data.
- Sundays September 27 and October 4 leave room for responding and Stories. An original photo is optional future work, not an additional promised feed asset.

## Species coverage

The live Buffer sent history contains dedicated guides for two unique species: Cep and Apagallums (including repeated historical entries). Nine distinct guides are scheduled: Ou de reig, Llora verda, Camagroc, Pinetell, Rossinyol, Trompeta de la mort, Cep rogenc, Rovelló and Llenega. A passing caption mention or a field photo does not count as a dedicated guide. This is a Buffer-history audit, not proof that every historical post remains visible on Instagram.

The version-controlled catalogue has 62 species. With the eight new guides, dedicated coverage would reach 19 species: two in sent history, nine currently scheduled and eight proposed. That leaves 43 for later months, assuming the full new batch publishes. Spring-focused species can wait for a more relevant season. Selected autumn timing was checked against data/species.ts: Cep negre, Farinera borda, Llengua de bou and Reig bord build toward October; Carlet, Fredolic, Pimpinella morada and Bolet d’olivera have October activity in their structured calendars. Seasonality is not a prediction of present findings.

## Existing assets that still need editorial attention

- September 9 Ripollès/Cerdanya: old readings described as «avui» need a prominent actual recording date or a verified refreshed asset.
- September 11 «Dissabte» publishes on Friday; consider «Demà, abans de sortir…» in the caption.
- September 19 valley comparison uses September 4 observations; retain that historical date clearly in the visual as well as the caption.

These caption/media changes were not performed while fixing the schedule. The six completed spacing changes are reflected above. All 22 existing posts remain booked; new work comprises 14 manual posts (eight species, two lessons, four Reels). With four conditional Friday automation slots, the calendar contains 40 feed slots, plus daily Stories. The later cadence is three species guides per full week, one Tuesday Reel, one Thursday lesson/product demonstration and the Friday automation.

## References and verification

- [Buffer queue](https://publish.buffer.com/channels/6a960174065799be4662a8f5/schedule), re-read 8 September, 22 scheduled posts; complete returned pagination for sent/scheduled audit.
- Local read-only audit: output/buffer-spacing-2026-09-08/calendar-audit.json. Contains publication history, not access credentials.
- [Operating playbook](instagram-growth-playbook.md), [visual guide](instagram-style-guide.md), [illustrated lessons](instagram-illustrated-carousel-style.md).
- Proposed times are practical editorial slots, not a measured best-time claim. Check the live queue again before creating bookings. Review equal-age performance and paid/organic context before increasing volume.
'''
path=root/'docs/instagram-calendar-2026-09-09-to-10-08.md';path.write_text(body)
idx=root/'docs/README.md';s=idx.read_text();line='| [Monthly content calendar](instagram-calendar-2026-09-09-to-10-08.md) | September 9–October 8: confirmed Buffer posts and species-led production backlog |\n';s=s.replace('## Instagram\n','## Instagram\n')
anchor='| [Operating playbook](instagram-growth-playbook.md) | Publishing, profile, €200 growth ceiling and measurement |\n'
if line not in s:s=s.replace(anchor,anchor+line)
idx.write_text(s)
print('\n'.join(rows))
