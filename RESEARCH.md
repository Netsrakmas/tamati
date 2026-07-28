# Tamati — research

Evidence trail for the spec. Append dated addenda; never overwrite.

---

## Addendum 2026-07-28 (b) — prompt/spec craft, done properly

The first pass at angle 3 was thin: one search, all enterprise "spec for AI agents"
material. This is the practitioner pass, and it turned up two things that change the spec
and one that invalidates a conclusion from addendum (a).

### The workflow practitioners actually converged on

**Harper Reed's LLM codegen workflow** is the most-cited version, and it is nearly the same
shape as `flow` → `idee` → `plan`:

1. **Brainstorm to a spec**, with a specific and widely-copied prompt:
   > *"Ask me one question at a time so we can develop a thorough, step-by-step spec for
   > this idea. Each question should build on my previous answers, and our end goal is to
   > have a detailed specification I can hand off to a developer. Let's do this iteratively
   > and dig into every relevant detail. Remember, only one question at a time."*

   Then: *"…compile our findings into a comprehensive, developer-ready specification.
   Include all relevant requirements, architecture choices, data handling details, error
   handling strategies, and a testing plan…"* → saved as `spec.md`.
2. **Plan** with a reasoning model into `prompt_plan.md` — *the actual prompts for each
   step*, plus `todo.md` for lower-level items.
3. **Execute** in discrete loops, ticking `prompt_plan.md` as it goes.

**What we're missing:** step 2. Our `PROMPT.md` describes milestones but does not contain
a ready-to-run prompt per milestone. That is the artifact that makes the next session cheap.

**Geoffrey Huntley's "Ralph Wiggum" loop** — feed the *same* prompt to an agent repeatedly
until the task completes; progress accumulates in **files and git history, not in the
context window**. Anthropic shipped it as an official plugin in Dec 2025. The principle
matters even if the loop doesn't: durable state belongs on disk.

### The obra/superpowers brainstorming skill (primary source, fetched)

Jesse Vincent's skill encodes rules worth stealing:

- **One question per message.** "If a topic needs more exploration, break it into multiple
  questions." (We bounced 2–3 at a time — faster, and defensible, but noted.)
- **Propose 2–3 approaches with trade-offs**, don't just answer.
- **Present the design in sections, get approval after each**, rather than dumping a spec.
- **No "too simple" exemption:** *"Every project goes through this process. A todo list, a
  single-function utility, a config change — all of them."*
- Hard prohibition on implementing before the design is approved.
- **A spec self-review pass** — inline fixes for **TBDs, contradictions, and ambiguity** —
  before the user reviews it.
- Commit the spec.

**We skipped the self-review.** Running it found two real defects, below.

### Evidence against one giant master prompt

This is the strongest empirical finding, and it validates milestone-gating:

- **Context rot:** Chroma tested **18 frontier models**; *every one* degrades as input
  length grows, well before the window is full.
- **LongMemEval: 30–60% performance gaps** between ~300-token and ~113k-token prompts.
  NIAH-style tasks drop **20–50% from 10k to 100k+ tokens**.
- Coding agents are worst-affected: accumulative context (every file read and tool output
  stays), high distractor density, and long horizons.
- "Agents that found the right code quickly used fewer tokens, accumulated less noise, and
  produced better results."

**Implication:** a single "ultimate prompt" that one-shots a finished product is the wrong
target. The winning shape is a *small, dense spec plus a per-milestone prompt slice*, with
durable state on disk. Our milestone structure is right; our monolithic `PROMPT.md` is not
ideal to load wholesale.

### On examples — our biggest gap

Anthropic's own prompting guidance: **examples are the most reliable way to steer output**;
few-shot/multishot meaningfully improves accuracy and consistency. Practitioner guides
agree that "specific, constrained, example-driven, role-based prompts consistently beat
vague one-liners."

`PROMPT.md` had **zero examples** — only rules and numbers. Fixed in §3.9.

### Why AI-built things come out generic

- Generic output comes from **default prompts and not iterating past the first generation**.
- "AI generates what looks *cool* but doesn't know **why something matters emotionally**";
  art direction is deeply contextual.
- A game's identity comes from **design, mechanics and art direction** — not from whether
  assets were handmade.

