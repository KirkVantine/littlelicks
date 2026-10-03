(function () {
  const $ = (s) => document.querySelector(s);
  const BOOKING_EMAIL = "parkwv@gmail.com";
  const FB_PAGE = "https://www.facebook.com/profile.php?id=61576144164026";

  /* ---------- mobile menu ---------- */
  const menuBtn = $(".menu-btn"), nav = $("#nav");
  menuBtn.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open);
  });
  nav.addEventListener("click", (e) => {
    if (e.target.tagName === "A") { nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); }
  });

  /* ---------- truck ---------- */
  const truck = $("#truck");
  // Bell sound is synthesized, so there is no audio file to load. It only plays on a tap.
  let audio;
  function ding(at, freq) {
    const out = audio.createGain();
    out.gain.setValueAtTime(0.0001, at);
    out.gain.exponentialRampToValueAtTime(0.22, at + 0.004);
    out.gain.exponentialRampToValueAtTime(0.0001, at + 1.1);
    out.connect(audio.destination);
    [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]].forEach(([ratio, level]) => {
      const osc = audio.createOscillator(), g = audio.createGain();
      osc.frequency.value = freq * ratio;
      g.gain.value = level;
      osc.connect(g); g.connect(out);
      osc.start(at); osc.stop(at + 1.15);
    });
  }
  function ringBell() {
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      audio.resume();
      const t = audio.currentTime + 0.03;
      [0, 0.17, 0.34, 0.51, 0.85, 1.02, 1.19].forEach((d, i) => ding(t + d, i % 2 ? 1870 : 2090));
    } catch (e) { /* no sound available; the truck still jingles */ }
  }

  $("#bell").addEventListener("click", () => {
    ringBell();
    truck.classList.remove("ring");
    void truck.offsetWidth;
    truck.classList.add("ring");
  });

  /* ---------- schedule ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const now = new Date();
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const asDate = (s) => new Date(s + "T12:00:00");
  const fmt = (s, opts) => asDate(s).toLocaleDateString("en-US", opts);

  function stopItem(s) {
    const li = document.createElement("li");
    if (s.date === today) li.className = "is-today";
    const tag = s.date === today ? '<span class="tag">Today</span>' : "";
    li.innerHTML =
      `<time datetime="${s.date}"><span>${fmt(s.date, { month: "short" })}</span><b>${fmt(s.date, { day: "numeric" })}</b><span>${fmt(s.date, { weekday: "short" })}</span></time>` +
      `<div><h4>${s.name} ${tag}</h4><p class="where">${s.place}, ${s.time}</p>${s.note ? `<p class="note">${s.note}</p>` : ""}</div>`;
    return li;
  }

  const upcoming = STOPS.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = STOPS.filter((s) => s.date < today).sort((a, b) => b.date.localeCompare(a.date));
  const upEl = $("#upcoming"), pastEl = $("#past"), nextEl = $("#nextStop");

  if (upcoming.length) {
    upcoming.forEach((s) => upEl.appendChild(stopItem(s)));
    const n = upcoming[0];
    const when = n.date === today ? "Today" : fmt(n.date, { weekday: "long", month: "long", day: "numeric" });
    nextEl.innerHTML = `<b>${when}:</b> ${n.name}, ${n.place}. <a href="#find">All stops</a>`;
  } else {
    const li = document.createElement("li");
    li.className = "empty";
    li.innerHTML = `<p>No public stops on the calendar right now. New ones go up on <a href="${FB_PAGE}" target="_blank" rel="noopener">Facebook</a> first, or you can <a href="#book">book the truck</a> for your own event.</p>`;
    upEl.appendChild(li);
    nextEl.innerHTML = `Open dates available. <a href="#book">Book the truck</a>`;
  }
  // With a short "Coming up" list, show the latest past stops in the open so the column isn't empty.
  const recent = upcoming.length < 3 ? past.slice(0, 2) : [];
  if (recent.length) {
    recent.forEach((s) => $("#recent").appendChild(stopItem(s)));
    $("#recentWrap").hidden = false;
  }
  past.slice(recent.length).forEach((s) => pastEl.appendChild(stopItem(s)));
  if (past.length <= recent.length) pastEl.closest("details").hidden = true;

  /* ---------- Facebook feed (loads when scrolled near) ---------- */
  const frame = $("#feedFrame");
  function loadFeed() {
    const w = Math.max(280, Math.min(380, Math.floor(frame.clientWidth)));
    const f = document.createElement("iframe");
    f.title = "Latest posts from Little Licks Tasty Treats on Facebook";
    f.loading = "lazy";
    f.width = w; f.height = 400;
    f.src = "https://www.facebook.com/plugins/page.php?href=" + encodeURIComponent(FB_PAGE) +
      `&tabs=timeline&width=${w}&height=400&small_header=true&adapt_container_width=true&hide_cover=false&show_facepile=false`;
    frame.prepend(f);
  }
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((en) => { if (en[0].isIntersecting) { loadFeed(); io.disconnect(); } }, { rootMargin: "400px" });
    io.observe(frame);
  } else loadFeed();

  /* ---------- gallery ---------- */
  const gal = $("#gallery"), lb = $("#lightbox"), lbImg = $("#lbImg"), lbCap = $("#lbCap");
  let shown = PHOTOS, at = 0;
  function drawGallery(kind) {
    shown = kind === "all" ? PHOTOS : PHOTOS.filter((p) => p.kind === kind);
    gal.innerHTML = "";
    shown.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<button type="button" aria-label="View photo: ${p.cap}"><img src="${p.src}" alt="${p.alt}" loading="lazy"></button>`;
      li.firstChild.addEventListener("click", () => openAt(i));
      gal.appendChild(li);
    });
  }
  function openAt(i) {
    at = (i + shown.length) % shown.length;
    lbImg.src = shown[at].src; lbImg.alt = shown[at].alt; lbCap.textContent = shown[at].cap;
    if (!lb.open) lb.showModal();
  }
  document.querySelectorAll(".chip").forEach((c) => c.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", x === c));
    drawGallery(c.dataset.filter);
  }));
  $("#lbClose").addEventListener("click", () => lb.close());
  $("#lbPrev").addEventListener("click", () => openAt(at - 1));
  $("#lbNext").addEventListener("click", () => openAt(at + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
  lb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") openAt(at - 1);
    if (e.key === "ArrowRight") openAt(at + 1);
  });
  drawGallery("all");

  /* ---------- booking form ---------- */
  const form = $("#bookForm"), errBox = $("#formErrors"), sent = $("#sent"), sentBody = $("#sentBody");
  $("#date").min = today;

  const rules = {
    name: (v) => v.trim() ? "" : "Enter your name.",
    email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? "" : "Enter an email address Heather can reply to, like name@example.com.",
    type: (v) => v ? "" : "Choose the kind of event.",
    date: (v) => !v ? "Pick the date of your event." : v < today ? "Pick a date that hasn't passed." : "",
    place: (v) => v.trim() ? "" : "Enter the address or venue so Heather knows how far the drive is."
  };

  function setError(id, msg) {
    const input = document.getElementById(id), field = input.closest(".field");
    let p = field.querySelector(".err");
    if (!msg) { if (p) p.remove(); input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); return; }
    if (!p) { p = document.createElement("p"); p.className = "err"; p.id = id + "Err"; field.appendChild(p); }
    p.textContent = msg;
    input.setAttribute("aria-invalid", "true");
    input.setAttribute("aria-describedby", p.id);
  }
  Object.keys(rules).forEach((id) => {
    document.getElementById(id).addEventListener("blur", (e) => setError(id, rules[id](e.target.value)));
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const problems = Object.keys(rules).map((id) => [id, rules[id](d[id] || "")]).filter((x) => x[1]);
    Object.keys(rules).forEach((id) => setError(id, rules[id](d[id] || "")));
    if (problems.length) {
      errBox.innerHTML = `<p>${problems.length === 1 ? "One thing needs fixing" : problems.length + " things need fixing"} before this can be sent:</p><ul>` +
        problems.map(([id, m]) => `<li><a href="#${id}">${m}</a></li>`).join("") + "</ul>";
      errBox.hidden = false; errBox.focus();
      return;
    }
    errBox.hidden = true;

    const ref = "LL-" + d.date.replace(/-/g, "").slice(2) + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const niceDate = fmt(d.date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const niceTime = d.time ? new Date("2000-01-01T" + d.time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "Flexible";
    const body = [
      "EVENT REQUEST " + ref,
      "",
      "Event:     " + d.type,
      "Date:      " + niceDate,
      "Start:     " + niceTime,
      "Where:     " + d.place.trim(),
      "Guests:    " + (d.guests || "Not sure yet"),
      "Treats:    " + d.pay,
      "",
      "From:      " + d.name.trim(),
      "Email:     " + d.email.trim(),
      "Phone:     " + (d.phone.trim() || "Not given"),
      "",
      "Notes:",
      d.notes.trim() || "None"
    ].join("\n");

    sentBody.textContent = body;
    form.hidden = true; sent.hidden = false; sent.focus();
    const subject = `Truck request: ${d.type}, ${fmt(d.date, { month: "short", day: "numeric" })} (${ref})`;
    window.location.href = `mailto:${BOOKING_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  });

  $("#copyReq").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(sentBody.textContent); $("#copyMsg").textContent = "Request copied."; }
    catch { $("#copyMsg").textContent = "Copying is blocked in this browser. Select the text above and copy it."; }
  });
  $("#newReq").addEventListener("click", () => {
    form.reset(); sent.hidden = true; form.hidden = false; $("#copyMsg").textContent = ""; $("#name").focus();
  });
})();
