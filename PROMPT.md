# Tamati — master prompt / build spec

**Status:** v1 spec, locked 2026-07-28. Milestones tracked live in this file — tick each
box when its gate passes.

---

## 0. How to use this document

**Do not load this whole file to build one milestone.** Chroma tested 18 frontier models
and every one degrades as input grows, well before the window is full; LongMemEval shows
**30–60% gaps** between short and long prompts, and coding agents are the worst-affected
case. A single "ultimate prompt" that one-shots a finished product is the wrong target.

Load: **§1 mission + §2 constraints + §3 style bible + §5 forbidden + the one milestone
you're building.** Skip the rest. Durable state lives on disk (this file, `PROJECT.md`,
git history), not in a context window.

**Tick the milestone box when its gate passes.** That is the hand-off between sessions.

## 1. Mission

> Build **Tamati**: a virtual pet that is genuinely happy to see you, sleeps when you
> should, and grows from an idiot into a dry old friend. Thirty seconds a day, then the
> app stops asking for anything.

The deliverable is **a smile in 30 seconds on a phone full of slop.** Not a pet sim. Depth
is not a goal; expressiveness is. When any decision is ambiguous, choose the option that
produces a better *reaction*, not the option that produces more *game*.

Background and rationale live in `IDEE.md`. Locked decisions live in `PROJECT.md`. This
document says what to build.

## 2. Hard tech constraints

| Constraint | Value | Why |
|---|---|---|
| Stack | **Vite + TypeScript + PixiJS v8** | v8 is a ground-up rewrite, WebGPU + WebGL2 with Canvas2D fallback, auto-selected; >50% faster and >50% less memory than v7. Mesh/rope primitives map onto a verlet skeleton. |
| Animation | **Custom verlet rig. No Rive, no Spine, no authoring tool.** | Grab-and-wiggle is a *simulation* requirement — it cannot be keyframed. Authoring tools are keyframe tools; you'd fight them to inject physics. Also avoids Rive's $9/mo export dependency, which contradicts the no-ongoing-obligation decision. |
| Delivery | **Native iOS app via Capacitor**, wrapping the same web build | Decided 2026-07-28. iOS has no local *scheduled* web notifications, so a PWA could not send the bedtime push without a server. Capacitor gets local notifications with **no server at all**, and unlocks the widget. A Swift rewrite was rejected: it discards the rig, the greeting and the tests to re-earn working mechanics. |
| Dev surface | **The web build stays the primary one.** `npm run dev` on any OS. | Capacitor wraps `dist/`. Nothing about day-to-day iteration changes, and the browser harness keeps working. |
| Notifications | `@capacitor/local-notifications`, rescheduled on each open | Local, not push. Do **not** use the plugin's `repeats` flag — daily-at-a-fixed-time is thinly documented and reported unreliable on iOS. |
| Persistence | `localStorage`, versioned schema with migration | No accounts, no backend, no network. Ever, in v1. |
| Backend | **None.** | Locked, and now genuinely achievable — this was the whole reason native beat PWA-plus-push-server. |
| Target | Mobile portrait first; 60fps on a 2020-era mid-range phone | |

No network requests at runtime beyond the initial asset load. No analytics. No telemetry.

## 3. Style bible — LOCKED

Do not deviate. Do not "improve" the palette. Every colour below is a `const`, defined once
in `src/style/palette.ts`, referenced by role name, never inlined as a literal.

### 3.1 Anchors (named, not adjectival)

- **Rain World** — for creature *motion* only. Point-mass skeleton, soft bendable bodies.
  Explicitly **not** its palette or its bleakness.
- **A Short Hike** — for warmth and low-key cosiness.
- **Untitled Goose Game** — for clean flat shapes and comic timing.
- **Alto's Odyssey** — for calm gradient light and silhouette clarity.
- **Kirby** — for round-shape appeal and squash-and-stretch confidence.

Anti-anchors, to be actively avoided: My Talking Tom, Pou, and the free-to-play virtual pet
aesthetic generally — high-saturation, glossy bevels, sticker UI, exclamation marks.

### 3.2 Palette

```ts
// src/style/palette.ts — LOCKED
export const PALETTE = {
  roomDay:    0xF5EBDA,  // warm cream, 07:00–17:00
  roomDusk:   0xE3C3A3,  // amber, 17:00–21:00
  roomNight:  0x333F52,  // deep blue-grey, 21:00–07:00
  floorDay:   0xE0CFB4,
  floorNight: 0x232B3A,

  petBody:    0x7FC4B0,  // dusty teal — reads on cream AND at night
  petShade:   0x5FA694,
  petBelly:   0xA8DCCB,
  petInk:     0x2B3A38,  // eyes, mouth. warm near-black, never pure #000
  petBlush:   0xE8927C,

  accentFood: 0xE8925C,
  accentToy:  0xE2647A,

  uiText:     0x4A4238,
  uiMuted:    0x9A8F80,
} as const
```