This validates the named-anchor style bible and the forbidden list. It also argues the
*emotional* rationale must sit next to each rule, not in a separate document — which is why
§3.5 now carries the "why" inline.

### Meta-prompting

Using the model to write and refine its own prompt is the mainstream 2026 technique;
"example-first" meta-prompting (give input/output pairs, have it reverse-engineer the
instruction set) is the useful variant here. Practically: the spec self-review *is* a
meta-prompting pass, and it should be run every time the spec changes.

### ⚠️ Correction to addendum (a), angle 4

Addendum (a) concluded: *"web-first PWA — the bedtime notification is achievable without a
native build."* **That conclusion was incomplete and is wrong as stated.**

Verified: **Safari on iOS supports Web Push but NOT local scheduled notifications.** The
Notification Triggers API / `TimestampTrigger` is not supported in Safari. "As a web
standards matter, scheduled notifications don't exist in the Notifications API standard."
The recommended approach for iOS PWAs is explicitly **server-based web push**.

So the earlier finding established that push *arrives*; it never asked **who sends it**. A
purely local PWA cannot wake itself at 22:00. The bedtime notification therefore needs
either a push server — which breaks the locked no-backend decision — or a native app.

See PROJECT.md open questions; this is a decision, not something to resolve silently.

### Sources

