# Reddit post draft — r/vibecoding, 18 Sept 2026

Title options:
1. I vibe coded a mushroom forecast for a whole region. The code was the easy part.
2. 6 weeks, 397 commits, one agent: the 7 things that actually decided whether the project worked
3. What I learned building a real data product with Claude Code (including the feature with an AUC of 0.84 that made everything worse)

---

I've spent the last six weeks building [bolets.app](https://bolets.app): a mushroom forecast for Catalonia. It takes rain, temperature, frost, soil and habitat data and predicts where and when species are likely to be fruiting, plus a species guide and maps. Solo project, and an agent did most of the typing.

Current state of the repo: 397 commits since 11 August, ~115k lines of TS/TSX, 346 test files. So this isn't a weekend toy, and it also isn't a startup — it's a real thing with real users that I can still get wrong in public.

Here's what actually mattered, in rough order of how much pain it saved me.

**1. The agent will write anything you ask. It cannot tell you whether it's true.**

Almost every modelling idea that *felt* obviously right died the moment I tested it. Heat legacy (hot summers suppress fruiting): looked great, improved one dataset, failed the other, and penalised real finds — rejected. Wind and gust penalties after a blank windy hike: nothing. Matching weather grid points to actual terrain elevation: made predictions measurably worse. A soil-moisture bucket: fully redundant with what the model already had. Frost lag: changed literally nothing.

What saved the project was building a replay harness — my own logged mushroom finds plus a sample of public occurrence records, scored offline — *before* letting the agent tune anything. Vibe coding without a scoreboard is just confident nonsense delivered at speed.

**2. Be very suspicious of a metric that looks amazing on its own.**

I built a "season wetness" feature that scored a standalone AUC of 0.843. Best number I'd seen all month. It correlated 0.55 with a feature the model already had, and every weight I composed it at made the *combined* model worse. Same information, longer smoothing. Killed it.

If you only ever measure a new feature alone, you will ship your own duplicates forever.

**3. Ground truth beats convenient data.**

The weather model I started on was inventing storms that never landed on the actual rain gauges. Switching the pipeline to measured station rain moved accuracy from 0.62 to 0.65 on the spot, and made the later refits possible (now ~0.72). The agent had happily built a whole physical model on phantom rain, because that API was easier to consume. It has no smell for "this number is fictional".

**4. Keep a log of what you've already disproved.**

My notes now contain literal lines like "do not re-propose frost lag" and "do not re-propose wind penalties without new evidence". Without them, every fresh session the agent proposes the same dead idea, with the same enthusiasm and a well-argued case, and I re-run a two-hour experiment I already ran in August.

A rejected-hypotheses file has been worth more to me than any architecture doc.

**5. Tests are the agent's seatbelt, not yours.**

346 test files, and a big chunk exist because something invisible broke: a sitemap date, a species mapping, a page that silently stopped rendering a section. The rule that works: anything that breaks in production becomes a test in the same commit. Otherwise it comes back within a fortnight, because the agent has no memory of the incident and the code looks fine.

**6. "The site is down" usually isn't the site.**

My best wasted hour: production debugging, SSH sessions, container logs — the cause was my own Mac taking a bogus IPv6 default route on Wi-Fi. An agent will cheerfully theorise about your server all afternoon. Check which layer is actually broken before you hand it the keys.

**7. The building was the fastest part of this project.**

After six weeks of shipping: Google rankings went up and clicks stayed flat, because AI Overviews now sit on top of 30 of the 72 queries where I rank in the top ten. Separately, about €25 of Instagram ads took the account from 12 to 511 followers in three days — and the *static image* ad beat the video ads, which is the opposite of what everyone told me.

None of that was work the agent could do for me, and all of it mattered more than any individual feature I shipped.

**If I were starting again**, three rules: build the thing that can prove you wrong before you build the feature; write down every hypothesis you killed and why; and treat an agent's confidence about an *empirical* claim as exactly zero evidence. It's a phenomenal typist and a terrible witness.

Happy to go into the modelling side if anyone's interested — the ecology turned out to be far weirder than the code.
