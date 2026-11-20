(() => {
  if (window.__mochiLoaded) return;
  window.__mochiLoaded = true;

  const DEFAULTS = { enabled: true, minutes: 3, swipes: 15, lastClosedAt: 0 };
  const REPEAT_WINDOW_MS = 10 * 60 * 1000;
  const REPEAT_FACTOR = 0.25;
  const IDLE_AFTER_MS = 20 * 1000;
  const SLEEP_AFTER_MS = 9 * 1000;
  const SWIPE_GAP_MS = 350;

  const hasExtension = typeof chrome !== "undefined" && chrome.runtime?.id;

  function loadSettings() {
    if (!hasExtension) return Promise.resolve({ ...DEFAULTS, ...(window.__mochiDemo || {}) });
    return chrome.storage.local.get(DEFAULTS);
  }

  const HOST = (!hasExtension && window.__mochiDemo?.host) || location.hostname;
  const IS_YT = HOST.endsWith("youtube.com");
  const IS_IG = HOST.endsWith("instagram.com");

  function shortId() {
    const m = location.pathname.match(/^\/shorts\/([^/?#]+)/);
    return m ? m[1] : null;
  }

  // EXTERNAL: the page is an overlay (the Android app) and gets told about the feed instead of seeing it.
  const EXTERNAL = !hasExtension && !!window.__mochiDemo?.external;
  let externalOnFeed = false;

  function isFeedPage() {
    if (EXTERNAL) return externalOnFeed;
    if (IS_YT) return shortId() !== null;
    // only the Reels viewer; DMs, the home feed and profiles are fine
    if (IS_IG) return /^\/reels?(\/|$)/.test(location.pathname);
    return true;
  }

  const PET_SVG = `
    <svg viewBox="0 0 100 100" class="pet" aria-hidden="true">
      <defs>
        <radialGradient id="mochi-skin" cx="38%" cy="32%" r="75%">
          <stop offset="0" stop-color="#ffbf9c"/>
          <stop offset=".55" stop-color="#ff9466"/>
          <stop offset="1" stop-color="#f37a4b"/>
        </radialGradient>
        <filter id="mochi-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6"/></filter>
      </defs>
      <ellipse class="shadow" cx="50" cy="96" rx="26" ry="4"/>
      <g class="feet">
        <ellipse class="foot l" cx="38" cy="90" rx="8" ry="5.5"/>
        <ellipse class="foot r" cx="62" cy="90" rx="8" ry="5.5"/>
      </g>
      <g class="bob"><g class="body">
        <g class="arm l"><ellipse cx="17" cy="66" rx="6" ry="9"/></g>
        <g class="arm r"><ellipse cx="83" cy="66" rx="6" ry="9"/></g>
        <g class="sprout">
          <path class="stem" d="M50 32 C50 25 51 20 53 16"/>
          <path class="leaf" d="M52 19 C45 10 35 11 32 16 C38 21 46 22 52 19 Z"/>
          <path class="leaf" d="M53 17 C59 9 68 9 71 13 C66 19 59 20 53 17 Z"/>
          <g class="bloom">
            <circle cx="53" cy="12.5" r="2.6"/><circle cx="56.6" cy="15" r="2.6"/><circle cx="55.2" cy="19" r="2.6"/>
            <circle cx="50.8" cy="19" r="2.6"/><circle cx="49.4" cy="15" r="2.6"/>
            <circle class="bloom-mid" cx="53" cy="16" r="1.9"/>
          </g>
        </g>
        <ellipse class="skin" cx="50" cy="63" rx="37" ry="30"/>
        <ellipse class="shine" cx="32" cy="43" rx="10" ry="5.5" transform="rotate(-28 32 43)"/>
        <circle class="shine" cx="44" cy="37" r="2"/>
        <ellipse class="belly" cx="50" cy="78" rx="18" ry="11"/>
        <ellipse class="cheek" cx="22" cy="72" rx="7.5" ry="5"/>
        <ellipse class="cheek" cx="78" cy="72" rx="7.5" ry="5"/>
        <g class="eyes">
          <ellipse class="eye-white" cx="36" cy="60" rx="11" ry="12.5"/>
          <ellipse class="eye-white" cx="64" cy="60" rx="11" ry="12.5"/>
          <g class="pupils">
            <ellipse class="pupil" cx="36" cy="61" rx="7.8" ry="8.8"/>
            <ellipse class="pupil" cx="64" cy="61" rx="7.8" ry="8.8"/>
            <circle class="glint" cx="39.5" cy="56.5" r="3.3"/>
            <circle class="glint" cx="67.5" cy="56.5" r="3.3"/>
            <circle class="glint" cx="33" cy="65" r="1.5"/>
            <circle class="glint" cx="61" cy="65" r="1.5"/>
          </g>
          <rect class="lid" x="23" y="46" width="54" height="0" rx="3"/>
          <path class="shut" d="M26 61 Q36 67.5 46 61 M54 61 Q64 67.5 74 61"/>
        </g>
        <path class="brow l" d="M26 44 L44 49"/>
        <path class="brow r" d="M74 44 L56 49"/>
        <path class="sweat" d="M82 43 C79 48 79 52 82 52 C85 52 85 48 82 43 Z"/>
        <path class="mouth m-happy" d="M46 75 Q48 77.8 50 75 Q52 77.8 54 75"/>
        <path class="mouth m-open" d="M46 75 Q50 82 54 75 Z"/>
        <path class="mouth m-flat" d="M46.5 77 Q50 76 53.5 77"/>
        <path class="mouth m-mad" d="M45.5 79 Q50 74 54.5 79"/>
        <ellipse class="mouth m-o" cx="50" cy="77" rx="2.2" ry="2.6"/>
      </g></g>
    </svg>`;

  const CSS = `
    :host { all: initial; }
    .wrap {
      position: fixed; z-index: 2147483647; left: 0; top: 0;
      width: 88px; height: 88px; pointer-events: auto; cursor: pointer;
      transform: translate(var(--x, 0px), var(--y, 0px));
      transition: transform 1s linear, opacity .4s;
      opacity: 0; user-select: none;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    .wrap.shown { opacity: 1; }
    .rig { width: 100%; height: 100%; transform-origin: 50% 50%; transition: transform .35s ease; }
    .wrap.climbing .rig { transform: rotate(-90deg); }
    .pet { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 4px 6px rgba(0,0,0,.18)); }

    .skin { fill: url(#mochi-skin); }
    .arm ellipse { fill: #ff9466; }
    .shine { fill: #fff; opacity: .45; }
    .belly { fill: #ffd9c2; opacity: .8; }
    .cheek { fill: #ff5c8a; opacity: .55; filter: url(#mochi-soft); }
    .bloom circle { fill: #ffb3cb; }
    .bloom .bloom-mid { fill: #ffd23f; }
    .foot { fill: #f07546; }
    .shadow { fill: #000; opacity: .16; transform-origin: 50px 96px; }
    .eye-white { fill: #fff; }
    .pupil { fill: #2a1b18; }
    .glint { fill: #fff; }
    .lid { fill: #ffa47a; transition: height .09s; }
    .stem { fill: none; stroke: #3f9e4e; stroke-width: 2.6; stroke-linecap: round; }
    .leaf { fill: #6fd17c; stroke: #3f9e4e; stroke-width: 1.6; }
    .sprout { transform-origin: 50px 32px; animation: sway 3s ease-in-out infinite; }
    .brow { stroke: #2a1b18; stroke-width: 3.2; stroke-linecap: round; opacity: 0; transition: opacity .2s; }
    .sweat { fill: #8fd3ff; opacity: 0; transition: opacity .3s; }
    .mouth { fill: none; stroke: #2a1b18; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; opacity: 0; }
    .m-open, .m-o { fill: #b23a48; }
    .pupils { transition: transform .15s ease-out, opacity .06s; }
    .arm { transition: transform .25s cubic-bezier(.3,1.5,.5,1); }
    .arm.l { transform-origin: 22px 60px; }
    .arm.r { transform-origin: 78px 60px; }
    .body { transform-origin: 50px 92px; animation: breathe 2.6s ease-in-out infinite; }
    .bob { transform-origin: 50px 92px; }

    .wrap[data-mood="happy"] .m-happy,
    .wrap[data-mood="excited"] .m-open,
    .wrap[data-mood="worried"] .m-flat,
    .wrap[data-mood="mad"] .m-mad,
    .wrap[data-mood="sleepy"] .m-o,
    .wrap[data-mood="shock"] .m-o { opacity: 1; }
    .wrap[data-mood="mad"] .brow { opacity: 1; }
    .wrap[data-mood="worried"] .sweat, .wrap[data-mood="mad"] .sweat { opacity: 1; }
    .shut { fill: none; stroke: #2a1b18; stroke-width: 2.6; stroke-linecap: round; opacity: 0; }
    .eye-white { transition: opacity .06s; }
    .wrap[data-mood="sleepy"] .eye-white, .wrap[data-mood="sleepy"] .pupils,
    .wrap.blink .eye-white, .wrap.blink .pupils { opacity: 0; }
    .wrap[data-mood="sleepy"] .shut, .wrap.blink .shut { opacity: 1; }
    .wrap[data-mood="shock"] .pupil { transform: scale(.7); transform-box: fill-box; transform-origin: center; }

    .wrap.walking .bob { animation: waddle .38s ease-in-out infinite; }
    .wrap.walking .foot.l { animation: step .38s ease-in-out infinite; }
    .wrap.walking .foot.r { animation: step .38s ease-in-out infinite .19s; }
    .wrap.walking .arm.l { animation: swing .38s ease-in-out infinite; }
    .wrap.walking .arm.r { animation: swing .38s ease-in-out infinite reverse; }
    .wrap.running .bob, .wrap.running .foot, .wrap.running .arm { animation-duration: .22s !important; }
    .wrap.climbing .bob { animation: waddle .26s ease-in-out infinite; }
    .wrap.climbing .arm.l { animation: climb .26s ease-in-out infinite; }
    .wrap.climbing .arm.r { animation: climb .26s ease-in-out infinite reverse; }
    .wrap.climbing .shadow { opacity: 0; }

    .wrap.waving .arm.r { animation: wave .36s ease-in-out 4; }
    .wrap.reach .arm.r { transform: rotate(-150deg); }
    .wrap.dance .bob { animation: dance .5s ease-in-out 4; }
    .wrap.shake .bob { animation: shake .4s ease-in-out 2; }
    .wrap.jump .bob { animation: jump .55s cubic-bezier(.3,1.5,.5,1); }
    .wrap.jump .shadow { animation: shadowjump .55s cubic-bezier(.3,1.5,.5,1); }
    .wrap.squish .bob { animation: squish .4s ease; }
    .wrap.stomp .bob { animation: stomp .3s ease 3; }
    .wrap[data-mood="sleepy"] .body { animation: snore 3.2s ease-in-out infinite; }

    @keyframes breathe { 25% { transform: rotate(-2deg); } 50% { transform: scale(1.03, .97); } 75% { transform: rotate(2deg); } }
    @keyframes sway { 50% { transform: rotate(8deg); } }
    @keyframes waddle { 0%,100% { transform: rotate(-7deg) translateY(0); } 25% { transform: rotate(0) translateY(-5px); } 50% { transform: rotate(7deg) translateY(0); } 75% { transform: rotate(0) translateY(-5px); } }
    @keyframes step { 50% { transform: translateY(-5px); } }
    @keyframes swing { 50% { transform: rotate(30deg); } }
    @keyframes climb { 0%,100% { transform: rotate(-120deg); } 50% { transform: rotate(-40deg); } }
    @keyframes wave { 0%,100% { transform: rotate(-140deg); } 50% { transform: rotate(-100deg); } }
    @keyframes dance { 25% { transform: rotate(-12deg) translateY(-4px); } 75% { transform: rotate(12deg) translateY(-4px); } }
    @keyframes shake { 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } }
    @keyframes jump { 0% { transform: scale(1.1,.9); } 40% { transform: translateY(-30px) scale(.94,1.08); } 75% { transform: translateY(0) scale(1.12,.9); } 100% { transform: none; } }
    @keyframes shadowjump { 40% { transform: scale(.6); opacity: .08; } }
    @keyframes squish { 30% { transform: scale(1.18,.82); } 60% { transform: scale(.92,1.1); } }
    @keyframes stomp { 50% { transform: scale(1.08,.9) translateY(2px); } }
    @keyframes snore { 50% { transform: scale(1.05,.96); } }

    .fx { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
    .p {
      position: absolute; font-size: 18px; line-height: 1; font-weight: 800;
      animation: floatup 1.3s ease-out forwards;
    }
    .p.heart { color: #ff5c8a; }
    .p.z { color: #8a9bff; font-size: 15px; animation-duration: 2s; }
    .p.note { color: #ffb347; }
    .p.bang { color: #ff4d4d; font-size: 26px; animation: pop .8s ease-out forwards; }
    .p.star { color: #ffd23f; font-size: 16px; animation: burst .7s ease-out forwards; }
    @keyframes floatup { 0% { opacity: 0; transform: translate(0,0) scale(.6); } 20% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--dx, 10px), -46px) scale(1.1); } }
    @keyframes pop { 0% { opacity: 0; transform: scale(.3); } 30% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0; transform: scale(1) translateY(-8px); } }
    @keyframes burst { 0% { opacity: 1; transform: translate(0,0) scale(.5) rotate(0); } 100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1.2) rotate(140deg); } }

    .bubble {
      position: absolute; bottom: 96px; right: 0; width: max-content; max-width: 200px;
      background: #fff; color: #2a1b18; font-size: 13.5px; line-height: 1.35; font-weight: 650;
      padding: 8px 12px; border-radius: 16px; box-shadow: 0 6px 18px rgba(0,0,0,.2);
      opacity: 0; transform: translateY(6px) scale(.9); transform-origin: bottom right;
      transition: opacity .18s, transform .25s cubic-bezier(.3,1.6,.5,1); pointer-events: none;
    }
    .bubble::after {
      content: ""; position: absolute; bottom: -5px; right: 32px; width: 11px; height: 11px;
      background: #fff; transform: rotate(45deg); border-radius: 2px;
    }
    .bubble.on { opacity: 1; transform: none; }
    .wrap.bl .bubble { right: auto; left: 0; transform-origin: bottom left; }
    .wrap.bl .bubble::after { right: auto; left: 32px; }
    .wrap.top .bubble { bottom: auto; top: 96px; transform-origin: top right; }
    .wrap.top .bubble::after { bottom: auto; top: -5px; }
    .wrap.climbing .bubble { display: none; }

    .meter {
      position: absolute; left: 22px; right: 22px; bottom: -6px; height: 4px; border-radius: 4px;
      background: rgba(0,0,0,.15); overflow: hidden; opacity: .85;
    }
    .meter i { display: block; height: 100%; width: 0; background: #6fd17c; transition: width .6s, background .4s; }
    .meter.warm i { background: #ffb347; }
    .meter.hot i { background: #ff4d4d; }
    .wrap.top .meter, .wrap.climbing .meter { display: none; }

    .curtain {
      position: fixed; inset: 0; z-index: 2147483646; pointer-events: none;
      background: #1b1418; color: #fff;
      clip-path: circle(0 at var(--cx, 95%) var(--cy, 5%));
      transition: clip-path .8s cubic-bezier(.6,0,.4,1);
      display: grid; place-items: center; text-align: center;
      font: 650 21px system-ui, -apple-system, "Segoe UI", sans-serif;
    }
    .curtain.on { clip-path: circle(150% at var(--cx, 95%) var(--cy, 5%)); pointer-events: auto; }
    .curtain small { display: block; font-weight: 400; font-size: 14px; opacity: .7; margin-top: 6px; }
    .xbtn {
      position: fixed; z-index: 2147483647; width: 32px; height: 32px; border-radius: 50%;
      background: #ff5a5a; color: #fff; display: grid; place-items: center;
      font: 800 19px/1 system-ui, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,.28), inset 0 -3px 0 rgba(0,0,0,.15);
      transform: scale(0); transition: transform .3s cubic-bezier(.3,1.7,.5,1);
    }
    .xbtn.on { transform: scale(1); animation: throb 1s ease-in-out infinite .3s; }
    .xbtn.pressed { animation: none; transform: scale(.65); background: #d13c3c; transition-duration: .1s; }
    @keyframes throb { 50% { transform: scale(1.12); } }
  `;

  const host = document.createElement("div");
  host.id = "mochi-guard";
  const root = host.attachShadow({ mode: "closed" });
  root.innerHTML = `<style>${CSS}</style>
    <div class="curtain"><div>${window.__mochiDemo?.closedText || "Mochi closed this tab."}<small>go do something nice ♡</small></div></div>
    <div class="xbtn">×</div>
    <div class="wrap" data-mood="happy">
      <div class="bubble"></div>
      <div class="rig">${PET_SVG}</div>
      <div class="fx"></div>
      <div class="meter"><i></i></div>
    </div>`;

  const wrap = root.querySelector(".wrap");
  const bubble = root.querySelector(".bubble");
  const pupils = root.querySelector(".pupils");
  const fx = root.querySelector(".fx");
  const meter = root.querySelector(".meter");
  const meterFill = root.querySelector(".meter i");
  const curtain = root.querySelector(".curtain");
  const xbtn = root.querySelector(".xbtn");

  const PET = 88;
  const EDGE = 10;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  let pos = { x: 0, y: 0 };
  let walking = false;

  const vw = () => document.documentElement.clientWidth || window.innerWidth;
  const vh = () => document.documentElement.clientHeight || window.innerHeight;
  const groundY = () => vh() - PET - 14;
  const maxX = () => vw() - PET - EDGE;

  function place(x, y, ms = 0) {
    wrap.style.transition = `transform ${ms}ms linear, opacity .4s`;
    wrap.style.setProperty("--x", `${Math.round(x)}px`);
    wrap.style.setProperty("--y", `${Math.round(y)}px`);
    pos = { x, y };
    wrap.classList.toggle("bl", x < 220);
  }

  async function walkTo(x, y = pos.y, speed = 110, cls = "walking") {
    const dist = Math.hypot(x - pos.x, y - pos.y);
    if (dist < 2) return;
    const ms = (dist / speed) * 1000;
    walking = true;
    look(Math.sign(x - pos.x) * 4, 0, ms + 100);
    const classes = cls.split(" ");
    wrap.classList.add(...classes);
    place(x, y, ms);
    await sleep(ms);
    wrap.classList.remove(...classes);
    walking = false;
  }

  let bubbleTimer;
  function say(text, ms = 2600) {
    clearTimeout(bubbleTimer);
    bubble.textContent = text;
    bubble.classList.remove("on");
    void bubble.offsetWidth;
    bubble.classList.add("on");
    if (ms) bubbleTimer = setTimeout(() => bubble.classList.remove("on"), ms);
  }
  const hush = () => bubble.classList.remove("on");

  const setMood = (m) => (wrap.dataset.mood = m);
  const mood = () => wrap.dataset.mood;

  function pulse(cls, ms) {
    wrap.classList.remove(cls);
    void wrap.offsetWidth;
    wrap.classList.add(cls);
    return sleep(ms).then(() => wrap.classList.remove(cls));
  }

  function particle(kind, text, opts = {}) {
    const el = document.createElement("span");
    el.className = `p ${kind}`;
    el.textContent = text;
    el.style.left = `${opts.x ?? rand(30, 58)}px`;
    el.style.top = `${opts.y ?? rand(4, 20)}px`;
    el.style.setProperty("--dx", `${opts.dx ?? rand(-18, 18)}px`);
    if (opts.dy != null) el.style.setProperty("--dy", `${opts.dy}px`);
    fx.appendChild(el);
    setTimeout(() => el.remove(), 2100);
  }
  function hearts(n = 4) {
    for (let i = 0; i < n; i++) setTimeout(() => particle("heart", "♥"), i * 140);
  }

  let lookUntil = 0;
  function look(dx, dy, hold = 600) {
    lookUntil = Date.now() + hold;
    pupils.style.transform = `translate(${dx}px, ${dy}px)`;
  }
  function followPointer(px, py) {
    if (Date.now() < lookUntil || mood() === "sleepy") return;
    const dx = px - (pos.x + PET / 2);
    const dy = py - (pos.y + PET / 2);
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, d / 220) * 3.8;
    pupils.style.transform = `translate(${(dx / d) * k}px, ${(dy / d) * k}px)`;
  }

  (function blinkLoop() {
    setTimeout(() => {
      wrap.classList.add("blink");
      setTimeout(() => wrap.classList.remove("blink"), 120);
      if (Math.random() < 0.25) setTimeout(() => {
        wrap.classList.add("blink");
        setTimeout(() => wrap.classList.remove("blink"), 110);
      }, 220);
      blinkLoop();
    }, rand(2000, 5000));
  })();

  // --- usage tracking ---
  let settings = { ...DEFAULTS };
  let activeMs = 0;
  let swipes = 0;
  let lastInput = Date.now();
  let lastSwipe = 0;
  let stage = "idle"; // idle -> watching -> warned -> closing
  let limits = { ms: 0, swipes: 0 };
  let busy = false;

  function progress() {
    if (!limits.ms) return 0;
    return Math.min(1, Math.max(activeMs / limits.ms, swipes / limits.swipes));
  }

  async function wake() {
    if (mood() !== "sleepy") return;
    setMood("shock");
    particle("bang", "!", { x: 52, y: -8 });
    await pulse("jump", 550);
    setMood(stage === "warned" ? "worried" : "happy");
  }

  // On YouTube every new Short changes the URL, so that is what counts as a swipe.
  // It also catches the on-screen up/down buttons, which fire no scroll events.
  const typing = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

  function onSwipe() {
    const now = Date.now();
    lastInput = now;
    // scrolling a chat opened on top of the feed isn't watching reels
    if (!isFeedPage() || typing(document.activeElement)) return;
    const fresh = now - lastSwipe > SWIPE_GAP_MS;
    lastSwipe = now;
    if (!fresh) return;
    if (IS_YT) {
      if (stage !== "idle" && stage !== "closing" && !walking) look(pos.x > vw() / 2 ? -3 : 3, 3.5, 700);
      return;
    }
    countSwipe();
  }

  let lastShort = IS_YT ? shortId() : null;
  function checkShort() {
    if (!IS_YT) return;
    const id = shortId();
    if (!id || id === lastShort) return;
    const counted = lastShort !== null;
    lastShort = id;
    lastInput = Date.now();
    if (counted) countSwipe();
  }
  if (IS_YT) {
    window.addEventListener("yt-navigate-finish", checkShort);
    window.addEventListener("popstate", checkShort);
  }

  function countSwipe() {
    swipes++;
    if (stage === "idle" || stage === "closing") return;
    wake();
    if (!walking) look(pos.x > vw() / 2 ? -3 : 3, 3.5, 700);
    if (stage === "warned" && !busy && Math.random() < 0.3) {
      pulse("shake", 800);
      say(pick(["hey!", "stoppp", "nooo more", "that's another one…", "i'm counting!"]), 1400);
    }
  }

  window.addEventListener("wheel", onSwipe, { passive: true, capture: true });
  window.addEventListener("touchmove", onSwipe, { passive: true, capture: true });
  window.addEventListener("keydown", (e) => {
    lastInput = Date.now();
    // space and j/k are words when someone is writing a message or comment
    if (typing(e.target) || typing(document.activeElement)) return;
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "j", "k"].includes(e.key)) onSwipe();
  }, { capture: true });
  window.addEventListener("pointermove", (e) => {
    lastInput = Date.now();
    followPointer(e.clientX, e.clientY);
  }, { passive: true, capture: true });
  window.addEventListener("resize", () => {
    if ((stage === "watching" || stage === "warned") && !walking) place(Math.min(pos.x, maxX()), groundY());
  });

  wrap.addEventListener("click", async () => {
    if (stage === "closing" || busy) return;
    busy = true;
    await wake();
    setMood("excited");
    hearts(5);
    pulse("squish", 400);
    const p = progress();
    say(
      p < 0.4 ? pick(["hehe, that tickles!", "hi hi!", "i'm on duty ♡", "scroll responsibly :)"])
      : p < 0.75 ? pick(["boop! but also… maybe wrap up?", "are you having fun, or just scrolling?", "i'm getting a little nervous"])
      : pick(["don't try to distract me!", "pets won't save you now", "a few more and i'm closing it"]),
      2400,
    );
    await sleep(1400);
    setMood(stage === "warned" ? "worried" : "happy");
    busy = false;
  });

  // --- idle life ---
  async function wander() {
    while (stage === "watching" || stage === "warned") {
      await sleep(rand(1400, 3600));
      if (stage !== "watching" && stage !== "warned") return;
      if (busy || !isFeedPage()) continue;

      if (Date.now() - lastInput > SLEEP_AFTER_MS) {
        if (mood() !== "sleepy") {
          setMood("sleepy");
          hush();
        }
        particle("z", pick(["z", "Z", "z"]), { x: rand(56, 70), y: 2, dx: rand(6, 20) });
        continue;
      }

      busy = true;
      const warned = stage === "warned";
      const roll = Math.random();
      if (roll < 0.5) {
        const target = Math.max(EDGE, Math.min(maxX(), pos.x + rand(-1, 1) * rand(80, vw() * 0.45)));
        await walkTo(target, groundY(), warned ? 170 : 105, warned ? "walking running" : "walking");
      } else if (roll < 0.65) {
        look(-4, 0, 700); await sleep(700);
        look(4, 0, 700); await sleep(700);
      } else if (roll < 0.77 && !warned) {
        wrap.classList.add("waving");
        say(pick(["hi!", "hello there", "still here!", "♡"]), 1600);
        await sleep(1500);
        wrap.classList.remove("waving");
      } else if (roll < 0.88 && !warned) {
        setMood("excited");
        for (let i = 0; i < 3; i++) setTimeout(() => particle("note", pick(["♪", "♫"])), i * 450);
        await pulse("dance", 2000);
        setMood("happy");
      } else if (warned) {
        await pulse("stomp", 900);
        say(pick(["wrap it up, please", "almost time…", "i'm warning you!"]), 1800);
      } else {
        await pulse("jump", 550);
        hearts(2);
      }
      busy = false;
    }
  }

  async function appear() {
    stage = "watching";
    setMood("happy");
    const y = groundY();
    place(vw() + 10, y);
    await sleep(40);
    wrap.classList.add("shown");
    await walkTo(vw() - PET * 0.55, y, 70);
    look(-4, 0, 900);
    await sleep(800);
    look(0, -2, 500);
    await sleep(400);
    await walkTo(maxX() - 40, y, 110);
    await pulse("jump", 550);
    hearts(3);
    const repeat = Date.now() - settings.lastClosedAt < REPEAT_WINDOW_MS;
    say(repeat ? "back already? i'm watching closer this time." : "hi! i'll keep you company. and watch. closely.", 3200);
    await sleep(1200);
    wander();
  }

  function warn() {
    stage = "warned";
    setMood("worried");
    meter.classList.add("hot");
    pulse("shake", 800);
    say("you've been scrolling for a while… wrap it up?", 3600);
  }

  async function closeTab() {
    stage = "closing";
    busy = true;
    hush();
    wrap.classList.remove("waving", "dance");
    await sleep(walking ? 400 : 0);

    setMood("shock");
    particle("bang", "!", { x: 52, y: -8 });
    await pulse("jump", 550);
    setMood("mad");
    say("okay. that's ENOUGH.", 1500);
    await pulse("stomp", 900);
    await sleep(500);
    hush();

    const btnX = vw() - 50;
    const btnY = 14;
    xbtn.style.left = `${btnX}px`;
    xbtn.style.top = `${btnY}px`;
    xbtn.classList.add("on");

    const wallX = vw() - PET - 6;
    await walkTo(wallX, groundY(), 280, "walking running");

    wrap.classList.add("climbing");
    await sleep(300);
    await walkTo(wallX, 54, 320, "climbing");
    wrap.classList.remove("climbing");

    wrap.classList.add("top");
    place(btnX - PET + 6, 2, 260);
    await pulse("jump", 550);

    look(4, -2, 5000);
    wrap.classList.add("reach");
    await sleep(350);
    xbtn.classList.add("pressed");
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      particle("star", "★", { x: PET - 4, y: 18, dx: Math.cos(a) * 34, dy: Math.sin(a) * 34 });
    }
    curtain.style.setProperty("--cx", `${btnX + 16}px`);
    curtain.style.setProperty("--cy", `${btnY + 16}px`);
    curtain.classList.add("on");
    await sleep(250);
    wrap.classList.remove("reach");

    setMood("happy");
    wrap.classList.add("waving");
    say("bye bye, feed ♡", 0);
    hearts(3);
    await sleep(1500);

    if (hasExtension) {
      chrome.runtime.sendMessage({ type: "mochi:close" });
    } else {
      document.dispatchEvent(new CustomEvent("mochi:close"));
    }
  }

  async function start() {
    settings = await loadSettings();
    if (!settings.enabled) return;

    const repeat = Date.now() - settings.lastClosedAt < REPEAT_WINDOW_MS;
    const factor = repeat ? REPEAT_FACTOR : 1;
    limits = {
      ms: settings.minutes * 60 * 1000 * factor,
      swipes: Math.max(3, Math.round(settings.swipes * factor)),
    };

    (document.body || document.documentElement).appendChild(host);

    let last = Date.now();
    let shownOnFeed = true;
    setInterval(() => {
      const now = Date.now();
      const dt = now - last;
      last = now;
      if (stage === "closing") return;
      checkShort();
      const onFeed = isFeedPage();
      // in an app overlay there is no input to see, so the feed being open is what counts
      const active = EXTERNAL || now - lastInput < IDLE_AFTER_MS;
      const engaged = document.visibilityState === "visible" && active && onFeed && !typing(document.activeElement);
      if (engaged) activeMs += dt;

      if (stage === "idle" && onFeed && (activeMs > 4000 || swipes >= 2)) appear();
      if (stage === "idle") return;

      if (onFeed !== shownOnFeed) {
        shownOnFeed = onFeed;
        wrap.classList.toggle("shown", onFeed);
        xbtn.classList.remove("on");
        if (onFeed) {
          place(Math.min(pos.x, maxX()), groundY());
          setTimeout(() => say(pick(["welcome back. i remember everything.", "oh, you're back here again?", "i kept your count, by the way."]), 2600), 400);
        } else {
          hush();
        }
      }
      if (!onFeed) return;

      const p = progress();
      meterFill.style.width = `${Math.round(p * 100)}%`;
      meter.classList.toggle("warm", p >= 0.4);
      if (stage === "watching" && p >= 0.75) warn();
      if (p >= 1) closeTab();
    }, 500);
  }

  if (EXTERNAL) {
    window.mochi = {
      swipe() {
        lastInput = Date.now();
        countSwipe();
      },
      feed(on) {
        externalOnFeed = !!on;
        if (on) lastInput = Date.now();
      },
    };
  }

  if (!hasExtension) {
    window.__mochiState = () => ({ swipes, activeMs, onFeed: isFeedPage(), pos, stage, walking, busy, mood: mood(), cls: wrap.className, style: wrap.getAttribute("style"), op: getComputedStyle(wrap).opacity });
  }

  if (hasExtension) {
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled && changes.enabled.newValue === false) host.remove();
    });
  }

  start();
})();
