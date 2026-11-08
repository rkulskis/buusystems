(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s) => document.querySelector(s);
  const thread = $("#thread"), compose = $("#compose"), send = $("#send"), callEl = $("#call"), homeEl = $("#home"), screenEl = $(".screen");
  const chapterEls = [...document.querySelectorAll(".chapter")];
  const stage = $(".phone");
  const wireEls = [...document.querySelectorAll(".wires path")];

  /* ---------- The company's logo slot ---------- */
  const DEFAULT_ORG = "Your Company";
  let logoURL = null, logoMono = null, orgName = DEFAULT_ORG;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const logoHTML = () => logoURL ? `<img src="${esc(logoURL)}" alt="">`
    : logoMono ? `<span class="mono">${esc(logoMono)}</span>` : "Your<br>Logo";
  const hasLogo = () => !!(logoURL || logoMono);
  const paintLogo = (el) => {
    el.innerHTML = logoHTML();
    el.classList.toggle("has-image", hasLogo());
  };
  const logoSlot = (cls) => `<span class="org-logo ${cls}${hasLogo() ? " has-image" : ""}">${logoHTML()}</span>`;
  const setOrg = (url, name, mono) => {
    if (logoURL && logoURL.startsWith("blob:")) URL.revokeObjectURL(logoURL);
    logoURL = url;
    logoMono = mono || null;
    orgName = name || DEFAULT_ORG;
    document.querySelectorAll(".org-logo").forEach(paintLogo);
    $("#contact-name").textContent = orgName;
    document.querySelectorAll(".org-name").forEach((el) => { el.textContent = orgName; });
    resetBtn.hidden = !hasLogo();
    const press = matchMedia("(hover: none)").matches ? "Tap" : "Click";
    logoStatus.textContent = `${press} it to ${hasLogo() ? "change" : "add"} yours.`;
    document.querySelectorAll(".line").forEach((l) => { l.innerHTML = l.innerHTML.replace(prevOrg, esc(orgName)); });
    prevOrg = esc(orgName);
  };
  let prevOrg = DEFAULT_ORG;

  const fileInput = $("#logo-file"), resetBtn = $("#logo-reset"), logoStatus = $("#logo-status");
  const dialog = $("#logo-dialog"), nameInput = $("#company-name"), messageEl = $("#logo-message");
  // Keeps the whole picker above the on-screen keyboard.
  const fitDialog = () => { if (window.visualViewport) dialog.style.maxHeight = `min(36rem, ${visualViewport.height - 24}px)`; };
  window.visualViewport?.addEventListener("resize", fitDialog);

  /* ---------- Add your company ---------- */
  const monogram = (name) => name.split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(of|the|for|and|at|in|llc|inc|co)\.?$/i.test(w))
    .map((w) => w[0].toUpperCase()).join("").slice(0, 3);
  $("#company-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return nameInput.focus();
    setOrg(null, name, monogram(name));
    dialog.close();
  });
  const openDialog = () => {
    nameInput.value = orgName === DEFAULT_ORG ? "" : orgName;
    messageEl.textContent = "Have a logo?";
    dialog.showModal();
    fitDialog();
    nameInput.focus();
  };
  // Every logo slot opens the picker, including ones the demo adds later.
  document.addEventListener("click", (e) => {
    if (e.target.closest(".org-logo") && !dialog.open) openDialog();
  });
  $("#logo-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.type === "image/png") {
      setOrg(URL.createObjectURL(file), nameInput.value.trim() || null);
      dialog.close();
    } else {
      messageEl.textContent = "That file isn't a PNG.";
    }
    fileInput.value = "";
  });
  resetBtn.addEventListener("click", () => {
    setOrg(null, null);
    dialog.close();
  });
  document.querySelectorAll(".org-logo").forEach(paintLogo);

  /* ---------- Liquid Glass ---------- */
  // Bends what sits behind each control near its edge, like iOS 27. Only Chromium can apply
  // an SVG filter to a backdrop, so other browsers keep the frosted look from the stylesheet.
  const glassDefs = $("#glass-defs");
  const canRefract = /\bChrom(e|ium)\//.test(navigator.userAgent);
  let glassCount = 0;
  const glassMap = (w, h, r, inset) => encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="x" x1="1" x2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#f00"/></linearGradient><linearGradient id="y" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#00f"/></linearGradient></defs><rect width="${w}" height="${h}" rx="${r}" fill="url(#x)"/><rect width="${w}" height="${h}" rx="${r}" fill="url(#y)" style="mix-blend-mode:screen"/><rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" rx="${Math.max(r - inset, 0)}" fill="#808080" style="filter:blur(${inset / 2}px)"/></svg>`);
  const glass = (el) => {
    if (!canRefract) return;
    const id = `gm-glass-${++glassCount}`;
    const f = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    f.id = id;
    f.setAttribute("color-interpolation-filters", "sRGB");
    glassDefs.appendChild(f);
    const paint = () => {
      const w = el.offsetWidth, h = el.offsetHeight;
      if (!w || !h) return;
      const inset = Math.min(5, h / 4);
      f.innerHTML = `<feImage x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" href="data:image/svg+xml,${glassMap(w, h, Math.min(h / 2, parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0), inset)}" result="map"/><feDisplacementMap in="SourceGraphic" in2="map" scale="-34" xChannelSelector="R" yChannelSelector="B"/>`;
      const v = `url(#${id}) blur(2.5px) saturate(1.7)`;
      el.style.webkitBackdropFilter = v;
      el.style.backdropFilter = v;
    };
    paint();
    new ResizeObserver(paint).observe(el);
  };
  document.querySelectorAll(".glass-btn, .contact-name, .compose-plus, .compose-field").forEach(glass);

  /* ---------- Attachments ---------- */
  const att = {
    quote: (from, text) => `<div class="att att-quote"><em>${from}</em>${text}</div>`,
    letter: () => `<div class="att">
      <div class="letter"><b>CITY HOUSING INSPECTION</b><i></i><i></i><i></i><i></i><u>REPAIR BY DEC 1</u></div>
      <div class="att-body"><strong>Code notice, 40 Oak St</strong><span>Scanned by Stablemail, 1 page</span></div></div>`,
    bill: () => `<div class="vcard">
      <div class="vcard-top">${logoSlot("org-logo-small org-logo-light")}<span>Ramp bill</span></div>
      <div class="vcard-num">$240.00</div>
      <div class="vcard-meta"><span>Harbor Plumbing</span><span>WO-1042</span><span>ACH</span></div></div>`,
    crm: () => `<div class="att crm"><strong>WO-1042, 12 Elm #2</strong><dl>
      <dt>Issue</dt><dd>Kitchen sink leak</dd><dt>Vendor</dt><dd>Harbor Plumbing</dd>
      <dt>Cost</dt><dd>$240, paid</dd><dt>Proof</dt><dd>Photos and invoice</dd></dl></div>`,
    link: () => `<div class="att linkcard"><div class="att-body"><strong>Emergency job WO-1052</strong><span>Harbor Plumbing on call, arriving 9:40 PM</span></div></div>`,
  };

  /* ---------- The widget ---------- */
  const widget = () => `<div class="widget">
    <div class="widget-top">${logoSlot("org-logo-small")}<span class="org-name">${esc(orgName)}</span><small>Today</small></div>
    <p class="widget-rent"><span>Rent collected</span><b data-w="rent">$41,200</b> <i>of $43,800</i></p>
    <div class="widget-bar"><b data-w="bar" style="width: 94%"></b></div>
    <div class="widget-stats">
      <div><b data-w="open">3</b><span>Open repairs</span></div>
      <div><b>1</b><span>Waiting on you</span></div>
      <div><b>$1,240</b><span>Bills due</span></div>
    </div></div>`;

  /* ---------- The demos ---------- */
  const chapters = [
    [
      { g: "Morning. A tenant at 12 Elm #2 texted at 7:40." },
      { a: () => att.quote("Ms. Okafor, tenant, by text", "Water's leaking under my kitchen sink. I put a bucket under it for now.") },
      { g: "Not an emergency. Harbor Plumbing can come at 1 today for about $250. Book it?" },
      { u: "yes" },
      { tapU: "like" },
      { g: "Booked as WO-1042. Ms. Okafor confirmed someone will be home." },
      { wait: 900 },
      { a: () => att.quote("Ms. Okafor, just now", "That's perfect. Thank you so much!") },
      { tapA: "heart" },
    ],
    [
      { g: "Letter just arrived at your Stablemail address. Scanning it now." },
      { a: att.letter, hold: 1900 },
      { g: "City notice for 40 Oak: loose railing on the rear stairs. Repair by Dec 1, reinspection Dec 8." },
      { u: "Get Luis on it and tell the owner" },
      { tapU: "like" },
      { g: "WO-1051 is open and Luis is booked for Thursday. Ms. Reyes has the reinspection date." },
      { tapG: "heart" },
    ],
    [
      { g: "Harbor Plumbing finished 12 Elm #2, and Ms. Okafor confirmed it's fixed. The invoice is $240." },
      { a: att.bill },
      { u: "Pay it" },
      { tapU: "like" },
      { g: "Sent by ACH and filed under WO-1042. The bookkeeper has the invoice." },
      { tapG: "like" },
    ],
    [
      { u: "Where are we on 12 Elm #2?" },
      { a: att.crm },
      { g: "Closed. It was fixed the same day, with the photos and invoice on file." },
      { u: "Send Mr. Walsh this month's repairs" },
      { tapU: "like" },
      { g: "Sent. Three jobs, $612 in total, each with its invoice." },
      { tapG: "heart" },
    ],
    [
      { u: "Make me a widget with rent collected, open repairs and bills due" },
      { tapU: "like" },
      { g: "Here it is, built from your CRM and Ramp. Tap to add it to your home screen." },
      { a: widget, hold: 1700 },
      { home: true },
    ],
    [
      { call: [
        ["Genie Marie", "Thanks for calling Your Company. Are you safe? Tell me what's happening."],
        ["Mr. Haddad, tenant", "I'm at 40 Oak, unit 3. Water's coming through my ceiling near the light."],
        ["Genie Marie", "Please stay away from that light and the wet area. I'm calling your manager and the on-call plumber now."],
      ] },
      { g: "Emergency at 40 Oak #3: water through the ceiling near a light. Calling you now, and the plumber is on the way." },
      { a: att.link },
      { u: "Approved. I'm calling Mr. Haddad" },
      { tapU: "like" },
      { g: "I'll text you when the plumber arrives, and Ms. Reyes gets an update tonight." },
    ],
  ];

  // Each demo happens at its own point in a manager's day.
  const chapterTimes = ["7:52 AM", "11:18 AM", "2:47 PM", "4:30 PM", "5:05 PM", "9:14 PM"];

  /* ---------- Playback ---------- */
  let runId = 0, current = 0, paused = false, onScreen = true;

  // All waits in a demo share one clock, so frame rounding never adds up and
  // the bar reaches the end exactly when the demo does.
  let clock = 0, deadline = 0, total = 1;
  // Seeking replays the demo from its start with no delay until it reaches skipTo. Every change to
  // the phone happens between waits, so the replay lands on the same screen as watching it.
  let skipTo = 0, scrubbing = false;
  const finishEntrances = () => screenEl.getAnimations({ subtree: true }).forEach((a) => {
    if (a.effect?.getComputedTiming().iterations !== Infinity) a.finish();
  });
  const wait = (ms, id) => {
    const target = (deadline += ms);
    if (id !== runId) return Promise.reject(new Error("cancelled"));
    if (target <= skipTo) { clock = target; return Promise.resolve(); }
    if (skipTo) { clock = skipTo; skipTo = 0; finishEntrances(); }
    return new Promise((resolve, reject) => {
      let last = performance.now();
      const tick = () => {
        if (id !== runId) return reject(new Error("cancelled"));
        const now = performance.now();
        if (!paused && onScreen && !scrubbing) clock += Math.min(now - last, 100);
        last = now;
        setProgress(current, Math.min(clock / total, 1));
        clock >= target ? resolve() : requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  };
  // rAF stops in background tabs, which also holds the demo there.

  // How long each step takes in play(). Keep the two in step.
  const TYPE_MS = 50, HOLD_MS = 2400, HOME_MS = [2400, 1300, 2600];
  const stepMs = (s) => {
    if (s.wait) return s.wait;
    if (s.g) return 750 + Math.min(s.g.length * 12, 900) + 800 + s.g.length * 18;
    if (s.a) return 800 + (s.hold || 1500);
    if (s.u) return 350 + s.u.length * TYPE_MS + 350 + 130 + 650;
    if (s.tapU) return 800;
    if (s.tapG || s.tapA) return 250 + 650 + 400 + 900;
    if (s.home) return HOME_MS.reduce((a, b) => a + b, 0);
    if (s.call) return 900 + s.call.reduce((t, [, text]) => t + 1100 + text.length * 26, 0) + 1300 + 320;
    return 0;
  };

  // iMessage's blue shifts down the screen: lighter at the top, deeper at the bottom.
  const bubbleBlue = (t) => {
    const p = Math.min(Math.max(t, 0), 1);
    return `rgb(${Math.round(54 - 53 * p)}, ${Math.round(170 - 34 * p)}, 253)`;
  };
  const paintBubbles = (els, box) => {
    const b = box.getBoundingClientRect();
    els.forEach((el) => {
      const r = el.getBoundingClientRect();
      const end = bubbleBlue((r.bottom - b.top) / b.height);
      el.style.background = `linear-gradient(${bubbleBlue((r.top - b.top) / b.height)}, ${end})`;
      el.style.setProperty("--tail", end);
    });
  };
  const toBottom = () => {
    thread.scrollTop = thread.scrollHeight;
    paintBubbles(thread.querySelectorAll(".msg-u"), thread);
  };
  const asks = document.querySelector(".asks");
  const paintAsks = () => paintBubbles(asks.querySelectorAll("li:not(.asks-delivered)"), asks);
  paintAsks();
  addEventListener("resize", paintAsks);
  new ResizeObserver(toBottom).observe(thread);
  const add = (cls, html) => {
    const el = document.createElement("div");
    el.className = cls;
    el.innerHTML = html;
    thread.appendChild(el);
    toBottom();
    return el;
  };
  const clearDelivered = () => thread.querySelectorAll(".delivered").forEach((d) => d.remove());
  const last = (sel) => { const all = thread.querySelectorAll(sel); return all[all.length - 1]; };

  // Reaction artwork, cut from Apple's iOS 27 reaction tray (assets/ios).
  const art = (name) => `<img src="assets/ios/${name}.png" alt="">`;
  [ "heart", "like", "dislike", "haha", "bang", "ask", "love", "smile" ].forEach((n) => { new Image().src = `assets/ios/${n}.png`; });
  const dim = $("#dim");
  const clearPress = () => {
    dim.classList.remove("is-on");
    thread.querySelectorAll(".is-lifted").forEach((m) => m.classList.remove("is-lifted"));
  };
  // Pressing a message greys the screen, opens the tray, highlights the choice, then closes into the reaction.
  const pickReaction = async (el, kind, id) => {
    if (!el) return;
    if (deadline + 1050 <= skipTo) {
      deadline += 1050;
      clock = deadline;
      return tapback(el, kind);
    }
    el.classList.add("has-tap", "is-lifted");
    dim.classList.add("is-on");
    const bud = document.createElement("span");
    bud.className = "tap tap-bud";
    bud.innerHTML = art("smile");
    const tray = document.createElement("div");
    tray.className = "tray";
    tray.innerHTML = ["heart", "like", "dislike", "haha", "bang", "ask", "love"].map((n) => `<span data-r="${n}">${art(n)}</span>`).join("");
    el.append(bud, tray);
    // The tray spans the screen and centers on it, wherever the message sits.
    const screenBox = dim.getBoundingClientRect();
    const scale = screenBox.width / dim.offsetWidth || 1;
    tray.style.width = `${Math.min(268, dim.offsetWidth - 16)}px`;
    tray.style.left = `${(screenBox.left + screenBox.width / 2 - el.getBoundingClientRect().left) / scale - tray.offsetWidth / 2}px`;
    glass(tray);
    try {
      await wait(650, id);
      tray.querySelector(`[data-r="${kind}"]`).classList.add("is-picked");
      await wait(400, id);
    } finally {
      tray.remove();
      bud.remove();
      clearPress();
    }
    tapback(el, kind);
  };
  const tapback = (el, kind) => {
    if (!el) return;
    el.classList.add("has-tap");
    const t = document.createElement("span");
    t.className = `tap tap-${kind}`;
    t.innerHTML = art(kind);
    el.appendChild(t);
    toBottom();
  };

  const showTyping = async (id, ms) => {
    const t = add("msg msg-g typing", "<i></i><i></i><i></i>");
    await wait(ms, id);
    t.remove();
  };

  const typeUser = async (text, id) => {
    compose.innerHTML = '<span id="typed"></span><span class="caret"></span>';
    const typed = compose.querySelector("#typed");
    send.classList.add("is-ready");
    for (let i = 1; i <= text.length; i++) {
      typed.textContent = text.slice(0, i);
      await wait(TYPE_MS, id);
    }
    await wait(350, id);
    send.classList.add("is-pressed");
    await wait(130, id);
    send.classList.remove("is-pressed", "is-ready");
    resetCompose();
  };
  const resetCompose = () => { compose.innerHTML = '<span class="compose-hint">iMessage</span>'; };

  const playCall = async (lines, id) => {
    callEl.hidden = false;
    callEl.classList.remove("is-leaving");
    callEl.innerHTML = `${logoSlot("org-logo-call")}
      <p class="call-label">After-hours line</p>
      <p class="call-who">Mr. Haddad, tenant</p>
      <p class="call-state" id="call-state">Answered by voice AI</p>
      <div class="wave" id="wave">${"<i></i>".repeat(11)}</div>
      <div class="lines" id="lines"></div>
      <span class="call-end" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6.600 10.800a15 15 0 0 0 6.600 6.600l2.200-2.200c.3-.3.700-.4 1-.2 1.100.4 2.300.6 3.600.6.600 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.600 21 3 13.400 3 4c0-.6.4-1 1-1h3.500c.6 0 1 .4 1 1 0 1.300.2 2.500.6 3.600.1.300 0 .7-.2 1z"/></svg></span>`;
    const box = callEl.querySelector("#lines");
    await wait(900, id);
    for (const [who, text] of lines) {
      const l = document.createElement("div");
      l.className = "line";
      l.innerHTML = `<b>${who}</b>${text.replace(DEFAULT_ORG, esc(orgName))}`;
      box.appendChild(l);
      await wait(1100 + text.length * 26, id);
    }
    callEl.querySelector("#call-state").textContent = "Manager and plumber alerted";
    callEl.querySelector("#wave").classList.add("is-quiet");
    await wait(1300, id);
    callEl.classList.add("is-leaving");
    await wait(320, id);
    callEl.hidden = true;
  };

  // The widget on the home screen, updating when a rent payment and a closed job come in.
  const playHome = async (id) => {
    homeEl.hidden = false;
    screenEl.classList.add("is-home");
    const icon = (src, plate) => `<img class="${plate ? "home-plate" : ""}" src="assets/brand/${src}" alt="">`;
    homeEl.innerHTML = `${widget()}
      <div class="home-icons">${icon("ramp.svg")}${icon("stable.png", true)}${icon("facetime.svg")}</div>
      <div class="home-dock">${icon("phone.svg")}${icon("imessage.svg")}</div>`;
    await wait(HOME_MS[0], id);
    const banner = document.createElement("div");
    banner.className = "home-banner";
    banner.innerHTML = `<b class="org-name">${esc(orgName)}</b>Rent in from 40 Oak #1, $1,400. WO-1048 closed.`;
    homeEl.prepend(banner);
    await wait(HOME_MS[1], id);
    const set = (key, value) => {
      const el = homeEl.querySelector(`[data-w="${key}"]`);
      el.textContent = value;
      el.classList.add("is-updated");
    };
    set("rent", "$42,600");
    set("open", "2");
    homeEl.querySelector('[data-w="bar"]').style.width = "97%";
    await wait(HOME_MS[2], id);
  };
  const clearHome = () => {
    homeEl.hidden = true;
    homeEl.textContent = "";
    screenEl.classList.remove("is-home");
  };

  const instant = (step) => {
    if (step.g) add("msg msg-g", step.g);
    if (step.u) add("msg msg-u", step.u);
    if (step.a) add("msg msg-attach", step.a());
    if (step.tapU) tapback(last(".msg-u"), step.tapU);
    if (step.tapG) tapback(last(".msg-g"), step.tapG);
    if (step.tapA) tapback(last(".msg-attach"), step.tapA);
    if (step.call) add("msg msg-g", `Voice AI answered an emergency call from Mr. Haddad.`);
  };

  const play = async (step, id) => {
    if (step.wait) return wait(step.wait, id);
    if (step.g) {
      await showTyping(id, 750 + Math.min(step.g.length * 12, 900));
      add("msg msg-g", step.g);
      return wait(800 + step.g.length * 18, id);
    }
    if (step.a) {
      await showTyping(id, 800);
      add("msg msg-attach", step.a());
      return wait(step.hold || 1500, id);
    }
    if (step.u) {
      await wait(350, id);
      await typeUser(step.u, id);
      clearDelivered();
      add("msg msg-u", step.u);
      add("delivered", "Delivered");
      return wait(650, id);
    }
    if (step.tapU) { tapback(last(".msg-u"), step.tapU); return wait(800, id); }
    if (step.tapG) { await wait(250, id); await pickReaction(last(".msg-g"), step.tapG, id); return wait(900, id); }
    if (step.tapA) { await wait(250, id); await pickReaction(last(".msg-attach"), step.tapA, id); return wait(900, id); }
    if (step.home) return playHome(id);
    if (step.call) return playCall(step.call, id);
  };

  const demoTime = $("#demo-time");
  const mmss = (ms) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
  const setProgress = (i, frac) => {
    const label = `${mmss(frac * total)} / ${mmss(total)}`;
    if (demoTime.textContent !== label) demoTime.textContent = label;
    chapterEls.forEach((c, n) => {
      c.querySelector(".bar b").style.width = n === i ? `${frac * 100}%` : "0";
    });
  };

  const run = async (i, startAt = 0) => {
    const id = ++runId;
    current = i;
    const [time, ampm] = chapterTimes[i].split(" ");
    $("#status-time").textContent = time;
    clearPress();
    thread.innerHTML = `<div class="stamp"><b>iMessage</b><br>Today ${time} ${ampm}</div>`;
    callEl.hidden = true;
    clearHome();
    resetCompose();
    send.classList.remove("is-ready", "is-pressed");
    chapterEls.forEach((c, n) => {
      c.classList.toggle("is-active", n === i);
      c.setAttribute("aria-pressed", String(n === i));
    });
    wireEls.forEach((w) => w.classList.toggle("is-active", +w.dataset.wire === i));
    const steps = chapters[i];
    if (reduced) {
      steps.forEach(instant);
      setProgress(i, 1);
      return;
    }
    clock = 0;
    deadline = 0;
    total = steps.reduce((t, s) => t + stepMs(s), HOLD_MS);
    skipTo = Math.min(startAt * total, total - 1);
    setProgress(i, skipTo / total);
    try {
      for (const step of steps) await play(step, id);
      await wait(HOLD_MS, id);
      run((i + 1) % chapters.length);
    } catch (e) {
      if (e.message !== "cancelled") throw e;
    }
  };

  // On small screens the tabs stick above the phone, so choosing a demo brings the phone fully into view.
  const narrow = matchMedia("(max-width: 820px)");
  let ignoreClick = false;
  const seek = (n, frac) => {
    document.body.classList.add("has-scrubbed");
    run(n, Math.min(Math.max(frac, 0), 1));
  };
  chapterEls.forEach((c, n) => {
    c.addEventListener("click", () => {
      if (ignoreClick) return;
      run(n);
      const bar = $(".chapters").getBoundingClientRect();
      if (narrow.matches && stage.getBoundingClientRect().bottom > innerHeight) scrollBy(0, bar.top);
    });
    c.addEventListener("keydown", (e) => {
      if (reduced || n !== current || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      e.preventDefault();
      seek(n, (clock + (e.key === "ArrowLeft" ? -2000 : 2000)) / total);
    });
    // Dragging the slider moves through this demo, and holds it there until released.
    const slider = c.querySelector(".bar");
    const fracAt = (e) => {
      const r = slider.getBoundingClientRect();
      return (e.clientX - r.left) / r.width;
    };
    let pending = null;
    slider.addEventListener("pointerdown", (e) => {
      if (reduced) return;
      e.preventDefault();
      slider.setPointerCapture(e.pointerId);
      scrubbing = ignoreClick = true;
      seek(n, fracAt(e));
    });
    slider.addEventListener("pointermove", (e) => {
      if (!slider.hasPointerCapture(e.pointerId)) return;
      if (pending === null) requestAnimationFrame(() => { seek(n, pending); pending = null; });
      pending = fracAt(e);
    });
    const release = () => {
      scrubbing = false;
      setTimeout(() => { ignoreClick = false; }, 100);
    };
    slider.addEventListener("pointerup", release);
    slider.addEventListener("pointercancel", release);
  });

  const pauseBtn = $("#pause");
  if (reduced) { pauseBtn.hidden = true; $("#scrub-note").hidden = true; }
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "Play demo" : "Pause demo";
    pauseBtn.setAttribute("aria-pressed", String(paused));
    $(".gm-hero").classList.toggle("is-paused", paused);
  });

  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0.2 }).observe(stage);

  run(0);
})();
