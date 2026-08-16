import { readFileSync } from "node:fs";
const species = JSON.parse(readFileSync("/tmp/species-gates.json", "utf8"));
const SUPPORTED = ["pinedes","boscos de coniferes","fagedes","rouredes","boscos de planifolis",
  "alzinars","suredes","boscos d esclerofil les","matollars","clarianes","vores de bosc",
  "pinedes obertes","prats","pastures","gespes","vores de cami","bosc de ribera","boscos humits"];
const CLASSES = {
  221:['pinedes','boscos de coniferes'], 222:['fagedes','rouredes','boscos de planifolis'],
  223:['alzinars','suredes','boscos d esclerofil les'], 224:['matollars','clarianes','vores de bosc'],
  225:['pinedes','pinedes obertes','boscos de coniferes'], 226:['fagedes','rouredes','boscos de planifolis'],
  227:['alzinars','suredes','boscos d esclerofil les'],
  228:['prats','pastures','gespes','vores de cami','clarianes','vores de bosc'],
  229:['bosc de ribera','boscos humits'],
};
const norm = (v) => v.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const unlocked = (terms) => new Set(Object.entries(CLASSES).filter(([,a])=>a.some(t=>terms.includes(t))).map(([c])=>Number(c)));

let lostAny = 0;
const rows = [];
for (const s of species) {
  // What the shipped gate actually sends.
  const actual = unlocked(s.terms);
  // What an editorial phrase mentions if you scan the WHOLE string for supported terms,
  // not just its first word.
  const generous = new Set(s.terms);
  for (const raw of s.forestTypesRaw) {
    const n = norm(raw);
    for (const t of SUPPORTED) if (n === t || n.includes(t)) generous.add(t);
  }
  const gen = unlocked([...generous]);
  const missed = [...gen].filter((c) => !actual.has(c));
  if (missed.length) {
    lostAny++;
    const missedTerms = [...generous].filter(t => !s.terms.includes(t));
    rows.push(`${s.speciesId.padEnd(28)} unlocked=${[...actual].sort().join(",")||"-"}  MISSED=${missed.sort().join(",")}  droppedTerms=${JSON.stringify(missedTerms)}  raw=${JSON.stringify(s.forestTypesRaw)}`);
  }
}
console.log(rows.join("\n"));
console.log(`\nspecies losing >=1 land-cover class to first-word truncation: ${lostAny}/${species.length}`);
