# Tamati — idea document

**Verdict: BUILD** — as a craft project, explicitly not as a business.
**Date:** 2026-07-28

---

## One-liner

> A virtual pet that's genuinely happy to see you, sleeps when you should, and grows
> from an idiot into a dry old friend. Thirty seconds a day. Then it's over, on purpose.

## Origin

"There's a lot of slop on the phone. There should be something on it that makes you smile."

The deliverable is **a smile, in 30 seconds, on a phone full of slop.** Not a pet sim.
That is the design constraint everything else answers to.

## The thesis

The original Tamagotchi ran on **guilt** — it dies if you neglect it, so you check it
compulsively. Every mechanic here inverts that into **joy**:

| Tamagotchi | Tamati |
|---|---|
| Dies if neglected | Drifts if neglected — gets shy, less expressive. Winnable back. |
| Wants your attention always | Sleeps at night. Actively doesn't want your 2am attention. |
| Nags you | One notification, at bedtime, telling you to put the phone down. |
| Never finishes | Ends after ~30 seconds. On purpose. |

## Signature mechanics

### 1. The greeting scales to absence

The open-the-app reaction is scaled to how long you've been gone:

- 8 hours away → full-body joy, runs at the camera, screen shakes
- 2 hours → happy little bounce
- 4 minutes → looks up, mildly unimpressed, goes back to what it was doing

Compulsive checking gets *less* reward, not more. The ethical stance encoded as an animation.

### 2. Personality ages — clown to deadpan

Growth is **emotional, not statistical**. No XP bar. You know it grew up because it's
different to be around.

| Stage | Tone |
|---|---|
| Baby | No words, pure slapstick. Head stuck in the food bowl. Startles at its own hiccup. |
| Kid | Chaotic, over-enthusiastic, has opinions but stupid ones. Peak animation density. |
| Teen | The turn. Slightly embarrassed by you. Eye-rolls. Still comes — just doesn't run. |
| Adult | Deadpan, dry, tolerates you. Warmth is rare and lands ten times harder for it. |

**The greeting is the instrument that tells this story.** Same beat every time, so change
is legible:

> **Baby:** full-body explosion of joy, trips over itself getting to you.
> **Adult:** glances up. Pause. Small nod. Goes back to what it was doing.

Half a second of animation, months of setup. This is the tell-a-friend moment.

Production bonus: slapstick gets stale and is expensive to keep making; deadpan needs
less animation and more timing. The art budget naturally front-loads.

### 3. The app ends

Feed, clean, play, and then it settles down, yawns, waves — and there is genuinely
nothing left to do. No second tab, no shop, no feed. Sayable in one sentence:
*"it's over in a minute, on purpose."*

### 4. Reaction density over feature count

One pet with 60 animations beats five pets with 12. The art **is** the product; the
mechanics are excuses for the pet to be charming. Cheap smile-per-euro wins:

- tilt the phone, it leans and stumbles
- tap five times fast: giggles → annoyed → walks off
- room light matches the actual time of day
- idle nonsense you weren't looking for: chases dust, falls asleep mid-step, hiccups

---

## Vertical slice (v1 scope)

**In:** one pet · one room · three needs (feed/clean/play) · egg→child→adult ·
absence-scaled greeting · sleep window · tonal aging · the app ends.

**Out, deliberately:**

| Cut | Why |
|---|---|
| Friends / playdates | Needs a backend, accounts, moderation, servers *forever*. Largest cost in the idea; turns a finished project into a permanent obligation. |
| Multiple pets | Chore multiplier. Doesn't serve the smile. |
| Native widget | Earn it. Web build first. |

**Kill-gate before the art commitment:** the whole project rests on one unproven
assumption — that the greeting actually makes people smile. Testable in ~2 weeks with
three animations and no game attached. Build that first. If a stranger doesn't grin at
the baby greeting, nothing downstream saves it.

---

## Sieve findings

### Competitors

| App | Scale | Threat |
|---|---|---|
| **Finch: Self-Care Pet** | ~10M users, **$30–40M ARR**, bootstrapped, 700k+ ratings | Highest. Owns "pet that improves your life." But it's a journalling/habit app in a pet costume — daily goals, streaks, mood logs. It asks you to *do work*. Somewhat slop-shaped itself. |
| **Widgetable** | Peaked **#5 US App Store**, ~1M downloads/mo, ~$200k/mo | The widget-pet is proven and taken. But it's a widget grab-bag — no character, no arc. |
| **Pokémon Sleep** | 20M+ downloads, actively updated | Owns "creature that wants you to sleep well," on the strongest IP on earth. Opposite thesis though: phone on the mattress all night, gacha, grinding. |
| Pou, My Talking Tom, Bubbu, official Tamagotchi, Dogotchi | Massive | Not a quality threat — they *are* the slop. But they own every search term. |