Rules: no pure black, no pure white, no gradient on the pet itself (gradients live in the
room light only), max **two** accent hues on screen at once.

### 3.3 Shape language

Round-dominant throughout — circles read as safe, warm and approachable, and ~90% of
successful mobile game protagonists are predominantly round. The **arc is expressed as
proportion drift**, never as a new character:

| Stage | Head : total height | Silhouette note |
|---|---|---|
| Baby | **55%** | Three circles. No neck. Limbs are nubs. Eyes wide-set, 22% of head width. |
| Kid | 45% | Body elongates. Limbs gain a joint. |
| Teen | 38% | Longer limbs, forward-leaning posture, eyes narrow to 17%. |
| Adult | **33%** | Spine straightens. Still round-dominant, but settled. |

**Silhouette test (acceptance criterion, not a suggestion):** each stage must be
identifiable as a solid black shape on white at **64×64px**. If two adjacent stages are
indistinguishable as silhouettes, the design has failed.

### 3.4 Motion constants

All tunables live in one block: `src/style/motion.ts`. Nothing below may be hardcoded
elsewhere.

```ts
export const RIG = {
  fixedStepHz: 60,
  constraintIterations: 8,   // chain topology converges faster than cloth (5–15)
  damping: 0.96,
  gravity: 1400,             // px/s²
  maxStretchRatio: 1.4,      // per bone, vs rest length
  grabSpringK: 0.35,
}

export const SQUASH = {
  // "feel it, don't see it" is the studio rule. Baby BREAKS it on purpose — the
  // exaggeration is the joke. Adult converges on it. The principle IS the aging curve.
  baby:  { landY: 0.70, landX: 1.30 },
  kid:   { landY: 0.78, landX: 1.18 },
  teen:  { landY: 0.86, landX: 1.10 },
  adult: { landY: 0.92, landX: 1.05 },
  recoverMs: 180,
  overshoot: { y: 1.06, x: 0.95 },
}

export const IDLE = {
  breathHz: 0.6,
  breathAmp: 0.03,           // ±3% scaleY
  blinkEveryMs: [3000, 7000],
  blinkDurMs: 120,
}
```

### 3.5 The greeting — absence tiers

The signature mechanic. Computed from `now - lastSeen`, deterministic, no randomness in
tier selection.

| Absence | Reaction | Duration |
|---|---|---|
| < 5 min | Glances up. Unimpressed. Returns to what it was doing. | 400 ms |
| 5–60 min | Small bounce in place. | 900 ms |
| 1–6 h | Happy trot toward camera. | 1600 ms |
| > 6 h | Full-body joy: runs at camera, **screen shake 6px over 300ms**. | 2200 ms |
| > 72 h | Drift state: hesitant approach first, then joy. Slower, recovering. | 2600 ms |

Compulsive checking must receive **less** reward, never more. This is non-negotiable — it
is the ethical stance encoded as an animation.

Tonal aging applies to every tier. Same beat, four readings:

- **Baby:** full-body explosion, trips over itself getting to you.
- **Adult:** glances up. Pause. Small nod. Returns to its business.

### 3.6 Grab-and-wiggle

Second signature mechanic, and the reason for the custom rig. The pet is a **physical
object**: real weight, spring-chain limbs, squash on impact. Grab it, drag it, shake it,
drop it. The physics author the reactions — do not keyframe them.

It ages too, same melody:

| Stage | Response to being grabbed and shaken |
|---|---|
| Baby | Shrieks with delight. Flails. Wants more the instant you stop. |
| Kid | Giggles → dizzy → staggers off. |
| Teen | Goes rigid. *"...put me down."* |
| Adult | Goes completely limp. Stares at you. Waits. Does not dignify it. |

### 3.7 Needs, and how they must NOT feel

Three needs: **feed, clean, play.** Each satisfied in **exactly one interaction**. Decay
tuned so a single daily visit fully resolves all three.

- **Never shown as a number, meter, bar, or percentage.** State is communicated visually
  only: it looks grubby, its tummy rumbles, it noses the ball toward you.
- The moment "play" becomes a meter you top up, it stops being play. If in doubt, make it
  softer.

### 3.8 Sleep window and "the demands end"

