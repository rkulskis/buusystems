(() => {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (s) => document.querySelector(s);
  const thread = $("#thread"), compose = $("#compose"), send = $("#send"), callEl = $("#call");
  const chapterEls = [...document.querySelectorAll(".chapter")];
  const stage = $(".phone");
  const wireEls = [...document.querySelectorAll(".wires path")];

  /* ---------- The school's logo slot ---------- */
  const DEFAULT_ORG = "Your School";
  const SCHOOLS = window.GM_SCHOOLS || [];
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
    resetBtn.hidden = !hasLogo();
    const press = matchMedia("(hover: none)").matches ? "Tap" : "Click";
    logoStatus.textContent = `${press} it ${hasLogo() ? "to change" : "to find"} your school.`;
    document.querySelectorAll(".line").forEach((l) => { l.innerHTML = l.innerHTML.replace(prevOrg, esc(orgName)); });
    prevOrg = esc(orgName);
  };
  let prevOrg = DEFAULT_ORG;

  const fileInput = $("#logo-file"), resetBtn = $("#logo-reset"), logoStatus = $("#logo-status");
  const dialog = $("#school-dialog"), searchInput = $("#company-search");
  // Keeps the whole picker above the on-screen keyboard.
  const fitDialog = () => { if (window.visualViewport) dialog.style.maxHeight = `min(36rem, ${visualViewport.height - 24}px)`; };
  window.visualViewport?.addEventListener("resize", fitDialog);
  const resultsEl = $("#company-results"), statusEl = $("#search-status");

  /* ---------- Find your school ---------- */
  const fold = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const monogram = (name) => name.split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w) && !/^(of|the|for|and|school|high|at|in|public|charter)$/i.test(w))
    .map((w) => w[0].toUpperCase()).join("").slice(0, 3);
  SCHOOLS.forEach((s) => { s.mono = monogram(s.n); s.hay = fold(`${s.n} ${s.a || ""} ${s.mono}`); });

  let results = [], activeIndex = -1;
  const setActive = (i) => {
    activeIndex = i;
    [...resultsEl.children].forEach((li, n) => {
      li.classList.toggle("is-active", n === i);
      li.setAttribute("aria-selected", String(n === i));
      if (n === i) li.scrollIntoView({ block: "nearest" });
    });
    if (i >= 0) searchInput.setAttribute("aria-activedescendant", `school-${i}`);
    else searchInput.removeAttribute("aria-activedescendant");
  };
  const choose = (s) => {
    setOrg(s.i ? `assets/schools/${s.i}` : null, s.n, s.i ? null : s.mono);
    dialog.close();
  };
  const render = (list) => {
    results = list;
    activeIndex = -1;
    searchInput.removeAttribute("aria-activedescendant");
    resultsEl.textContent = "";
    list.forEach((s, i) => {
      const li = document.createElement("li");
      li.id = `school-${i}`;
      li.className = "company";
      li.setAttribute("role", "option");
      li.setAttribute("aria-selected", "false");
      const logo = document.createElement("span");
      if (s.i) {
        logo.className = "company-logo";
        const img = document.createElement("img");
        img.src = `assets/schools/${s.i}`;
        img.alt = "";
        img.loading = "lazy";
        logo.append(img);
      } else {
        logo.className = "company-logo mono";
        logo.textContent = s.mono;
      }
      const text = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = s.n;
      const kind = document.createElement("span");
      kind.className = "kind";
      kind.textContent = s.k;
      text.append(name, kind);
      li.append(logo, text);
      li.addEventListener("click", () => choose(s));
      resultsEl.appendChild(li);
    });
  };
  const search = (raw) => {
    const q = fold(raw.trim());
    const terms = q.split(/\s+/).filter(Boolean);
    const list = SCHOOLS.filter((s) => terms.every((t) => s.hay.includes(t)));
    const starts = (s) => (fold(s.n).startsWith(q) ? 0 : 1);
    list.sort((a, b) => starts(a) - starts(b));
    render(list);
    statusEl.textContent = list.length ? "Not listed?" : "No match.";
  };
  searchInput.addEventListener("input", () => search(searchInput.value));
  searchInput.addEventListener("keydown", (e) => {
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((activeIndex + 1) % results.length); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((activeIndex - 1 + results.length) % results.length); }
    if (e.key === "Enter") { e.preventDefault(); choose(results[activeIndex < 0 ? 0 : activeIndex]); }
  });
  const openDialog = () => {
    searchInput.value = "";
    search("");
    dialog.showModal();
    fitDialog();
    searchInput.focus();
  };
  // Every logo slot opens the search, including ones the demo adds later.
  document.addEventListener("click", (e) => {
    if (e.target.closest(".org-logo") && !dialog.open) openDialog();
  });
  $("#school-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;
    if (file.type === "image/png") {
      setOrg(URL.createObjectURL(file), null);
      dialog.close();
    } else {
      statusEl.textContent = "That file isn't a PNG.";
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
      <div class="letter"><b>COUNTY FIRE MARSHAL</b><i></i><i></i><i></i><i></i><u>INSPECTION FEE DUE DEC 1</u></div>
      <div class="att-body"><strong>Annual fire inspection</strong><span>Scanned by Stablemail, 1 page</span></div></div>`,
    card: () => `<div class="vcard">
      <div class="vcard-top">${logoSlot("org-logo-small org-logo-light")}<span>Ramp virtual card</span></div>
      <div class="vcard-num">&bull;&bull;&bull;&bull; 4821</div>
      <div class="vcard-meta"><span>Robotics</span><span>$2,000 limit</span><span>Ends Fri</span></div></div>`,
    crm: () => `<div class="att crm"><strong>Baptiste family</strong><dl>
      <dt>Stage</dt><dd>Enrollment</dd><dt>Owner</dt><dd>Ms. Murphy</dd>
      <dt>Last</dt><dd>Main office call, Tue</dd><dt>Next</dt><dd>Prior school transcripts</dd></dl></div>`,
    link: () => `<div class="att linkcard"><div class="att-body"><strong>Enrollment visit, Tue 9:00 AM</strong><span>Reminder link sent to Ms. Baptiste</span></div></div>`,
  };

  /* ---------- The demos ---------- */
  const chapters = [
    [
      { g: "Morning. 46 parent messages came in overnight. I answered 44. Two need you." },
      { a: () => att.quote("Ms. Sullivan, parent, by email", "Could the make-up exam move to Friday? There's an away game Thursday.") },
      { u: "Yes if Mr. Russo agrees, offer Friday at 3:15" },
      { tapU: "like" },
      { g: "Mr. Russo agreed, and I sent the family the new time." },
      { wait: 900 },
      { a: () => att.quote("Ms. Sullivan, just now", "That's perfect. Thank you so much!") },
      { tapA: "heart" },
    ],
    [
      { g: "Letter just arrived at your Stablemail address. Scanning it now." },
      { a: att.letter, hold: 1900 },
      { g: "It's the annual fire inspection: $120 fee, due Dec 1. The inspector visits the week of Dec 8." },
      { u: "Pay it on the facilities card and tell Mr. Medeiros" },
      { tapU: "like" },
      { g: "Paid and filed under Facilities. Mr. Medeiros has the inspection dates." },
      { tapG: "heart" },
    ],
    [
      { call: [
        ["Genie Marie", "Thanks for calling Your School. Who can I help you reach?"],
        ["Ms. Baptiste, parent", "We're moving here next month, and I'm not sure who handles enrollment."],
        ["Genie Marie", "That's Ms. Murphy, our registrar. I'll put you through and text you a reminder for your visit."],
      ] },
      { g: "A new family called about enrollment. I put Ms. Baptiste through to Ms. Murphy." },
      { a: att.link },
      { u: "Perfect, make sure Mr. Nguyen has it too" },
      { tapU: "like" },
      { g: "Done. It's on the counselor's calendar for Tuesday." },
    ],
    [
      { u: "Need a card for the robotics trip to state, $2k cap, ends Friday" },
      { tapU: "like" },
      { a: att.card },
      { g: "Issued through Ramp. Only travel and hotel vendors can charge it." },
      { u: "Give it to Ms. Cabral" },
      { g: "Ms. Cabral has it. I'll close it Friday and send the receipts to the bookkeeper." },
      { tapG: "like" },
    ],
    [
      { u: "Where do we stand with the Baptiste enrollment?" },
      { a: att.crm },
      { g: "Almost done. Only the transcripts from the prior school are missing." },
      { u: "Log that and remind Ms. Murphy Thursday" },
      { tapU: "like" },
      { g: "Logged in the CRM. Ms. Murphy gets a reminder Thursday morning." },
      { tapG: "heart" },
    ],
  ];

  // Each demo happens at its own point in the school day.
  const chapterTimes = ["7:52 AM", "11:18 AM", "1:36 PM", "2:47 PM", "3:24 PM"];

  /* ---------- Playback ---------- */
  let runId = 0, current = 0, paused = false, onScreen = true;

  // All waits in a demo share one clock, so frame rounding never adds up and
  // the bar reaches the end exactly when the demo does.
  let clock = 0, deadline = 0, total = 1;
  const wait = (ms, id) => new Promise((resolve, reject) => {
    const target = (deadline += ms);
    let last = performance.now();
    const tick = () => {
      if (id !== runId) return reject(new Error("cancelled"));
      const now = performance.now();
      if (!paused && onScreen) clock += Math.min(now - last, 100);
      last = now;
      setProgress(current, Math.min(clock / total, 1));
      clock >= target ? resolve() : requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  // rAF stops in background tabs, which also holds the demo there.

  // How long each step takes in play(). Keep the two in step.
  const TYPE_MS = 50, HOLD_MS = 2400;
  const stepMs = (s) => {
    if (s.wait) return s.wait;
    if (s.g) return 750 + Math.min(s.g.length * 12, 900) + 800 + s.g.length * 18;
    if (s.a) return 800 + (s.hold || 1500);
    if (s.u) return 350 + s.u.length * TYPE_MS + 350 + 130 + 650;
    if (s.tapU) return 800;
    if (s.tapG || s.tapA) return 250 + 650 + 400 + 900;
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
      <p class="call-label">Main office line</p>
      <p class="call-who">Ms. Baptiste, parent</p>
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
    callEl.querySelector("#call-state").textContent = "Transferred to Ms. Murphy";
    callEl.querySelector("#wave").classList.add("is-quiet");
    await wait(1300, id);
    callEl.classList.add("is-leaving");
    await wait(320, id);
    callEl.hidden = true;
  };

  const instant = (step) => {
    if (step.g) add("msg msg-g", step.g);
    if (step.u) add("msg msg-u", step.u);
    if (step.a) add("msg msg-attach", step.a());
    if (step.tapU) tapback(last(".msg-u"), step.tapU);
    if (step.tapG) tapback(last(".msg-g"), step.tapG);
    if (step.tapA) tapback(last(".msg-attach"), step.tapA);
    if (step.call) add("msg msg-g", `Voice AI answered a call from Ms. Baptiste about enrollment.`);
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
    if (step.call) return playCall(step.call, id);
  };

  const setProgress = (i, frac) => {
    chapterEls.forEach((c, n) => {
      c.querySelector(".bar b").style.width = n === i ? `${frac * 100}%` : "0";
    });
  };

  const run = async (i) => {
    const id = ++runId;
    current = i;
    const [time, ampm] = chapterTimes[i].split(" ");
    $("#status-time").textContent = time;
    clearPress();
    thread.innerHTML = `<div class="stamp"><b>iMessage</b><br>Today ${time} ${ampm}</div>`;
    callEl.hidden = true;
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
    setProgress(i, 0);
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
  chapterEls.forEach((c, n) => c.addEventListener("click", () => {
    run(n);
    const bar = $(".chapters").getBoundingClientRect();
    if (narrow.matches && stage.getBoundingClientRect().bottom > innerHeight) scrollBy(0, bar.top);
  }));

  const pauseBtn = $("#pause");
  if (reduced) pauseBtn.hidden = true;
  pauseBtn.addEventListener("click", () => {
    paused = !paused;
    pauseBtn.textContent = paused ? "Play demo" : "Pause demo";
    pauseBtn.setAttribute("aria-pressed", String(paused));
    $(".gm-hero").classList.toggle("is-paused", paused);
  });

  new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; }, { threshold: 0.2 }).observe(stage);

  run(0);
})();
