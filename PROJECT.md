# Tamati

**Phase:** 0 — idee (done, verdict: build) → next up phase 1, plan
**Stack:** undecided — web build first (see decisions), native iOS only if v1 earns it
**Repo:** github.com/Netsrakmas/tamati
**Live:** not deployed
**Updated:** 2026-07-28

## One-liner

A virtual pet that's genuinely happy to see you, sleeps when you should, and grows from
an idiot into a dry old friend. Thirty seconds a day. Then it's over, on purpose.

## Phase log

- 0 idee — **done** (verdict: build, as a craft project not a business). See IDEE.md
- 1 plan — not started
- 2 build — not started
- 3 art — not started
- 4 test — not started
- 5 ship — not started

## Open questions

- Platform for v1: browser build (fast, no widget, no push) vs native iOS (widget +
  bedtime notification, much slower). Leaning web until the greeting is proven.
- Art pipeline: hand-animated frames vs skeletal/rigged. Decides whether 60 reactions is
  2 months or 4. Note this is now partly forced — grab-and-wiggle needs a physics rig, so
  a hybrid (rigged body for manipulation, hand-drawn frames for set-piece reactions) is
  the likely answer.
- How much authored content do the adult's routines and projects need before the endgame
  feels alive? Mortality caps this treadmill rather than removing it — it still needs a
  number.
- ~300 visits is a guess, not a finding. The real lifespan number can't be playtested
  honestly at full length; needs a way to validate it (compressed test build?).
- Does mortality change what this project *is*? It promises more than "makes you smile" —
  it promises to make you feel something. Probably an upgrade, but it should be a
  deliberate choice, not a drift.

*(Resolved: adult is not terminal. Elder stage, then death of old age — see decisions.)*

## Decisions locked

- **The deliverable is a smile in 30 seconds, not a pet sim.** Every feature answers to
  this. Depth is not a goal.
- **The app's demands end — the toy doesn't.** Needs are satisfied in ~20 seconds, then
  nothing asks you for anything. Stay and play or close it. No second tab, no shop, no
  feed, no prompt, no badge. The promise is "nothing here will ever ask you for another
  minute," not "you must leave."
- **Props, not minigames. The test: does it produce a score, or a reaction?** Score → cut.
  Score leads to high score leads to coins leads to a shop leads to the app never ending,
  and every step of that staircase feels reasonable at the time. No currency of any kind,
  ever — currency is the single biggest slop vector.
- **The pet is a physical object.** Spring-chain limbs, weight, squash on impact. Grabbing
  and wiggling it is a first-class interaction, and it ages tonally just like the greeting
  does — a second instrument playing the same melody.
- **Needs are not chores.** The moment "play" is a meter you top up, it stops being play.
- **No guilt mechanics.** No death-as-punishment, no streaks held hostage, no "your pet
  misses you!" push. Neglect causes drift, not punishment. This is the whole thesis —
  relitigating it makes the project pointless.
- **Mortality is allowed; punishment is not.** The pet ages into an elder stage and dies
  of old age. Three conditions, all non-negotiable: (1) death is by age alone and neglect
  can never accelerate it — care shapes who they were, never how long they lived;
  (2) generations overlap, so the successor is already present and you are never left with
  an empty room; (3) no notification, no fanfare, no re-engagement — you find out by
  showing up.
- **Lifespan is counted in visits (~300 mornings), not calendar days.** Time only passes
  when you're there. Un-gameable by neglect, and every player gets the full arc at their
  own pace.
- **Personality ages clown → deadpan**, and the greeting animation is the instrument that
  tells that story. This is the signature hook.
- **The aging axis is dependent → independent, NOT loud → quiet.** The adult is dry but
  *busy* — its own project, its own routine, sometimes not even in the room. Building the
  arc as subtraction would mean the reward for months of care is less app, which is
  backwards. Deadpan is a style of reacting, not an absence of reacting.
- **The line continues, the pet doesn't.** Adult → elder → death; the successor it raised
  carries on and eventually raises its own. Traits inherit, so the line accumulates a
  history. One permitted extra screen: a family album — allowed because a memorial asks
  nothing of you. An exception, not a precedent.
- **Cut from v1: friends/playdates, second pet, native widget.** Friends in particular
  means servers forever — that cut is what keeps this project finishable. The second pet
  is different: it's *wanted* (the deadpan adult needs a foil, and the adult does the
  caring so it adds comedy rather than chores) and it's the planned v2 feature. Out of v1
  only because the kill-gate comes first.
- **Not a commercial product.** Funnel math says ~€2k against 3–5 months of animation
  (see IDEE.md). Built because it should exist. If the goal changes to revenue, the
  verdict flips to kill.
- **Kill-gate before the art commitment:** prove the greeting makes a stranger smile with
  ~3 animations and no game attached, before committing months to the full animation set.
