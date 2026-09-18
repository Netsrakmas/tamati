import { Application, Container, Graphics, Text } from "pixi.js";
import "./style/app.css";
import { PALETTE } from "./style/palette";
import { RIG } from "./style/motion";
import { Rig } from "./rig/verlet";
import { BABY } from "./rig/skeleton";
import { poseTargets } from "./rig/poses";
import { Behaviour } from "./pet/behaviours";
import { PixelPet } from "./pet/render";
import { greetingFor } from "./pet/greeting";
import { PixelRoom, drawShadow, roomColours, timeOfDay } from "./room/scene";
import { makeGround, worldToScreen } from "./world/ground";
import { drawMotes, makeMotes, updateMotes } from "./world/dust";
import { load, save } from "./persist/store";
import { absenceOverrideMs } from "./time/clock";
import { createUI } from "./ui";
import {
  CARE_DURATION,
  careCopy,
  drawCare,
  hasSettled,
  isSleepTime,
  LittleSounds,
  type CareAction,
} from "./pet/care";

const STEP_MS = 1000 / RIG.fixedStepHz;
const STEP_S = STEP_MS / 1000;
async function boot(): Promise<void> {
  const now = Date.now();
  const { save: state, firstRun } = load(now);
  const sounds = new LittleSounds();
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  if (firstRun) state.reducedMotion = motionQuery.matches;
  let activeCare: CareAction | null = null;
  let careTime = 0;
  let idleMessageAt = Infinity;
  let savedOkay = true;
  let ready = false;
  let automaticSleep = isSleepTime(new Date());
  let hiddenAt = 0;
  const persist = () => {
    state.lastSeen = Date.now();
    savedOkay = save(state);
  };
  const ui = createUI(state, {
    care(action) {
      if (!ready || activeCare || behaviour.greetingActive) return;
      release();
      behaviour.startCare(action);
      activeCare = action;
      careTime = 0;
      ui.sleep(false);
      ui.busy(true);
      ui.status(careCopy[action][0]);
      sounds.play(action, state.sound);
    },
    rest() {
      if (!ready || activeCare) return;
      release();
      behaviour.rest(!behaviour.sleeping);
      ui.sleep(behaviour.sleeping);
      ui.status(
        behaviour.sleeping
          ? "A soft little snore. The world can wait."
          : "A big stretch. There you are.",
      );
      idleMessageAt = performance.now() + 6000;
    },
    settings() {
      if (!ready) {
        persist();
        return;
      }
      behaviour.reducedMotion = state.reducedMotion || motionQuery.matches;
      layout();
      persist();
      ui.status(
        savedOkay
          ? "Just right. Make yourself at home."
          : "Your browser couldn’t save this visit. Your friend can still play.",
      );
      idleMessageAt = performance.now() + 5000;
    },
  });
  const mount = document.getElementById("app")!;
  const app = new Application();
  await app.init({
    background: PALETTE.roomDay,
    resizeTo: mount,
    antialias: false,
    // One shared two-CSS-pixel grid, including deformed meshes, shadows and particles.
    resolution: 0.5,
    autoDensity: true,
  });
  mount.appendChild(app.canvas);
  app.canvas.tabIndex = 0;
  app.canvas.setAttribute("role", "button");
  app.canvas.setAttribute(
    "aria-label",
    "Say hello to your companion. Press Enter, or tap and drag to pick them up.",
  );
  const world = new Container();
  app.stage.addChild(world);
  const [room, petArt] = await Promise.all([PixelRoom.load(), PixelPet.load()]);
  const dustG = new Graphics(),
    shadowG = new Graphics(),
    effectsG = new Graphics();
  world.addChild(room, dustG, shadowG);
  const petBox = new Container();
  petBox.addChild(petArt);
  world.addChild(petBox, effectsG);
  let ground = makeGround(app.screen.width, app.screen.height);
  const rig = new Rig(
    BABY.points.map((p) => ({ ...p })),
    BABY.bones.map((b) => ({ ...b })),
    [],
    0,
  );
  rig.pose = poseTargets("idle", (n) => rig.index(n));
  const behaviour = new Behaviour(rig);
  behaviour.reducedMotion = state.reducedMotion || motionQuery.matches;
  motionQuery.addEventListener("change", () => {
    behaviour.reducedMotion = state.reducedMotion || motionQuery.matches;
  });
  const motes = makeMotes();
  behaviour.setMotes(motes);
  let tod = state.light === "auto" ? timeOfDay(new Date()) : state.light;
  function placeRig() {
    const p = worldToScreen(ground, behaviour.world);
    rig.rootX = p.x;
    rig.rootY = p.y;
    rig.floorY = p.y;
    return p;
  }
  function layout() {
    ground = makeGround(app.screen.width, app.screen.height);
    const oldX = rig.rootX,
      oldY = rig.rootY;
    const p = placeRig();
    for (const q of rig.points) {
      q.x += p.x - oldX;
      q.px += p.x - oldX;
      q.y += p.y - oldY;
      q.py += p.y - oldY;
    }
    tod = state.light === "auto" ? timeOfDay(new Date()) : state.light;
    room.layout(ground, tod);
    petArt.tint =
      tod === "night" ? 0xc5c9ef : tod === "dusk" ? 0xffdac1 : 0xffffff;
    app.renderer.background.color = roomColours(tod).sky;
    ui.time(tod);
  }
  layout();
  for (const q of rig.points) {
    const t = BABY.points.find((b) => b.name === q.name)!;
    q.x = q.px = rig.rootX + t.x;
    q.y = q.py = rig.rootY + t.y;
  }
  new ResizeObserver(() => {
    app.resize();
    layout();
  }).observe(mount);

  const override = absenceOverrideMs(location.search);
  let spec = greetingFor(
    override !== null ? now - override : state.lastSeen,
    now,
  );
  behaviour.playGreeting(spec);
  // Preview greetings remain usable at night, without granting artificial lifespan visits.
  if (spec.rank >= 2 && override === null) state.visits += 1;
  if (automaticSleep && override === null) {
    behaviour.rest(true);
    ui.sleep(true);
    ui.status("A soft little snore. The world can wait.");
  } else {
    ui.busy(true);
    idleMessageAt = performance.now() + 8000;
  }

  let pointerDownAt = 0,
    pointerMoved = 0,
    downX = 0,
    downY = 0,
    pointerId: number | null = null;
  function toRigSpace(clientX: number, clientY: number) {
    const rect = app.canvas.getBoundingClientRect();
    const local = petBox.toLocal({
      x: ((clientX - rect.left) * app.screen.width) / rect.width,
      y: ((clientY - rect.top) * app.screen.height) / rect.height,
    });
    return { x: rig.rootX + local.x, y: rig.rootY + local.y };
  }
  function release(cancelled = false) {
    if (rig.grabbed < 0) return;
    rig.grabbed = -1;
    const t = performance.now();
    behaviour.onGrabEnd(t);
    if (!cancelled && t - pointerDownAt < 350 && pointerMoved < 14) {
      behaviour.onTap(t);
      sounds.play("hello", state.sound);
    }
    if (pointerId !== null && app.canvas.hasPointerCapture(pointerId))
      app.canvas.releasePointerCapture(pointerId);
    pointerId = null;
  }
  app.canvas.addEventListener("pointerdown", (e) => {
    if (
      pointerId !== null ||
      e.button !== 0 ||
      activeCare ||
      behaviour.sleeping ||
      behaviour.greetingActive
    )
      return;
    const local = toRigSpace(e.clientX, e.clientY);
    let best = -1,
      bestD = Infinity;
    rig.points.forEach((p, i) => {
      const d = Math.hypot(p.x - local.x, p.y - local.y);
      const hitRadius = p.name === "body" ? 78 : p.radius;
      if (d < hitRadius + 17 && d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best < 0) return;
    pointerId = e.pointerId;
    app.canvas.setPointerCapture(e.pointerId);
    rig.grabbed = best;
    rig.grabX = local.x;
    rig.grabY = local.y;
    pointerDownAt = performance.now();
    pointerMoved = 0;
    downX = e.clientX;
    downY = e.clientY;
    behaviour.onGrabStart();
  });
  app.canvas.addEventListener("pointermove", (e) => {
    if (e.pointerId !== pointerId || rig.grabbed < 0) return;
    pointerMoved = Math.max(
      pointerMoved,
      Math.hypot(e.clientX - downX, e.clientY - downY),
    );
    // Clamp captured drags to the room so a long gesture cannot lose the companion.
    const r = app.canvas.getBoundingClientRect();
    const x = Math.max(r.left + 22, Math.min(r.right - 22, e.clientX));
    const y = Math.max(r.top + 30, Math.min(r.bottom - 35, e.clientY));
    const local = toRigSpace(x, y);
    rig.grabX = local.x;
    rig.grabY = local.y;
    behaviour.dragTo(ground, x - r.left);
    behaviour.onGrabMove(x, performance.now());
  });
  app.canvas.addEventListener("pointerup", (e) => {
    if (e.pointerId === pointerId) release();
  });
  app.canvas.addEventListener("pointercancel", () => release(true));
  app.canvas.addEventListener("lostpointercapture", () => release(true));
  window.addEventListener("blur", () => release(true));
  app.canvas.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      behaviour.onTap(performance.now());
      sounds.play("hello", state.sound);
    }
  });

  let dbg: Text | null = null;
  if (new URLSearchParams(location.search).has("debug")) {
    dbg = new Text({
      text: "",
      style: {
        fill: PALETTE.uiText,
        fontSize: 16,
        fontFamily: "Pixelify Sans",
      },
    });
    dbg.position.set(10, 40);
    world.addChild(dbg);
  }
  let liftPx = 0;
  const hook = {
    ready: false,
    cpuMs: 0,
    get tier() {
      return spec.tier;
    },
    get rig() {
      const r = app.canvas.getBoundingClientRect();
      return rig.points.map((p) => {
        const v = petBox.toGlobal({ x: p.x - rig.rootX, y: p.y - rig.rootY });
        return { name: p.name, x: v.x + r.left, y: v.y + r.top };
      });
    },
    get face() {
      return behaviour.face;
    },
    get greetingActive() {
      return behaviour.greetingActive;
    },
    get grabbing() {
      return behaviour.grabbing;
    },
    get shaking() {
      return behaviour.shaking;
    },
    get shakeFlips() {
      return behaviour.shakeFlips;
    },
    get shakeSampleCount() {
      return behaviour.shakeSampleCount;
    },
    get world() {
      return { ...behaviour.world };
    },
    get walking() {
      return behaviour.walking;
    },
    get lift() {
      return liftPx;
    },
    get idle() {
      return behaviour.idle;
    },
    get tapLevel() {
      return behaviour.tapLevel;
    },
    get sleeping() {
      return behaviour.sleeping;
    },
    get care() {
      return activeCare;
    },
    get motes() {
      return motes.map((m) => ({ x: m.pos.x, y: m.pos.y, life: m.life }));
    },
  };
  (window as unknown as Record<string, unknown>).__tamati = hook;
  let acc = 0,
    clockCheck = 0;
  app.ticker.add((ticker) => {
    const cpu0 = performance.now(),
      dt = Math.min(ticker.elapsedMS, 80),
      t = performance.now();
    behaviour.update(dt, t);
    if (activeCare) {
      careTime += dt;
      if (careTime >= CARE_DURATION[activeCare]) {
        state.care[activeCare] = Date.now();
        ui.status(careCopy[activeCare][1]);
        activeCare = null;
        behaviour.finishCare();
        persist();
        idleMessageAt = t + 6000;
      }
    }
    ui.busy(!!activeCare || behaviour.greetingActive);
    if (t >= idleMessageAt && !activeCare) {
      ui.status(
        !savedOkay
          ? "Your browser couldn’t save this visit. Your friend can still play."
          : behaviour.sleeping
            ? "A soft little snore. The world can wait."
            : hasSettled(state.care, Date.now())
              ? "All cosy. Stay a little, or go enjoy your day."
              : "A gentle tap says hello. Pick them up for a little wiggle.",
      );
      idleMessageAt = Infinity;
    }
    if (t - clockCheck > 30_000) {
      clockCheck = t;
      const nextTod =
        state.light === "auto" ? timeOfDay(new Date()) : state.light;
      if (tod !== nextTod) layout();
      const nextSleep = isSleepTime(new Date());
      if (nextSleep !== automaticSleep && !activeCare) {
        automaticSleep = nextSleep;
        release(true);
        behaviour.rest(nextSleep);
        ui.sleep(nextSleep);
        idleMessageAt = 0;
      }
    }
    const p = placeRig();
    acc += dt;
    let steps = 0;
    while (acc >= STEP_MS && steps < 5) {
      rig.step(STEP_S);
      acc -= STEP_MS;
      steps++;
    }
    let lowest = -Infinity;
    for (const q of rig.points) lowest = Math.max(lowest, q.y + q.radius);
    liftPx = Math.max(0, rig.floorY - lowest);
    if (!behaviour.reducedMotion) updateMotes(motes, dt);
    drawMotes(dustG, ground, motes);
    drawShadow(shadowG, ground, behaviour.world, liftPx * p.scale);
    const sq = behaviour.squashScale(),
      br = behaviour.breathe(t);
    const jitter =
      !behaviour.reducedMotion && behaviour.shakePx
        ? (Math.random() - 0.5) * 2 * behaviour.shakePx
        : 0;
    petBox.position.set(p.x + jitter, p.y + jitter);
    petBox.scale.set(p.scale * sq.x, p.scale * sq.y * br);
    petBox.rotation =
      !behaviour.reducedMotion && behaviour.walking
        ? behaviour.facing * 0.04
        : 0;
    petArt.draw(rig, behaviour.face);
    drawCare(
      effectsG,
      activeCare,
      activeCare ? careTime : t,
      p.x,
      p.y,
      p.scale,
      behaviour.sleeping,
      behaviour.reducedMotion,
    );
    hook.cpuMs = performance.now() - cpu0;
    if (!ready) {
      ready = hook.ready = true;
      ui.ready();
      performance.mark("tamati-first-greeting-frame");
    }
    if (dbg)
      dbg.text = `${ticker.FPS.toFixed(0)} fps · ${spec.tier} · ${behaviour.sleeping ? "asleep" : (activeCare ?? behaviour.idle ?? "wandering")}`;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      release(true);
      persist();
      app.stop();
    } else {
      acc = 0;
      if (hiddenAt && !activeCare) {
        const current = Date.now();
        spec = greetingFor(hiddenAt, current);
        if (isSleepTime(new Date())) {
          behaviour.rest(true);
          ui.sleep(true);
        } else if (spec.rank >= 1) {
          behaviour.rest(false);
          behaviour.playGreeting(spec);
          ui.sleep(false);
          if (spec.rank >= 2) state.visits++;
        }
        hiddenAt = 0;
        persist();
      }
      layout();
      app.start();
    }
  });
  window.addEventListener("pagehide", persist);
  persist();
  // No native permission request at launch. The web product works without notifications.
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    void navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {});
  }
}
boot().catch((error) => {
  console.error("Tamati could not start", error);
  const mount =
    document.getElementById("app") ?? document.getElementById("shell")!;
  mount.innerHTML =
    '<div class="error"><h2>A small hiccup.</h2><p>The room couldn’t open. Let’s try again.</p><button id="retry">Try again</button></div>';
  document.getElementById("loading")?.remove();
  document.getElementById("retry")!.onclick = () => location.reload();
});