- [My LLM codegen workflow atm — Harper Reed](https://harper.blog/2025/02/16/my-llm-codegen-workflow-atm/) · [Simon Willison's notes on it](https://simonwillison.net/2025/Feb/21/my-llm-codegen-workflow-atm/)
- [An LLM Codegen Hero's Journey — Harper Reed](https://harper.blog/2025/04/17/an-llm-codegen-heros-journey/)
- [obra/superpowers — brainstorming SKILL.md](https://github.com/obra/superpowers/blob/main/skills/brainstorming/SKILL.md)
- [Ralph Wiggum Loop — prg.sh](https://prg.sh/notes/Ralph-Wiggum-Loop)
- [A Survey of Development Workflows in the Coding Agent Era](https://nyosegawa.com/en/posts/coding-agent-workflow-2026/)
- [Context Rot: Why LLMs Degrade as Context Grows — Morph](https://www.morphllm.com/context-rot)
- [Context Rot in AI Coding Agents — MindStudio](https://www.mindstudio.ai/blog/context-rot-ai-coding-agents-how-to-prevent)
- [Context rot explained — Redis](https://redis.io/blog/context-rot/)
- [Prompting best practices — Claude Platform Docs](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)
- [A Complete Guide to Meta Prompting — PromptHub](https://www.prompthub.us/blog/a-complete-guide-to-meta-prompting)
- [Claude Code In One Shot | Build Production Ready Apps (YouTube)](https://www.youtube.com/watch?v=14K2noGTJ1M) · [Vibe Coding Masterclass (YouTube)](https://www.youtube.com/watch?v=VxD7_MRPebY)
- [Vibe Code an App From Idea to Production in 2026](https://excellentprompts.substack.com/p/vibe-code-app-claude-code-safely)
- [Why AI Content Feels Different in Games Than in Software Development](https://medium.com/@kwonformalverify/why-ai-content-feels-different-in-games-than-in-software-development-63ad7d73712e)
- [Creating Scheduled Push Notifications — CSS-Tricks](https://css-tricks.com/creating-scheduled-push-notifications/)
- [iOS & iPadOS PWA Notifications — Monogram](https://monogram.io/blog/notifications-from-ios-and-ipados-pwas)
- [Upcoming Support for Background Notifications in PWAs on Safari? — Apple Developer Forums](https://developer.apple.com/forums/thread/735402)

---

## Addendum 2026-07-28 — kickoff research (mode A)

Three angles: animation/physics craft, implementation stack, spec craft. Plus a platform
question that turned out to be decisive.

### Angle 1 — How expressive creature animation is actually built

**The anchor is Rain World, and it's an unusually exact match.** Joar Jakobsson's approach:
creatures are **points in space connected at fixed distances**, a "paper doll" of parts
assembled into a shape. The result is soft, bendable, and can deal with any environment.
Notably he arrived at it *because* the problem was "make the limbs move and code is how you
move things" — not as an art-direction choice. Rain World's ~100 creatures share a few base
scripts but are mostly bespoke.

Why this matters for Tamati: grab-and-wiggle is a **runtime physics** requirement. A pet you
can grab, drag, shake and drop cannot be keyframed — the reactions have to be *simulated*.
That single requirement drives the whole architecture (see Angle 2).

**Verlet integration** is the standard technique for the point-mass-plus-constraint model:

- Verlet solves systems of particles and constraints; position-based, stable, cheap.
- **5–15 constraint iterations per frame** is typical for cloth; ropes and chains converge
  faster because the topology is simpler. A creature limb chain is nearer the rope end — 8
  is a reasonable working figure.
- Same family of technique as VRM SpringBone (secondary motion for hair/clothing) and the
  Spider-Man web-swing ropes.

**Squash and stretch**, the governing principle for the comedy:

- Studio guideline is **"feel it, but don't see it"** — the deformation should read at
  playback speed without being separately noticeable. *Tamati deliberately breaks this at
  the baby stage* (comedy wants exaggeration) and converges on it by adulthood. The
  violation is the joke; the convergence is the arc.
- Concrete worked example from sprite practice: a jump anticipation frame at 12–13px tall
  and 1px wider (squash), the launch frame at 15–16px tall and 1px narrower (stretch).
  Roughly **±15–20% on the dominant axis** with inverse compensation on the other.

**Shape language** — this is well-evidenced and directly usable:

- Circles read as friendly, innocent, warm, soft, safe. Sharp angles read as danger
  (fangs, claws); round reads as safe (young animals, fruit).
- **In ~90% of successful mobile games the main character is predominantly round.**
- Silhouette is the first-impression carrier: a good design is legible as a black shape on
  white. This gives a free, cheap acceptance test.

### Angle 2 — Implementation stack

**Decision: procedural code-driven rig, NOT an animation authoring tool.** The reasoning:

| Option | Verdict |
|---|---|
| **Rive** | Genuinely strong for interactive characters — node-based **state machines inside the rig**, parameter-driven transitions, something Spine and DragonBones don't offer. **But:** exporting `.riv` requires a paid plan (**$9/mo** Cadet; editor and runtimes free, exports keep working forever with no runtime fee). A monthly dependency conflicts with this project's "no ongoing obligation" decision — and you re-export constantly during development, so it's a live cost for the whole build, not a one-off. |
| **Spine** | Best-in-class mesh skinning and weight painting; `spine-pixi-v8` is the first spine-ts runtime with WebGPU hardware acceleration. One-time licence fits the ethos better. **But:** no state machine, and it is still a *keyframe* tool. |
| **Custom verlet rig** | **Chosen.** Both of the above are authoring tools for keyframed animation; grab-and-wiggle needs simulation, and you'd be fighting either tool to inject physics into its bones. Rain World's model — a point-mass skeleton with authored *poses* the physics blends toward — gets both, with no vendor and no subscription. |

**Renderer: PixiJS v8.**

- Ground-up rewrite, shipped early 2024, actively maintained through 2026 (v8.16.x).
- WebGPU as a first-class backend alongside WebGL2, with an experimental Canvas2D fallback
  — it picks the best available automatically. **>50% faster than v7, >50% less memory.**
- Render Layers allow draw-order control independent of scene-graph position.

Canvas2D alone would work for one character in one room, but mesh deformation for
squash/stretch is painful by hand, and Pixi's mesh/rope primitives map directly onto a
verlet skeleton.

### Angle 3 — Spec craft for AI-built projects

- Strong specs carry five components: **persona, goal, context, constraints, examples.**
- GitHub Spec Kit enforces a four-phase gated flow (Specify → Plan → Tasks → Implement),
  each phase producing a markdown artifact, keeping *what* settled before *how*.
- The three sections that prevent the most failures: **acceptance criteria with concrete
  inputs and outputs**, **machine-readable input/output contracts**, and an explicit
  **"Not Included" scope boundary**.
- **A singular goal stated in 1–3 sentences is the main defence against an agent
  over-engineering or inventing unrequested features.**
- Validate per milestone, not at the end: code → test → fix → repeat.

Directly applicable: Tamati's "Not Included" list is unusually load-bearing, because almost
every omission (no currency, no score, no streak) is a *thesis commitment* that an agent
would otherwise helpfully add back.

### Angle 4 — Platform (the decisive finding)

The open question was web-first vs native, with the bedtime push notification and the
home-screen widget as the reasons to pay for native. **Web gets one of the two:**

- **Push notifications work on iOS 16.4+** via the Push API and Notification API.
- **Only for home-screen-installed PWAs.** A Safari tab cannot receive push even with
  permission granted. Install is Share → Add to Home Screen, **manual only** — no
  `beforeinstallprompt`, no automatic prompt on iOS.
- All iOS browsers are WebKit by requirement, so the constraint is universal on the
  platform, not a Safari quirk.
- Safari 18.4 added **Declarative Web Push**, which does not require a service worker.

**Conclusion: web-first PWA.** The bedtime notification — a signature mechanic — is
achievable without a native build. The widget is not, and stays parked. The manual-install
requirement is a real funnel cost, but v1 is not chasing installs; it's chasing the
kill-gate.

### What this research changed

1. **Killed the Rive/Spine question before it cost anything.** Grab-and-wiggle mandates a
   simulated rig, so the authoring tools were never the right shape — and the $9/mo would
   have quietly contradicted a locked decision.
2. **Settled the platform.** Web PWA gets the notification; only the widget needs native.
3. **Gave the silhouette acceptance test** — free, objective, catches a class of art failure
   early.
4. **Reframed squash-and-stretch as an arc**, not a constant: break "feel it, don't see it"
   for the baby, converge on it by adulthood. The animation principle *is* the aging curve.

### Sources

- [Video: Animating Rain World and its many squishy, stretchy creatures — Game Developer](https://www.gamedeveloper.com/art/video-animating-i-rain-world-i-and-its-many-squishy-stretchy-creatures)
- [The Rain World Animation Process — Game Anim](https://www.gameanim.com/2017/07/24/rain-world-animation-process/)
- [GDC Vault — Animation Bootcamp: 'Rainworld' Animation Process](https://www.gdcvault.com/play/1023475/Animation-Bootcamp-Rainworld-Animation)
- [Pikuma — Verlet Integration and Cloth Physics Simulation](https://pikuma.com/blog/verlet-integration-2d-cloth-physics-simulation)
- [A Verlet based approach for 2D game physics — GameDev.net](https://www.gamedev.net/tutorials/programming/math-and-physics/a-verlet-based-approach-for-2d-game-physics-r2714/)
- [VRMC_springBone System — DeepWiki](https://deepwiki.com/vrm-c/vrm-specification/3.1-vrm-animation-core-concepts)
- [Squash and Stretch — Animation Mentor](https://www.animationmentor.com/blog/squash-and-stretch-the-12-basic-principles-of-animation/)
- [The 12 animation principles adapted for pixel art sprites — Sprite-AI](https://www.sprite-ai.art/guides/animation-principles)
- [Character Shape Language (2026) — CGWire](https://blog.cg-wire.com/character-shape-language/)
- [Shape Language in Character Design Explained — Pixune](https://pixune.com/blog/shape-language-technique/)
- [PixiJS v8 Launches!](https://pixijs.com/blog/pixi-v8-launches)
- [PixiJS Joins the Spine 4.2 Physics Revolution](https://pixijs.com/blog/pixi-js-hearts-spine)
- [Rive pricing](https://rive.app/pricing) · [Rive's new $9/mo plan](https://rive.app/blog/rive-s-new-9-mo-plan)
- [Compare Rive vs. Spine in 2026 — Slashdot](https://slashdot.org/software/comparison/Rive-vs-Spine/)
- [How to Write a Good Spec for AI Agents — O'Reilly Radar](https://www.oreilly.com/radar/how-to-write-a-good-spec-for-ai-agents/)
- [How to write a good spec for AI agents — Addy Osmani](https://addyo.substack.com/p/how-to-write-a-good-spec-for-ai-agents)
- [PWA iOS Limitations and Safari Support 2026 — MagicBell](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- [Progressive Web Apps in 2026: What Actually Works on iOS and Android — CoderCops](https://blog.codercops.com/blog/progressive-web-apps-2026)