- Default sleep **22:00–07:00 local.** Configurable in one place, `SLEEP_WINDOW`.
- Opening during sleep: the pet stirs, mumbles, opens one eye, settles. **Nothing to do.**
  Not a lockout screen, not a punishment — just a sleeping animal.
- After needs are met (~20s), the pet settles and **nothing asks for anything**. The player
  may stay and play with the toy indefinitely. The app never prompts, never badges, never
  suggests.

The promise is *"nothing here will ever ask you for another minute"* — **not** *"you must
leave."*

### 3.9 Worked examples

Anthropic's own guidance is that **examples are the most reliable way to steer output** —
more reliable than rules. This section had nothing in it for the first two sessions, which
was the single biggest weakness in the spec. Judgement calls should be resolved by
matching these, not by re-reading the rules.

**The test to apply to any new idea: does it produce a score, or a reaction?**

| ✅ Do this | ❌ Not this |
|---|---|
| Tap it five times fast → it giggles, then gets annoyed, then walks off | Tap it five times fast → "+5 happiness!" floats up |
| It's grubby, so it noses the sponge toward you | A cleanliness bar sits at 40% |
| You've been gone 8 hours → it runs at the camera and the screen shakes | You've been gone 8 hours → "Welcome back! You've earned 3 coins" |
| Post-care, it settles down and nothing happens | Post-care, "Play a minigame to earn treats?" |
| It found a bottle cap and left it by the door for you | Daily login reward: 1× bottle cap |
| One notification, 22:00: *"Tamati went to sleep."* | "Tamati misses you! Come back 😢" |
| Adult greeting: glances up, pause, small nod | Adult greeting: same joyful run as the baby, but slower |

**Tone by stage — the same event, four readings.** Getting picked up:

> **Baby:** shrieks, flails, wants more the instant you stop.
> **Kid:** giggles, gets dizzy, staggers off into a wall.
> **Teen:** goes rigid. *"...put me down."*
> **Adult:** goes completely limp. Stares at you. Waits. Does not dignify it.

**Code style — tunables are named and centralised, never inline:**

```ts
// ✅
if (this.rig.landImpact > SQUASH.triggerImpact) this.squashT = 0

// ❌ — a magic number nobody can find or tune later
if (this.rig.landImpact > 6) this.squashT = 0
```

**Comment the *why*, especially the emotional why.** Generic output comes from rules
without rationale; art direction is contextual, and the reason is what carries it:

```ts
// ✅
// Compulsive checking must receive LESS reward, never more. That is the ethical
// stance encoded as an animation, and it's why this is pure and property-tested.

// ❌
// Returns the greeting tier.
```

## 3.10 Spec self-review

The `superpowers` brainstorming skill ends with a self-review for **TBDs, contradictions
and ambiguity** before the human ever reads the spec. We skipped it originally. Run it
after every substantive change. The first run found two real defects:

**① ~~The bedtime notification contradicts the no-backend decision.~~ RESOLVED
2026-07-28.** Safari on iOS supports Web Push but not local *scheduled* notifications, so a
PWA could not wake itself at 22:00 without a server. Resolved by going native via
Capacitor: `@capacitor/local-notifications` schedules locally with no server, so the
no-backend lock survives. M6 unblocked, and the widget is unblocked as M8.

**② Visits were countable by refreshing.** "Lifespan is counted in visits, un-gameable by
neglect" was true, but the reverse was wide open: `visits += 1` on every launch meant 300
reloads aged the pet to adulthood in an afternoon. Fixed — a visit now counts only at
greeting tier `trot` (1h+) or better, so reopening twice in a minute is one visit.

**Known-and-accepted overlap:** M1's gate lists A6 (offline), which needs a service
worker, while M6 owns "installable PWA". A minimal service worker ships in M1; M6 adds
install polish, schema migration and push. Deliberate, not an oversight.

## 4. Architecture

```
src/
  main.ts                 // bootstrap, Pixi app, fixed-step loop
  style/palette.ts        // LOCKED colours
  style/motion.ts         // LOCKED tunables
  rig/verlet.ts           // point masses + distance constraints
  rig/skeleton.ts         // pet skeleton definition per life stage
  rig/poses.ts            // authored target poses the sim blends toward
  pet/state.ts            // needs, mood, drift, life stage
  pet/greeting.ts         // absence tier → reaction selection
  pet/behaviours.ts       // idle nonsense, adult agenda
  room/scene.ts           // room, floor, time-of-day light
  time/clock.ts           // real time, sleep window, visit counting
  persist/store.ts        // versioned localStorage schema + migration
```

