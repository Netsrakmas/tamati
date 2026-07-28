# Tamati — research

Evidence trail for the spec. Append dated addenda; never overwrite.

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