**The specific combination — 30 seconds, ends on purpose, personality ages clown→deadpan
— does not exist.** Every adjacent room is occupied by someone big.

### Is the gap structural or overlooked?

**Structural, twice:**

1. **"The app ends after 30 seconds" is an anti-business model.** Ads need impressions
   need time. IAP needs a shop needs friction. Subscription needs a content treadmill.
   An app that doesn't want your attention can only honestly be sold once, up front —
   and paid-up-front is near-dead, because store ranking runs on download volume and
   volume comes from free. Nobody missed this. They built Finch instead, because Finch
   monetises.

2. **The payoff is months out.** The clown→deadpan arc only lands after weeks. Casual
   mobile D30 retention is ~3–5%, so **~95% of installs never reach the thing that makes
   the app special.** Finch fixes exactly this with streaks and daily tasks — the guilt
   machinery this project exists to avoid. The thesis deliberately disarms the only known
   tool for its own biggest problem.

**Genuinely overlooked:** no one has made a pet whose *personality ages tonally*. Real,
unoccupied, one-sentence hook. Strongest thing in the idea.

### Funnel math (pessimistic; solo dev, no audience, no UA spend, premium €3.99, iOS)

| Step | Count |
|---|---|
| Would-like-it-in-principle audience | ~20M |
| Ever hear it exists, year 1 | ~20,000 |
| Store page → install (paid app, 2–5%) | ~600 |
| Net of Apple's 30% | **≈ €1,700** |

Optimistic branch barely helps: one properly viral TikTok of the nod moment — 2M views
→ 20k store visits → 4% → 800 sales → **≈ €2,200**. A paywall eats virality.
Free-with-unlock lands in the same €1,500–2,500 band.

**This does not pay for itself as a commercial product.** Finch's $30M doesn't refute
that — it shows the entry price for the category is subscription + task system + years
+ a team.

### Cost to build

| Item | Estimate |
|---|---|
| Core loop, offline sim, sleep window, state machine | 1–2 weeks. The easy part. |
| **Animation** | **2–4 months minimum.** 5 stages × distinct silhouettes × 15–25 hand-animated reactions. Slowest, hardest art discipline. Cannot be faked — mediocre animation means zero product. |
| Native iOS (widget + push) | Swift + WidgetKit + review + €99/yr. Skippable for v1. |
| Friend playdates | Backend + accounts + moderation + servers forever. **Cut.** |
| **Ongoing cost, single-player** | **≈ zero.** No server, no API dependency, no content treadmill, no licensing. |

---

## Why "build" despite the funnel

The stated goal was never revenue — it was "there should be something that makes you
smile." Against that goal it survives: a real unoccupied hook, a bounded cost, zero
ongoing obligation, and a success criterion a solo builder can actually hit. Once
finished it can simply *exist*, forever, which almost nothing on mobile can say.

**If the goal ever becomes revenue, this flips to kill immediately.**

---

## Ideas parked (not dead)

- **Sleepover / playdate diary** — send your pet to a friend's overnight; wake to an
  illustrated diary of what they got up to. Makes the night the content engine and the
  reward for going to bed. Unblocked by: a backend being worth the obligation, i.e. v1
  proving people care.
- **Home-screen widget as a still life** — a little framed photo of your pet that changes
  ~6× a day (waking 7am, pottering 10am, napping 2pm, asleep 10pm). Well inside
  WidgetKit's refresh budget precisely *because* it doesn't animate. Unblocked by:
  committing to a native build.
- **Multiple pets as a household** — pet #2 only arrives when #1 is an adult, and the
  adult helps care for the young one. More pets = *less* work. Unblocked by: v1 proving
  one pet holds attention.

## Sources

- [Finch: How a Self-Care App Hit $30M ARR Without VC Money](https://blog.sparrowapps.io/p/finch-how-a-self-care-app-hit-30m-arr-without-vc-money)
- [Finch: Self-Care Pet — Sensor Tower](https://app.sensortower.com/overview/1528595748?country=US)
- [Widgetable — Sensor Tower](https://app.sensortower.com/overview/1641107226?country=us)
- [Are Widgets Making a Comeback? Widgetable is! — Appfigures](https://appfigures.com/resources/insights/20230721/amp?f=2)
- [Pokémon Sleep official](https://www.pokemonsleep.net/en/)
- [Tamagotchi Apps in 2026: Official Picks and Alternatives](https://zen-labo.com/blog/en/tamagotchi-app/)
- [13 Best Virtual Pet Games App for Android & iOS (2026)](https://theninehertz.com/blog/top-apps/best-virtual-pet-games-app-for-android-ios)