**Rig model (Rain World's, adapted):** a skeleton of point masses connected at fixed
distances — a soft, bendable paper-doll. Authored *poses* provide targets; the verlet sim
blends toward them and handles all secondary motion. Fixed 60Hz step, decoupled from render
frame rate. Never run physics on a variable delta.

**Determinism:** given a fixed `lastSeen` and `now`, greeting tier selection must be pure
and testable. Idle nonsense may be random; nothing load-bearing may be.

## 5. Forbidden — the "Not Included" boundary

Every item here is a **thesis commitment**, not an oversight. A helpful agent will try to
add these back. Do not.

- ❌ **No currency of any kind.** No coins, gems, tickets. Currency needs a shop, a shop
  needs browsing, browsing means the app never ends. This is the single biggest slop vector.
- ❌ **No score, high score, leaderboard, or rank.**
- ❌ **No streak counter**, no "day 14" badge, no calendar of shame.
- ❌ **No minigames.** The test for every play idea: *does it produce a score, or a
  reaction?* Score → cut. Reaction → it's a prop, and props are fine.
- ❌ **No visible meters, bars, percentages, or numeric stats.** None.
- ❌ **No ads. No IAP. No paywall. No subscription.**
- ❌ **No "your pet misses you" notification.** Exactly **one** push exists: *"Tamati went
  to sleep."* at bedtime. Its entire purpose is to tell you to put the phone down.
- ❌ **No death from neglect.** Neglect causes *drift* — shyness, reduced expressiveness —
  and is fully recoverable. (Mortality from old age is a v3 feature and is out of v1 scope.)
- ❌ **No second tab, no shop, no feed, no settings sprawl.** One screen.
- ❌ **No timers or countdowns gating an action.**
- ❌ **No badge counts, no red dots, no dark patterns.**
- ❌ **No accounts, no backend, no network at runtime, no analytics.**
- ❌ **Out of v1 scope entirely:** friends/playdates, second pet, elder stage, death,
  inheritance, family album, native widget.

## 6. Acceptance criteria

Self-checkable. Each is pass/fail, not a judgement call.

| # | Criterion |
|---|---|
| A1 | **60fps sustained** on a 2020-era mid-range phone. Frame budget 16ms; rig step < 2ms. |
| A2 | **Zero console errors or warnings** during a 5-minute session including grab, drop, feed, clean, play, sleep-window entry. |
| A3 | **Deterministic greeting:** fixed `lastSeen` + fixed `now` → same tier, every time. Unit-tested. |
| A4 | **Cold start to first greeting frame < 1.5s** on a mid-range phone. |
| A5 | **Silhouette test:** every life stage identifiable as black-on-white at 64×64px, and distinguishable from its neighbours. |
| A6 | **Fully offline** after first load. Airplane mode: everything works. |
| A7 | **No forbidden-list item present.** Grep the codebase for `coin`, `score`, `streak`, `gem`, `shop`, `level`, `xp` — zero hits outside comments. |
| A8 | **Needs resolve in one interaction each**, and a single daily visit fully clears all three. |
| A9 | **Absence monotonicity:** longer absence never produces a smaller reaction. Property-tested across the tier boundaries. |

## 7. Milestone build order

Tick each box when its gate passes. **An unticked box on finished work costs an hour next
session** — this is the hand-off mechanism between chats.

- [ ] **M1 — The kill-gate: greeting + wiggle, baby only.** ← *built; human gate outstanding*
      Vertical slice. Baby stage only. Absence-tiered greeting backed by persisted
      `lastSeen`. Full verlet rig with grab, drag, shake, drop. A floor and a background.
      **No needs, no growth, no props, no room dressing.**
      *Gate:* A1, A2, A3, A4, A6, A9 pass **and** — the real test — five people are handed
      the phone cold, and **at least three visibly smile or laugh unprompted.** If that
      fails, stop. Nothing downstream saves it, and this is the cheapest possible place to
      learn it.

      **Status 2026-07-28.** Code complete. `npm test` → 24 unit tests green
      (A3, A9, rig invariants, shake detector). `npm run verify` → 17/17 browser checks
      (A2 clean console, A4 807ms cold start, A6 offline, grab/drag verified).
      **Two gates could not be judged in a container with no GPU** and are honestly
      unverified rather than passed:
      - **A1 raster frame rate.** WebGL runs on SwiftShader (CPU). Measured 8fps, which
        says nothing about a real device. What *is* portable — our own sim+draw cost —
        is **0.28ms mean, 3.8ms worst of a 16ms budget**, so the app's own work is not
        the risk. Needs one run on real hardware.
      - **Shake gesture end-to-end.** The saturated main thread samples pointer events at
        ~5Hz; detecting a 4Hz shake needs >8Hz (Nyquist). The detector itself is covered
        by `tests/shake.test.ts` at 30/60/120/240Hz plus negative cases.
      - **The human gate has not been run.** Five people, three smiles. This is the actual
        kill-gate and the box stays unticked until it happens.

- [ ] **M2 — Needs and the room.**
      Feed, clean, play. One interaction each, no meters. Props: bowl, sponge, ball. Room
      with time-of-day light (day/dusk/night gradients).
      *Gate:* A8 passes; a full care cycle completes in ≤ 30s; no numeric UI anywhere.

- [ ] **M3 — Sleep window and the settle state.**
      22:00–07:00 sleep. Stir-and-settle on opening during sleep. Post-care settle state
      where nothing asks for anything.
      *Gate:* Opening at 02:00 offers no action and no guilt; after care, zero prompts fire
      for 10 minutes of idle observation.

- [ ] **M4 — Growth and tonal aging.**
      Baby → kid → teen → adult, driven by visit count. Greeting and wiggle both re-read
      per stage. Squash constants converge toward "feel it, don't see it".
      *Gate:* A5 passes; the four greetings and four wiggle responses are distinguishable
      side by side with no labels.

- [ ] **M5 — The adult's agenda.**
      A project in the corner that progresses over weeks. A daily routine. Occasional
      absence from the room, returning with something. Brings and leaves things.
      *Gate:* Ten consecutive adult-stage opens produce no repeated behaviour; the room is
      never empty of activity.

- [ ] **M6 — Native shell, persistence, and the one notification.**
      Capacitor iOS project. Versioned save schema with migration. The single bedtime
      **local** notification, rescheduled on every open (never `repeats`).
      *Scheduling logic and its tests already exist* — `src/notify/bedtime.ts`,
      `tests/bedtime.test.ts`. What remains is Mac-side (see §9).
      *Gate:* offline cold start works; a v1 save file loads under a v2 schema; the
      notification fires once at 22:00 on a real device; **no other notification exists in
      the codebase**; and **A1 re-measured inside WKWebView** — if WebGL is degraded there,
      force PixiJS's Canvas2D backend and re-measure.

- [ ] **M8 — The widget.** *(unblocked by going native; do not start before M7)*
      A still life, not a screen: a little framed photo of the pet that changes ~6× a day
      (waking 07:00, pottering 10:00, napping 14:00, asleep 22:00). It does not animate,
      which is exactly why it fits inside WidgetKit's refresh budget.
      Recipe: `capacitor-widget-bridge` writes state to shared UserDefaults via an **App
      Group**, then calls `reloadAllTimelines()`; a SwiftUI Widget Extension reads
      `UserDefaults(suiteName:)`.
      *Gate:* widget shows the correct state for each of the four day phases; refreshes
      stay within budget; app and widget never disagree about whether the pet is asleep.

- [ ] **M7 — Polish pass.**
      Named-aesthetic transform against the anchors. Audio, haptics, easing review.
      *Gate:* Side-by-side squint test against the anchor references; all acceptance
      criteria A1–A9 green; hand off to `test` for the harness.

## 9. Mac-side steps (cannot be done or verified on Linux)

This repo is developed on Linux; Xcode, CocoaPods, code signing and any real device
measurement are unavailable here. Everything below is deferred, not forgotten. **No Swift
has been written yet** — writing code that cannot be compiled or run would be worse than
leaving a recipe.

1. `npx cap add ios` — generates `ios/`, needs macOS + CocoaPods.
2. Open in Xcode, set the team and bundle id (`blog.tamati.app`).
3. M6: verify the notification permission prompt and that 22:00 actually fires.
4. M6: re-measure A1 in WKWebView. Watch for the **"GPU Process: Canvas Rendering"**
   regression — a Phaser game went 60fps→30fps on iOS 15 from it. Fall back to Canvas2D
   if needed.
5. M8: add the **App Groups** capability to the app target, add a **Widget Extension**
   target, share the group id with `capacitor-widget-bridge`.
6. Apple Developer Program, €99/yr, required to run on a device or ship.

## 8. Open questions (do not silently resolve — flag them)

- Visits-per-life-stage pacing is unvalidated. ~300 visits to a full life is a guess that
  cannot be honestly playtested at real length. M4 needs a debug time-scale.
- How much authored adult behaviour is enough before M5 feels alive? Needs a number.
- Manual PWA install on iOS is a real funnel cost. Accepted for v1 (not chasing installs),
  revisit if this ever ships properly.
