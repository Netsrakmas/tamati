import type { Save } from "./persist/store";
import type { TimeOfDay } from "./room/scene";
import type { CareAction } from "./pet/care";
import { pixelIcon, pixelText } from "./style/pixels";
export interface UIActions {
  care: (action: CareAction) => void;
  rest: () => void;
  settings: () => void;
}
export function createUI(state: Save, actions: UIActions) {
  let lastBusy: boolean | undefined;
  let messageTimer: ReturnType<typeof setTimeout> | undefined;
  document.getElementById("shell")!.innerHTML = `
    <main class="shell">
      <section class="room-frame" aria-label="Your companion’s room">
        <div id="app"></div>
        <header class="topbar"><h1 class="wordmark" aria-label="Tamati">${pixelText("tamati")}</h1><button class="icon-button" id="settings-open" aria-label="Room settings">${pixelIcon("settings")}</button></header>
        <div class="loading" id="loading"><span class="loading-star">✦</span>Opening the room…</div>
        <div class="room-bottom"><span id="pet-name" class="pet-name"></span><button class="icon-button rest-button" id="rest" aria-label="Let your companion rest" aria-pressed="false">${pixelIcon("moon")}</button></div>
        <p class="status" id="status" role="status" aria-live="polite"></p>
      </section>
      <nav class="actions" aria-label="Spend a moment together">
        <button class="action" data-care="snack" aria-label="Food" disabled><span class="action-icon">${pixelIcon("food")}</span><span class="action-label">${pixelText("FOOD")}</span></button>
        <button class="action" data-care="clean" aria-label="Wash" disabled><span class="action-icon">${pixelIcon("wash")}</span><span class="action-label">${pixelText("WASH")}</span></button>
        <button class="action" data-care="play" aria-label="Play" disabled><span class="action-icon">${pixelIcon("play")}</span><span class="action-label">${pixelText("PLAY")}</span></button>
      </nav>
    </main>
    <dialog id="settings-dialog" aria-labelledby="settings-title"><div class="dialog-head"><h2 id="settings-title">Room settings</h2><button class="icon-button" data-close aria-label="Close settings">${pixelIcon("close")}</button></div>
      <form id="settings-form"><label for="name-input">Your companion’s name</label><input id="name-input" name="name" maxlength="18" autocomplete="off" required />
      <label for="light-input">Room light</label><select id="light-input" name="light"><option value="auto">Follow the time of day</option><option value="day">Daylight</option><option value="dusk">Sunset</option><option value="night">Moonlight</option></select>
      <div class="form-row"><label for="sound-input">Sound</label><input id="sound-input" type="checkbox" name="sound" /></div>
      <div class="form-row"><label for="motion-input">Reduced motion</label><input id="motion-input" type="checkbox" name="motion" /></div>
      <p>Saved on this device.</p><button class="primary" type="submit">Save settings</button></form>
      <button class="text-button" id="help-open">How to play</button></dialog>
    <dialog id="help-dialog" aria-labelledby="help-title"><div class="dialog-head"><h2 id="help-title">How to play</h2><button class="icon-button" data-close aria-label="Close field guide">${pixelIcon("close")}</button></div><ul class="help-list"><li><strong>Say hello.</strong>Tap your friend, or pick them up and gently wiggle. On a keyboard, focus the room and press Enter.</li><li><strong>Food, bubbles and a bouncing ball.</strong>Try the three buttons. Each gets a different reaction.</li><li><strong>Take a nap.</strong>The moon button puts your friend to sleep. Tap the sun to wake them. They also sleep from 10 pm to 7 am.</li><li><strong>Come back whenever.</strong>No meters, streaks or points. There’s nothing to catch up on.</li></ul><button class="primary" data-close>Back to the room</button></dialog>`;
  const $ = <T extends HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  const settings = $<HTMLDialogElement>("settings-dialog");
  const help = $<HTMLDialogElement>("help-dialog");
  $("settings-open").onclick = () => {
    $<HTMLInputElement>("name-input").value = state.name;
    $<HTMLSelectElement>("light-input").value = state.light;
    $<HTMLInputElement>("sound-input").checked = state.sound;
    $<HTMLInputElement>("motion-input").checked = state.reducedMotion;
    settings.showModal();
  };
  $("help-open").onclick = () => {
    settings.close();
    help.showModal();
  };
  for (const dialog of [settings, help]) {
    dialog
      .querySelectorAll<HTMLButtonElement>("[data-close]")
      .forEach((b) => (b.onclick = () => dialog.close()));
    dialog.addEventListener("click", (e) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        dialog.close();
    });
  }
  $("settings-form").onsubmit = (e) => {
    e.preventDefault();
    state.name =
      $<HTMLInputElement>("name-input").value.trim().slice(0, 18) || "Momo";
    state.light = $<HTMLSelectElement>("light-input").value as Save["light"];
    state.sound = $<HTMLInputElement>("sound-input").checked;
    state.reducedMotion = $<HTMLInputElement>("motion-input").checked;
    $("pet-name").textContent = state.name;
    actions.settings();
    settings.close();
  };
  $("pet-name").textContent = state.name;
  $("rest").onclick = actions.rest;
  document
    .querySelectorAll<HTMLButtonElement>("[data-care]")
    .forEach(
      (b) => (b.onclick = () => actions.care(b.dataset.care as CareAction)),
    );
  return {
    status(text: string) {
      if ($("status").textContent === text) return;
      $("status").textContent = text;
      $("status").classList.add("visible");
      clearTimeout(messageTimer);
      messageTimer = setTimeout(
        () => $("status").classList.remove("visible"),
        4600,
      );
    },
    busy(value: boolean) {
      if (lastBusy === value) return;
      lastBusy = value;
      document
        .querySelectorAll<HTMLButtonElement>("[data-care]")
        .forEach((b) => (b.disabled = value));
      $("status").dataset.busy = String(value);
    },
    ready() {
      $("loading").remove();
    },
    time(tod: TimeOfDay) {
      document.querySelector<HTMLElement>(".room-frame")!.dataset.time = tod;
    },
    sleep(asleep: boolean) {
      const b = $("rest");
      b.setAttribute("aria-pressed", String(asleep));
      b.setAttribute(
        "aria-label",
        asleep ? "Wake your companion" : "Let your companion rest",
      );
      b.innerHTML = pixelIcon(asleep ? "sun" : "moon");
    },
  };
}
