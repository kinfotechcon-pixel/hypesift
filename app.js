(function () {
  "use strict";

  var D = window.HYPESIFT_DATA || { checked: "", packs: [], tips: {} };
  var CHECKED = D.checked, PACKS = D.packs, TIPS = D.tips;
  if (!Array.isArray(PACKS) || !PACKS.length) {
    var box = document.querySelector("#app");
    if (box) box.textContent = "Cases didn't load. Refresh to try again.";
    return;
  }
  var CASES = PACKS[PACKS.length - 1].cases;

  var VERDICTS = [
    { k: "solid", name: "Signal", sub: "Holds up", glyph: "✓", color: "var(--signal)" },
    { k: "overstated", name: "Hype", sub: "Overstated", glyph: "!", color: "var(--hype)" },
    { k: "context", name: "Fine print", sub: "Missing context", glyph: "?", color: "var(--ctx)" }
  ];
  var VNAME = { solid: "Signal", overstated: "Hype", context: "Fine print" };
  var VCOLOR = { solid: "var(--signal)", overstated: "var(--hype)", context: "var(--ctx)" };
  var CONF = [
    { k: 0, name: "Guess", sub: "50/50" },
    { k: 1, name: "Likely", sub: "Probably" },
    { k: 2, name: "Certain", sub: "Sure" }
  ];
  var RANKS = [[750, "Master Sifter"], [650, "Signal Spotter"], [500, "Careful Reader"], [300, "Skeptic in Training"], [0, "Hype Magnet"]];

  var $ = function (s) { return document.querySelector(s); };
  var app = $("#app");
  var S = { pack: PACKS[0], order: [], i: 0, score: 0, streak: 0, log: [], pick: {} };
  var screen = "intro";
  var SITE = "https://kinfotechcon-pixel.github.io/hypesift/";
  var cardCanvas = null; // the latest share card, so the Share button can attach it

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    for (var k in (attrs || {})) {
      if (k === "text") n.textContent = attrs[k];
      else if (k === "class") n.className = attrs[k];
      else if (k === "html") n.innerHTML = attrs[k];
      else n.setAttribute(k, attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function glyph(v) { var g = el("span", { class: "g", text: v.glyph }); g.style.background = v.color; return g; }
  function stat(n, t) { return el("div", { class: "tile" }, [el("b", { text: n }), el("span", { text: t })]); }

  /* ---------- header and progress dots ---------- */
  function setChrome(mode) {
    var playing = mode === "play";
    $("#hud").hidden = !playing;
    $("#dots").hidden = !playing;
    $("#navProfile").hidden = playing;
    $("#navComm").hidden = playing || !DB;
    $("#navInbox").hidden = playing || !(DB && ADMIN);
    if (!playing) UI = null;
    if (playing) {
      $("#hCase").textContent = Math.min(S.i + 1, CASES.length);
      $("#hTotal").textContent = CASES.length;
      $("#hScore").textContent = S.score;
      var d = $("#dots"); d.innerHTML = "";
      for (var i = 0; i < CASES.length; i++) d.appendChild(el("i", { class: i < S.i ? (S.log[i] && !S.log[i].vOk ? "on no" : "on") : i === S.i ? "cur" : "" }));
    }
  }

  /* ---------- progress saved on this device ---------- */
  var KEY = "hypesift-v2";
  function blank() { return { runs: [], badges: {}, conf: [[0, 0], [0, 0], [0, 0]], days: [], packs: {} }; }
  function load() {
    var d = blank();
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var p = JSON.parse(raw); for (var k in d) { if (p && p[k]) d[k] = p[k]; } }
      var old = parseInt(localStorage.getItem("hypesift-best") || "0", 10);
      if (old && !d.packs[PACKS[0].id]) d.packs[PACKS[0].id] = { best: old, plays: 1 };
    } catch (e) {}
    return d;
  }
  var P = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(P)); } catch (e) {} }
  function dayStr(d) { var m = d.getMonth() + 1, x = d.getDate(); return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (x < 10 ? "0" : "") + x; }
  function dayStreak() {
    var set = {}; P.days.forEach(function (x) { set[x] = 1; });
    var d = new Date(); if (!set[dayStr(d)]) d.setDate(d.getDate() - 1);
    var n = 0; while (set[dayStr(d)]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function allPatterns() {
    var out = [];
    PACKS.forEach(function (pk) { pk.cases.forEach(function (c) { if (out.indexOf(c.pattern) < 0) out.push(c.pattern); }); });
    return out;
  }
  function rankFor(score, max) {
    var f = score / max;
    for (var i = 0; i < RANKS.length; i++) { if (f >= RANKS[i][0] / 800) return RANKS[i][1]; }
    return RANKS[RANKS.length - 1][1];
  }

  /* ---------- community (shared db; every call tolerates absence) ---------- */
  var DB = null, USER = null, UID = null, players = {}, dbState = "off", canWrite = true, loaded = false, pending = false, wq = Promise.resolve();
  var ADMIN = false, mySubs = [], allSubs = [], DL = null, UI = null, sq = Promise.resolve();
  var myDoc = { pub: false, display: "", cases: {}, scores: {}, runs: 0, badges: 0 };

  function pushMine() {
    if (!DB || !UID || !canWrite) return;
    if (!loaded) { pending = true; return; }
    myDoc.t = Date.now();
    var snap = JSON.parse(JSON.stringify(myDoc));
    wq = wq.then(function () { return DB.doc("players/" + UID).set(snap); }).catch(function (e) {
      if (e && e.code === "invalid_argument") canWrite = false;
    });
  }
  function onPlayers(snap) {
    var all = {};
    snap.docs.forEach(function (d) { all[d.id] = d.data(); });
    players = all;
    dbState = "ready";
    if (!loaded) {
      var mine = all[UID];
      if (mine) { try { var m = JSON.parse(JSON.stringify(mine)); myDoc = { pub: !!m.pub, display: typeof m.display === "string" ? m.display : "", cases: m.cases || {}, scores: m.scores || {}, runs: m.runs || 0, badges: m.badges || 0 }; } catch (e) {} }
      loaded = true;
      if (pending) { pending = false; pushMine(); }
    }
    if (screen === "community") community();
  }
  /* Where the community features come from: the Claude runtime when the page runs as a Claude artifact,
     otherwise the Supabase backend in backend.js when config.js holds a project URL and public key. */
  var WEB = false;
  function getPlatform() {
    var c = window.claude;
    if (c && c.use) {
      return Promise.all([c.use("user"), c.use("db"), c.use("downloads").catch(function () { return null; })]).then(function (r) {
        return { user: r[0], db: r[1], dl: r[2] || null, web: false };
      });
    }
    var cfg = window.HYPESIFT_CONFIG || {};
    var B = window.HypesiftBackend;
    if (B && cfg.supabaseUrl && cfg.supabaseAnonKey) {
      var b = B.create(cfg);
      return Promise.resolve({ user: b.user, db: b.db, dl: b.downloads, web: true });
    }
    return Promise.resolve({ user: null, db: null, dl: B ? B.downloads() : null, web: true });
  }
  function initCommunity() {
    getPlatform().then(function (p) {
      DL = p.dl || null; WEB = p.web; USER = p.user; DB = p.db;
      if (!DB || !USER) { DB = null; return; }
      return USER.id().then(function (id) {
        if (!id) { DB = null; return; }
        UID = id;
        return USER.can("data.write").then(function (w) { if (w === false) canWrite = false; return USER.canEdit(); }).then(function (a) { ADMIN = !!a; });
      }).then(function () {
        if (!DB) return;
        dbState = "loading";
        var timer = setTimeout(function () { if (dbState === "loading") { dbState = "slow"; if (screen === "community") community(); } }, 10000);
        DB.collection("players").onSnapshot(function (s) { clearTimeout(timer); onPlayers(s); }, function () { clearTimeout(timer); dbState = "error"; if (screen === "community") community(); });
        if (screen !== "play") { $("#navComm").hidden = false; $("#navInbox").hidden = !ADMIN; }
        DB.doc("submissions/" + UID).onSnapshot(function (d) {
          var x = d.exists ? d.data() : null;
          mySubs = x && Array.isArray(x.items) ? x.items : [];
          if (screen === "submit") submitScreen();
        }, function () {});
        if (ADMIN) {
          DB.collection("submissions").onSnapshot(function (s) {
            var all = [];
            s.docs.forEach(function (d) { var x = d.data(); ((x && x.items) || []).forEach(function (it) { all.push({ uid: d.id, it: it }); }); });
            allSubs = all;
            if (screen === "inbox") inbox();
          }, function () {});
        }
        if (screen === "intro") intro();
      });
    }).catch(function () { DB = null; });
  }

  function caseStats(c, skipUid) {
    var n = 0, ok = 0, dist = { solid: 0, overstated: 0, context: 0 };
    for (var id in players) {
      if (skipUid && id === skipUid) continue;
      var pc = players[id] && players[id].cases && players[id].cases[c.id];
      if (pc && dist[pc.v] !== undefined) { n++; dist[pc.v]++; if (pc.v === c.verdict) ok++; }
    }
    return { n: n, ok: ok, dist: dist };
  }

  /* ---------- intro ---------- */
  function intro() {
    screen = "intro"; setChrome("intro"); app.innerHTML = "";
    var pk = PACKS[PACKS.length - 1], rec = P.packs[pk.id], earned = Object.keys(P.badges).length;
    var play = el("button", { class: "btn block", type: "button", text: rec ? "Play again" : "Play " + pk.cases.length + " cases" });
    play.onclick = function () { start(pk); };
    var hero = el("section", { class: "hero" }, [
      el("h1", { html: '<span class="s">Signal</span> or <span class="h">hype?</span>' }),
      el("p", { text: "Judge " + pk.cases.length + " real AI claims from this week." }),
      el("div", { class: "chips" }, VERDICTS.map(function (v) { return el("span", { class: "vchip" }, [glyph(v), document.createTextNode(v.name)]); })),
      play,
      el("details", {}, [
        el("summary", { text: "How it works" }),
        el("div", { class: "in" }, [
          el("p", { class: "note", text: "Each case is a real AI claim. Pick Signal, Hype or Fine print. Then pick the clue that decides it. Then say how sure you are." }),
          el("p", { class: "note", text: "Scoring: 60 for the right call, 20 for the clue, and -20 to +20 for confidence. Certain and right pays most; Certain and wrong costs points." }),
          el("p", { class: "note", text: "Keyboard: press 1, 2, 3 to pick, and Enter to lock in or go to the next case." })
        ])
      ]),
      el("span", { class: "meta", text: rec ? "Best on this pack: " + rec.best + " / " + pk.cases.length * 100 : pk.label + " · checked " + pk.checked })
    ]);
    var stats = el("div", { class: "tiles" }, [
      stat(String(dayStreak()), "day streak"),
      stat(String(P.runs.length), "runs"),
      stat(earned + "/" + allPatterns().length, "badges")
    ]);
    app.appendChild(hero); app.appendChild(stats);
    if (DB) {
      var sg = el("button", { class: "btn ghost", type: "button", text: "Suggest a claim" });
      sg.onclick = function () { go("submit"); };
      app.appendChild(el("div", { class: "row" }, [sg]));
    }
    if (PACKS.length > 1) {
      var list = el("div", { class: "packs" });
      PACKS.slice(0, -1).reverse().forEach(function (p2) {
        var r2 = P.packs[p2.id], b = el("button", { class: "btn ghost", type: "button", text: "Play" });
        b.onclick = function () { start(p2); };
        list.appendChild(el("div", { class: "pack" }, [el("div", {}, [el("b", { text: p2.label }), el("small", { text: r2 ? "Best " + r2.best + " / " + p2.cases.length * 100 : "Not played" })]), b]));
      });
      app.appendChild(el("section", { class: "sec" }, [el("span", { class: "label", text: "Archive" }), list]));
    }
  }

  function start(pk) {
    CASES = pk.cases;
    S = { pack: pk, order: shuffle(CASES.map(function (_, i) { return i; })), i: 0, score: 0, streak: 0, log: [], pick: {} };
    commPack = pk; mark("play");
    play(); window.scrollTo(0, 0);
  }

  /* ---------- case ---------- */
  function play() {
    screen = "play";
    var c = CASES[S.order[S.i]];
    S.pick = {};
    setChrome("play"); app.innerHTML = "";

    var card = el("section", { class: "card" }, [
      el("div", { class: "tags" }, [
        el("span", { class: "chip", text: (c.primary ? "Source: " : "Via ") + c.src }),
        el("span", { class: "chip", text: c.date })
      ]),
      el("p", { class: "claim", text: c.claim })
    ]);

    var s1 = el("div", { class: "step" }, [el("span", { class: "label", text: "Your call" })]);
    var g1 = el("div", { class: "opts three", role: "radiogroup", "aria-label": "Your call" });
    VERDICTS.forEach(function (v) {
      var b = el("button", { class: "opt v", type: "button", role: "radio", "aria-checked": "false", "data-k": v.k }, [glyph(v), el("span", {}, [el("b", { text: v.name }), el("small", { text: v.sub })])]);
      b.style.setProperty("--c", v.color);
      b.onclick = function () { choose(g1, b); S.pick.verdict = v.k; reveal(s2); };
      g1.appendChild(b);
    });
    s1.appendChild(g1);

    var s2 = el("div", { class: "step", hidden: "" }, [el("span", { class: "label", text: "What decides it?" })]);
    var g2 = el("div", { class: "opts", role: "radiogroup", "aria-label": "What decides it?" });
    c.opts.forEach(function (t, idx) {
      var b = el("button", { class: "opt plain", type: "button", role: "radio", "aria-checked": "false", text: t });
      b.onclick = function () { choose(g2, b); S.pick.ev = idx; reveal(s3); };
      g2.appendChild(b);
    });
    s2.appendChild(g2);

    var s3 = el("div", { class: "step", hidden: "" }, [el("span", { class: "label", text: "How sure?" })]);
    var g3 = el("div", { class: "opts three keep", role: "radiogroup", "aria-label": "How sure?" });
    CONF.forEach(function (v) {
      var b = el("button", { class: "opt sm", type: "button", role: "radio", "aria-checked": "false" }, [el("b", { text: v.name }), el("small", { text: v.sub })]);
      b.onclick = function () { choose(g3, b); S.pick.conf = v.k; lock.disabled = false; };
      g3.appendChild(b);
    });
    s3.appendChild(g3);

    var lock = el("button", { class: "btn block sticky", type: "button", text: "Lock in" });
    lock.disabled = true;
    lock.onclick = function () { submit(c, card, [g1, g2, g3], lock); };

    [s1, s2, s3, lock].forEach(function (n) { card.appendChild(n); });
    UI = { g1: g1, g2: g2, g3: g3, s2: s2, s3: s3, lock: lock, next: null };
    app.appendChild(card);
  }
  function choose(group, btn) { Array.prototype.forEach.call(group.children, function (b) { b.setAttribute("aria-checked", b === btn ? "true" : "false"); }); }
  function reveal(n) { if (!n.hidden) return; n.hidden = false; try { n.scrollIntoView({ behavior: "smooth", block: "nearest" }); } catch (e) {} }

  function points(vOk, eOk, conf) {
    var bonus = vOk ? [6, 12, 20][conf] : [0, -8, -20][conf];
    return { cal: bonus, total: (vOk ? 60 : 0) + (eOk ? 20 : 0) + bonus };
  }

  function submit(c, card, groups, lock) {
    var vOk = S.pick.verdict === c.verdict, eOk = S.pick.ev === c.right;
    var pt = points(vOk, eOk, S.pick.conf);
    S.score = Math.max(0, S.score + pt.total);
    S.streak = vOk ? S.streak + 1 : 0;
    S.log.push({ c: c, vOk: vOk, eOk: eOk, conf: S.pick.conf, pts: pt.total });

    groups.forEach(function (g) { Array.prototype.forEach.call(g.children, function (b) { b.disabled = true; }); });
    Array.prototype.forEach.call(groups[0].children, function (b) {
      var k = b.getAttribute("data-k");
      if (k === c.verdict) b.classList.add("right");
      else if (b.getAttribute("aria-checked") === "true") b.classList.add("wrong");
    });
    Array.prototype.forEach.call(groups[1].children, function (b, idx) {
      if (idx === c.right) b.classList.add("right");
      else if (b.getAttribute("aria-checked") === "true") b.classList.add("wrong");
    });
    lock.remove();

    // community: the first pick on a case counts; compare against everyone else
    var crowd = null;
    if (DB && UID) {
      var st = caseStats(c, UID);
      st.dist[S.pick.verdict]++; st.n++; if (vOk) st.ok++;
      crowd = st;
      if (!myDoc.cases[c.id]) { myDoc.cases[c.id] = { v: S.pick.verdict, c: S.pick.conf }; pushMine(); }
    }

    var head = el("div", { class: "fb-head " + (vOk ? "ok" : "no") }, [
      el("h2", { text: (vOk ? "Right call" : "Not quite") + " · " + VNAME[c.verdict] }),
      el("p", { text: c.why })
    ]);
    var pts = el("div", { class: "pts" }, [
      el("span", { class: vOk ? "hi" : "lo", text: "Call " + (vOk ? "+60" : "0") }),
      el("span", { class: eOk ? "hi" : "lo", text: "Clue " + (eOk ? "+20" : "0") }),
      el("span", { class: pt.cal > 0 ? "hi" : pt.cal < 0 ? "lo" : "", text: "Sure " + (pt.cal > 0 ? "+" : "") + pt.cal }),
      el("span", { class: "tot", text: "= " + pt.total })
    ]);
    var body = el("div", { class: "fb-body" }, [pts]);
    if (crowd) body.appendChild(crowdBlock(crowd, vOk));

    var facts = el("ul", { class: "facts" }, c.facts.map(function (f) { return el("li", { text: f }); }));
    var det = el("details", {}, [
      el("summary", { text: "What the source says" }),
      el("div", { class: "in" }, [
        facts,
        el("div", { class: "pattern" }, [el("b", { text: c.pattern }), el("span", { text: TIPS[c.pattern] || "" })]),
        el("a", { href: c.url, target: "_blank", rel: "noopener", text: "Open the source" })
      ])
    ]);
    body.appendChild(det);
    var last = S.i === CASES.length - 1;
    var next = el("button", { class: "btn block sticky", type: "button", text: last ? "See results" : "Next case" });
    next.onclick = function () { S.i++; if (last) results(); else play(); window.scrollTo(0, 0); };
    if (UI) UI.next = next;
    body.appendChild(next);
    var fb = el("section", { class: "fb", "aria-live": "polite" }, [head, body]);
    app.appendChild(fb);
    $("#hScore").textContent = S.score;
    try { fb.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
  }

  function crowdBlock(st, vOk) {
    var box = el("div", { class: "crowd" });
    if (st.n < 3) { box.appendChild(el("span", { class: "meta", text: "Community results show once 3 players have called this." })); return box; }
    var split = el("div", { class: "split" });
    var leg = el("div", { class: "legend" });
    VERDICTS.forEach(function (v) {
      var pc = Math.round(st.dist[v.k] / st.n * 100);
      var seg = el("i", {}); seg.style.width = (st.dist[v.k] / st.n * 100) + "%"; seg.style.background = v.color; split.appendChild(seg);
      leg.appendChild(el("span", { html: v.name + " <em>" + pc + "%</em>" }));
    });
    box.appendChild(el("span", { class: "label", text: "You vs " + (st.n - 1) + " others" }));
    box.appendChild(split); box.appendChild(leg);
    return box;
  }

  /* ---------- results ---------- */
  function results() {
    screen = "results"; setChrome("results");
    var pk = S.pack, max = CASES.length * 100, total = S.score, n = CASES.length;
    var vRight = S.log.filter(function (l) { return l.vOk; }).length;
    var eRight = S.log.filter(function (l) { return l.eOk; }).length;
    var sure = S.log.filter(function (l) { return l.conf === 2; });
    var sureRight = sure.filter(function (l) { return l.vOk; }).length;
    var rank = rankFor(total, max);

    var today = dayStr(new Date());
    var rec = P.packs[pk.id] || { best: 0, plays: 0 };
    var prev = rec.best, isBest = total > prev;
    S.log.forEach(function (l) { var c = P.conf[l.conf]; c[0]++; if (l.vOk) c[1]++; });
    var fresh = [];
    S.log.forEach(function (l) {
      if (l.vOk && l.eOk) {
        var b = P.badges[l.c.pattern];
        if (!b) { b = P.badges[l.c.pattern] = { n: 0, first: today }; fresh.push(l.c.pattern); }
        b.n++;
      }
    });
    P.runs.push({ t: Date.now(), pack: pk.id, score: total, max: max, v: vRight });
    P.runs = P.runs.slice(-200);
    if (P.days.indexOf(today) < 0) P.days.push(today);
    P.days = P.days.slice(-400);
    P.packs[pk.id] = { best: Math.max(prev, total), plays: rec.plays + 1 };
    save();
    // the board keeps only the first completed run on each pack; replays are practice
    var practice = false;
    if (DB && UID) {
      if (typeof myDoc.scores[pk.id] === "number") practice = true;
      else myDoc.scores[pk.id] = total;
      myDoc.runs = P.runs.length; myDoc.badges = Object.keys(P.badges).length;
      pushMine();
    }

    app.innerHTML = "";
    var num = el("span", { class: "n", text: "0" });
    var top = el("section", { class: "hero" }, [
      el("div", { class: "score" }, [num, el("span", { class: "d", text: "/ " + max })]),
      el("h1", { class: "rank", text: rank }),
      el("span", { class: "meta", text: (isBest && prev ? "New best (was " + prev + ")" : prev ? "Best: " + Math.max(prev, total) : "First run saved") + " · " + dayStreak() + "-day streak" })
    ]);
    var stats = el("div", { class: "tiles" }, [
      stat(vRight + "/" + n, "right calls"),
      stat(eRight + "/" + n, "clues found"),
      stat(sure.length ? sureRight + "/" + sure.length : "–", "Certain, right")
    ]);
    if (practice) top.appendChild(el("span", { class: "meta", text: "Practice run, not on the board" }));
    var blocks = [top, stats];
    if (fresh.length) blocks.push(el("div", { class: "newb" }, [el("span", { class: "label", text: "New badges" })].concat(fresh.map(function (f) { return el("span", { class: "b", text: f }); }))));
    blocks.push(el("div", { class: "list" }, S.log.map(function (l) {
      return el("div", { class: "li" }, [
        el("span", { class: "m " + (l.vOk ? "ok" : "no"), text: l.vOk ? "✓" : "×" }),
        el("div", { class: "t" }, [document.createTextNode(l.c.title), el("small", { text: VNAME[l.c.verdict] + " · " + l.c.pattern })]),
        el("span", { class: "p", text: l.pts })
      ]);
    })));
    var again = el("button", { class: "btn", type: "button", text: "Play again" });
    again.onclick = function () { start(pk); };
    var row = [again];
    if (DB) { var bd = el("button", { class: "btn ghost", type: "button", text: "Leaderboard" }); bd.onclick = function () { commPack = pk; go("community"); }; row.push(bd); }
    var base = "Hypesift: " + total + "/" + max + " (" + rank + "). " + vRight + "/" + n + " right calls. Signal or hype?";
    var shareText = base + " " + SITE;
    var copy = el("button", { class: "btn ghost", type: "button", text: "Copy result" });
    copy.onclick = function () {
      var t = shareText;
      var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy result"; }, 1800); };
      try { navigator.clipboard.writeText(t).then(done, function () { copy.textContent = t; }); } catch (e) { copy.textContent = t; }
    };
    if (DB) {
      var sg = el("button", { class: "btn ghost", type: "button", text: "Suggest a claim" });
      sg.onclick = function () { go("submit"); };
      row.push(sg);
    }
    if (navigator.share) {
      var sh = el("button", { class: "btn ghost", type: "button", text: "Share" });
      sh.onclick = function () {
        var send = function (d) { try { navigator.share(d).catch(function () {}); } catch (e) {} };
        var plain = { title: "Hypesift", text: base, url: SITE };
        if (cardCanvas && navigator.canShare) {
          cardCanvas.toBlob(function (b) {
            try {
              if (b) {
                var withFile = { title: "Hypesift", text: shareText, files: [new File([b], "hypesift-" + total + ".png", { type: "image/png" })] };
                if (navigator.canShare(withFile)) { send(withFile); return; }
              }
            } catch (e) {}
            send(plain);
          }, "image/png");
        } else send(plain);
      };
      row.push(sh);
    }
    row.push(copy);
    cardCanvas = null;
    blocks.push(shareBlock(total, max, rank, S.log));
    blocks.push(el("div", { class: "row" }, row));
    blocks.push(el("details", {}, [el("summary", { text: "How scoring works" }), el("div", { class: "in" }, [el("p", { class: "note", text: "60 for the right call, 20 for the clue, up to ±20 for how sure you were. Certain and right pays most; Certain and wrong costs most. A badge unlocks when you get the call and the clue right on a case using that pattern." })])]));
    blocks.forEach(function (x) { app.appendChild(x); });

    // count up, with the final value always set
    num.textContent = String(total);
    try {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && total > 0) {
        var t0 = null;
        var step = function (ts) { if (t0 === null) t0 = ts; var f = Math.min(1, (ts - t0) / 700); num.textContent = String(Math.round(total * (1 - Math.pow(1 - f, 3)))); if (f < 1) requestAnimationFrame(step); else num.textContent = String(total); };
        num.textContent = "0"; requestAnimationFrame(step);
      }
    } catch (e) {}
  }

  /* ---------- community screen ---------- */
  var commPack = null;
  function community(pk) {
    screen = "community"; setChrome("community");
    if (pk) commPack = pk;
    if (!commPack) commPack = PACKS[PACKS.length - 1];
    app.innerHTML = "";
    var back = el("button", { class: "btn ghost", type: "button", text: "Back" });
    back.onclick = goBack;
    var head = el("section", { class: "hero" }, [el("h1", { class: "rank", text: "Leaderboard" }), el("div", { class: "row" }, [back])]);
    app.appendChild(head);

    if (dbState === "loading") { app.appendChild(el("p", { class: "note", text: "Loading the board…" })); return; }
    if (dbState === "slow") { app.appendChild(el("p", { class: "note", text: "Can't reach the board yet. It will fill in when the connection returns." })); return; }
    if (dbState === "error") { app.appendChild(el("p", { class: "note", text: "The board isn't available right now." })); return; }

    if (PACKS.length > 1) {
      var tabs = el("div", { class: "tabs" });
      PACKS.slice().reverse().forEach(function (p2) {
        var tb = el("button", { class: "nav", type: "button", text: p2.label });
        if (p2 === commPack) tb.style.borderColor = "var(--signal)";
        tb.onclick = function () { start(p2); };
        tabs.appendChild(tb);
      });
      app.appendChild(tabs);
    }

    var rows = [];
    for (var id in players) { var sc = players[id] && players[id].scores && players[id].scores[commPack.id]; if (typeof sc === "number") rows.push({ id: id, score: sc, pub: !!players[id].pub }); }
    rows.sort(function (a, b) { return b.score - a.score; });
    var count = Object.keys(players).length;

    var sec = el("section", { class: "sec" }, [el("span", { class: "label", text: commPack.label + " · " + count + (count === 1 ? " player" : " players") })]);
    var board = el("div", { class: "board" });
    if (!rows.length) {
      sec.appendChild(el("p", { class: "note", text: "No scores yet. Finish a run to take the first spot." }));
    } else {
      var shown = rows.slice(0, 10), myIdx = -1;
      rows.forEach(function (r, i) { if (r.id === UID) myIdx = i; });
      if (myIdx >= 10) shown.push(rows[myIdx]);
      var pubIds = shown.filter(function (r) { return r.pub && r.id !== UID; }).map(function (r) { return r.id; });
      var paint = function (names) {
        board.innerHTML = "";
        shown.forEach(function (r) {
          var pos = rows.indexOf(r) + 1, me = r.id === UID;
          var nm = me ? "You" : (r.pub ? (names[r.id] || "Someone") : "Anonymous sifter");
          board.appendChild(el("div", { class: "br" + (me ? " me" : "") }, [el("span", { class: "r", text: String(pos) }), el("span", { class: "nm", text: nm }), el("span", { class: "sc", text: r.score + " / " + commPack.cases.length * 100 })]));
        });
      };
      paint({});
      if (pubIds.length && USER && USER.profiles) {
        USER.profiles(pubIds).then(function (ps) { var m = {}; pubIds.forEach(function (i) { m[i] = ps[i] && ps[i].name; }); if (screen === "community") paint(m); }).catch(function () {});
      }
      sec.appendChild(board);
    }
    app.appendChild(sec);

    // hardest cases
    var hs = commPack.cases.map(function (c) { var st = caseStats(c); return { c: c, st: st, pct: st.n ? Math.round(st.ok / st.n * 100) : null }; }).filter(function (x) { return x.st.n >= 3; });
    if (hs.length) {
      hs.sort(function (a, b) { return a.pct - b.pct; });
      var hsec = el("section", { class: "sec" }, [el("span", { class: "label", text: "Hardest cases" })]);
      hs.slice(0, 5).forEach(function (x) {
        var m = el("div", { class: "meter" }, [el("i", { style: "width:" + x.pct + "%" })]);
        hsec.appendChild(el("div", { class: "hard" }, [el("span", { text: x.c.title }), m, el("span", { class: "val", text: x.pct + "%" })]));
      });
      hsec.appendChild(el("span", { class: "meta", text: "Share of players who made the right call." }));
      app.appendChild(hsec);
    }

    // privacy and access
    var pr = el("section", { class: "sec" });
    if (!canWrite) {
      pr.appendChild(el("p", { class: "note", text: "You can view the board. Ask the owner for Contributor access to join it." }));
    } else {
      var cb = el("input", { type: "checkbox", id: "pubName" });
      cb.checked = !!myDoc.pub;
      var nickRow = null;
      if (WEB) {
        var nick = el("input", { id: "nick", type: "text", maxlength: "20", placeholder: "Nickname", autocomplete: "off" });
        nick.value = myDoc.display || "";
        nick.onchange = function () { myDoc.display = (nick.value || "").trim().slice(0, 20); pushMine(); };
        nickRow = field("nick", "Nickname", nick);
        nickRow.hidden = !cb.checked;
      }
      cb.onchange = function () { myDoc.pub = cb.checked; if (nickRow) nickRow.hidden = !cb.checked; pushMine(); };
      pr.appendChild(el("label", { class: "switch", for: "pubName" }, [cb, el("span", { text: WEB ? "Show a nickname on the board" : "Show my name on the board" })]));
      if (nickRow) pr.appendChild(nickRow);
      pr.appendChild(el("p", { class: "note", text: "Off by default. Others see you as Anonymous." }));
    }
    app.appendChild(pr);
  }

  /* ---------- toast ---------- */
  var toastT = null;
  function toast(m) {
    var t = $("#toast"); t.textContent = m; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2200);
  }

  /* ---------- share card ---------- */
  function rr(x, px, py, w, h, r) {
    x.beginPath(); x.moveTo(px + r, py); x.arcTo(px + w, py, px + w, py + h, r); x.arcTo(px + w, py + h, px, py + h, r); x.arcTo(px, py + h, px, py, r); x.arcTo(px, py, px + w, py, r); x.closePath();
  }
  function drawCard(total, max, rank, log) {
    var W = 1080, H = 1080, c = document.createElement("canvas");
    c.width = W; c.height = H;
    var x = c.getContext("2d"), D = '"Space Grotesk", "Helvetica Neue", Arial, sans-serif', M = '"IBM Plex Mono", Consolas, monospace';
    x.fillStyle = "#0b1120"; x.fillRect(0, 0, W, H);
    var g = x.createRadialGradient(180, 0, 0, 180, 0, 640); g.addColorStop(0, "rgba(62,224,193,0.24)"); g.addColorStop(1, "rgba(62,224,193,0)"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    g = x.createRadialGradient(W, 60, 0, W, 60, 560); g.addColorStop(0, "rgba(255,122,107,0.20)"); g.addColorStop(1, "rgba(255,122,107,0)"); x.fillStyle = g; x.fillRect(0, 0, W, H);

    // logo mark
    x.save(); x.translate(72, 64); x.scale(1.5, 1.5);
    rr(x, 1.5, 1.5, 61, 61, 16); x.fillStyle = "#131b2f"; x.fill(); x.lineWidth = 2; x.strokeStyle = "#27345a"; x.stroke();
    x.lineCap = "round"; x.lineJoin = "round";
    x.strokeStyle = "#ff7a6b"; x.lineWidth = 2.4; x.beginPath(); x.moveTo(8, 33); [[11, 21], [14, 43], [17, 17], [20, 46], [23, 25], [26, 38]].forEach(function (p) { x.lineTo(p[0], p[1]); }); x.stroke();
    x.strokeStyle = "#3ee0c1"; x.lineWidth = 3.4;
    [[30, 13, 30, 25], [30, 39, 30, 51], [35, 13, 35, 25], [35, 39, 35, 51]].forEach(function (p) { x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(p[2], p[3]); x.stroke(); });
    x.beginPath(); x.moveTo(39, 32); x.bezierCurveTo(43, 21, 48, 21, 51, 32); x.bezierCurveTo(54, 43, 59, 43, 60, 32); x.stroke();
    x.restore();

    x.textBaseline = "alphabetic";
    x.font = "700 60px " + D; x.fillStyle = "#ff7a6b"; x.fillText("Hype", 190, 134);
    var hw = x.measureText("Hype").width; x.fillStyle = "#3ee0c1"; x.fillText("sift", 190 + hw, 134);

    var parts = [["Signal", "#3ee0c1"], [" or ", "#f2f5fc"], ["hype?", "#ff7a6b"]], px = 72;
    x.font = "700 96px " + D;
    parts.forEach(function (p) { x.fillStyle = p[1]; x.fillText(p[0], px, 330); px += x.measureText(p[0]).width; });

    x.font = "700 270px " + D; x.fillStyle = "#3ee0c1"; x.fillText(String(total), 66, 640);
    var sw = x.measureText(String(total)).width;
    x.font = "500 56px " + M; x.fillStyle = "#8f9bba"; x.fillText("/ " + max, 66 + sw + 24, 640);

    x.font = "700 92px " + D; x.fillStyle = "#f2f5fc"; x.fillText(rank, 72, 790);

    var n = log.length, r = 28, gap = 24, startX = 72 + r;
    log.forEach(function (l, i) {
      var cx = startX + i * (r * 2 + gap);
      x.beginPath(); x.arc(cx, 890, r, 0, Math.PI * 2); x.fillStyle = l.vOk ? "#3ee0c1" : "#ff7a6b"; x.fill();
      x.font = "700 30px " + D; x.fillStyle = "#07101c"; x.textAlign = "center"; x.fillText(l.vOk ? "✓" : "×", cx, 901); x.textAlign = "left";
    });
    var right = log.filter(function (l) { return l.vOk; }).length;
    x.font = "400 40px " + D; x.fillStyle = "#8f9bba"; x.fillText(right + " of " + n + " calls right", 72, 990);
    x.font = "500 30px " + M; x.fillStyle = "#8f9bba"; x.textAlign = "right"; x.fillText("Can you sift it?", W - 72, 1020); x.textAlign = "left";
    return c;
  }
  function shareBlock(total, max, rank, log) {
    var box = el("section", { class: "sec" }, [el("span", { class: "label", text: "Share card" })]);
    var img = el("img", { class: "share", alt: "Result card: " + total + " of " + max + ", " + rank });
    var canvas = null;
    var go = function () { try { canvas = cardCanvas = drawCard(total, max, rank, log); img.src = canvas.toDataURL("image/png"); } catch (e) {} };
    try {
      if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('700 80px "Space Grotesk"'), document.fonts.load('500 40px "IBM Plex Mono"')]).then(go, go);
      else go();
    } catch (e) { go(); }
    box.appendChild(img);
    if (DL) {
      var sv = el("button", { class: "btn ghost", type: "button", text: "Save image" });
      sv.onclick = function () {
        if (!canvas) return;
        canvas.toBlob(function (b) {
          if (!b) return;
          DL.save({ filename: "hypesift-" + total + ".png", data: b }).then(function () { toast("Saved"); }).catch(function (e) { if (!e || e.code !== "declined") toast("Couldn't save the image"); });
        }, "image/png");
      };
      box.appendChild(el("div", { class: "row" }, [sv]));
    }
    return box;
  }

  /* ---------- suggest a claim ---------- */
  function safeUrl(u) { return /^https?:\/\/[^\s<>"']+$/i.test(u || "") ? u : null; }
  function field(id, label, node) { return el("div", { class: "field" }, [el("label", { for: id, text: label }), node]); }
  function submitScreen() {
    screen = "submit"; setChrome("submit"); app.innerHTML = "";
    var back = el("button", { class: "btn ghost", type: "button", text: "Back" });
    back.onclick = goBack;
    app.appendChild(el("section", { class: "hero" }, [
      el("h1", { class: "rank", text: "Suggest a claim" }),
      el("p", { text: "Spotted an AI headline that needs checking? Send it in. Each one is verified before it joins a pack." }),
      el("div", { class: "row" }, [back])
    ]));
    if (!DB || !canWrite) { app.appendChild(el("p", { class: "note", text: "Suggesting needs Contributor access. Ask the owner." })); return; }

    var claim = el("input", { id: "subClaim", type: "text", maxlength: "160", placeholder: "What does the headline say?", autocomplete: "off" });
    var link = el("input", { id: "subUrl", type: "url", maxlength: "300", placeholder: "https://", autocomplete: "off" });
    var note = el("textarea", { id: "subNote", maxlength: "200", rows: "2", placeholder: "Optional: why it caught your eye" });
    var msg = el("p", { class: "msg", "aria-live": "polite" });
    var full = mySubs.length >= 5;
    var send = el("button", { class: "btn block", type: "button", text: full ? "5 of 5 sent" : "Send for review" });
    send.disabled = full;
    send.onclick = function () {
      var c = (claim.value || "").trim().slice(0, 160), u = (link.value || "").trim().slice(0, 300), n = (note.value || "").trim().slice(0, 200);
      if (c.length < 8) { msg.className = "msg no"; msg.textContent = "Write the claim in a few words."; return; }
      if (!safeUrl(u)) { msg.className = "msg no"; msg.textContent = "Add the link where you saw it (starts with http)."; return; }
      send.disabled = true; msg.className = "msg"; msg.textContent = "Sending…";
      var item = { id: "s" + Date.now().toString(36), claim: c, url: u, note: n, t: Date.now() };
      var items = mySubs.concat([item]).slice(-5);
      sq = sq.then(function () { return DB.doc("submissions/" + UID).set({ items: items }); }).then(function () {
        mySubs = items; msg.className = "msg ok"; msg.textContent = "Sent. Thank you.";
        claim.value = ""; link.value = ""; note.value = "";
        send.disabled = items.length >= 5; send.textContent = items.length >= 5 ? "5 of 5 sent" : "Send for review";
        paintList();
      }).catch(function () { msg.className = "msg no"; msg.textContent = "Couldn't send. Try again."; send.disabled = false; });
    };
    var form = el("section", { class: "card" }, [field("subClaim", "The claim", claim), field("subUrl", "Link", link), field("subNote", "Why it matters", note), msg, send]);
    app.appendChild(form);
    var listBox = el("section", { class: "sec" });
    app.appendChild(listBox);
    function paintList() {
      listBox.innerHTML = "";
      if (!mySubs.length) return;
      listBox.appendChild(el("span", { class: "label", text: "Your suggestions" }));
      mySubs.slice().reverse().forEach(function (s) {
        listBox.appendChild(el("div", { class: "sub" }, [el("b", { text: s.claim }), el("small", { text: "In the review queue · " + new Date(s.t).toLocaleDateString() })]));
      });
    }
    paintList();
  }

  /* ---------- owner inbox (editors only) ---------- */
  function inbox() {
    screen = "inbox"; setChrome("inbox"); app.innerHTML = "";
    var back = el("button", { class: "btn ghost", type: "button", text: "Back" });
    back.onclick = goBack;
    app.appendChild(el("section", { class: "hero" }, [
      el("h1", { class: "rank", text: "Inbox" }),
      el("p", { text: allSubs.length ? allSubs.length + (allSubs.length === 1 ? " suggestion" : " suggestions") + " waiting. Verify each before it joins a pack." : "No suggestions yet." }),
      el("div", { class: "row" }, [back])
    ]));
    if (!ADMIN) return;
    var rows = allSubs.slice().sort(function (a, b) { return (b.it.t || 0) - (a.it.t || 0); });
    var box = el("section", { class: "sec" });
    app.appendChild(box);
    var ids = []; rows.forEach(function (r) { if (r.uid && ids.indexOf(r.uid) < 0) ids.push(r.uid); });
    var paint = function (names) {
      box.innerHTML = "";
      rows.forEach(function (r) {
        var it = r.it || {}, u = safeUrl(it.url);
        var kids = [el("b", { text: String(it.claim || "") })];
        if (u) kids.push(el("a", { href: u, target: "_blank", rel: "noopener noreferrer", text: u })); else kids.push(el("small", { text: "Link not shown (not a web address)" }));
        if (it.note) kids.push(el("small", { text: String(it.note) }));
        kids.push(el("small", { text: "From " + (names[r.uid] || "Someone") + (it.t ? " · " + new Date(it.t).toLocaleDateString() : "") }));
        box.appendChild(el("div", { class: "sub" }, kids));
      });
    };
    paint({});
    if (ids.length && USER && USER.profiles) {
      USER.profiles(ids).then(function (ps) { var m = {}; ids.forEach(function (i) { m[i] = ps[i] && ps[i].name; }); if (screen === "inbox") paint(m); }).catch(function () {});
    }
  }

  /* ---------- profile ---------- */
  var TARGETS = [55, 75, 95];
  function profile() {
    screen = "profile"; setChrome("profile"); app.innerHTML = "";
    var back = el("button", { class: "btn ghost", type: "button", text: "Back" });
    back.onclick = goBack;
    var runs = P.runs, bestPct = 0;
    runs.forEach(function (r) { bestPct = Math.max(bestPct, Math.round(r.score / r.max * 100)); });
    var head = el("section", { class: "hero" }, [el("h1", { class: "rank", text: "Your profile" }), el("div", { class: "row" }, [back])]);
    var stats = el("div", { class: "tiles" }, [stat(String(dayStreak()), "day streak"), stat(String(runs.length), "runs"), stat(runs.length ? bestPct + "%" : "–", "best score")]);

    var cal = el("section", { class: "sec" }, [el("span", { class: "label", text: "Sure vs right" })]);
    CONF.forEach(function (cf, i) {
      var c = P.conf[i], pct = c[0] ? Math.round(c[1] / c[0] * 100) : null;
      var meter = el("div", { class: "meter" }, [el("i", { style: "width:" + (pct === null ? 0 : pct) + "%" }), el("u", { style: "left:" + TARGETS[i] + "%" })]);
      cal.appendChild(el("div", { class: "cal" }, [
        el("div", {}, [el("b", { text: cf.name }), el("small", { text: c[0] + (c[0] === 1 ? " call" : " calls") })]),
        meter,
        el("div", { class: "val", text: pct === null ? "–" : pct + "% right" })
      ]));
    });
    var cs = P.conf[2], read = "The amber tick is where each level should land.";
    if (cs[0] >= 3) { var p2 = Math.round(cs[1] / cs[0] * 100); read = p2 >= 85 ? "Your Certain calls are well calibrated." : "Certain is right " + p2 + "% of the time. Use Likely when the clue is thin."; }
    cal.appendChild(el("p", { class: "note", text: read }));

    var hist = el("section", { class: "sec" }, [el("span", { class: "label", text: "Score history" })]);
    if (runs.length) {
      var last = runs.slice(-12);
      hist.appendChild(el("div", { class: "hist" }, last.map(function (r) { var pc = Math.round(r.score / r.max * 100); return el("i", { style: "height:" + Math.max(pc, 3) + "%", title: new Date(r.t).toLocaleDateString() + ": " + r.score + "/" + r.max }); })));
    } else hist.appendChild(el("p", { class: "note", text: "Finish a run to see your scores here." }));

    var bs = el("section", { class: "sec" }, [el("span", { class: "label", text: "Badges" })]);
    var grid = el("div", { class: "badges" });
    allPatterns().forEach(function (pt) {
      var b = P.badges[pt];
      grid.appendChild(el("div", { class: "badge" + (b ? " on" : "") }, [el("b", { text: pt }), el("small", { text: TIPS[pt] || "" })]));
    });
    bs.appendChild(grid);

    var reset = el("button", { class: "btn ghost danger", type: "button", text: "Reset my progress" });
    var armed = false;
    reset.onclick = function () {
      if (!armed) { armed = true; reset.textContent = "Tap again to erase"; setTimeout(function () { armed = false; reset.textContent = "Reset my progress"; }, 4000); return; }
      try { localStorage.removeItem(KEY); localStorage.removeItem("hypesift-best"); } catch (e) {}
      P = blank(); profile();
    };
    [head, stats, cal, hist, bs, el("div", { class: "row" }, [reset])].forEach(function (x) { app.appendChild(x); });
  }

  /* ---------- navigation: the browser Back button steps back through screens ---------- */
  function mark(name) {
    try {
      var cur = history.state && history.state.s;
      if (cur === name) history.replaceState({ s: name }, "");
      else history.pushState({ s: name }, "");
    } catch (e) {}
  }
  function route(name) {
    if (name === "community") community();
    else if (name === "profile") profile();
    else if (name === "submit") submitScreen();
    else if (name === "inbox") inbox();
    else intro();
    window.scrollTo(0, 0);
  }
  function go(name) { mark(name); route(name); }
  function goBack() {
    var cur = history.state && history.state.s;
    if (cur && cur !== "intro") { try { history.back(); return; } catch (e) {} }
    route("intro");
  }
  try { history.replaceState({ s: "intro" }, ""); } catch (e) {}
  window.addEventListener("popstate", function (e) { route(e.state && e.state.s ? e.state.s : "intro"); });

  $("#home").onclick = function (e) { e.preventDefault(); go("intro"); };
  $("#navProfile").onclick = function () { go("profile"); };
  $("#navComm").onclick = function () { go("community"); };
  $("#navInbox").onclick = function () { go("inbox"); };
  document.addEventListener("keydown", function (e) {
    if (screen !== "play" || !UI || e.metaKey || e.ctrlKey || e.altKey) return;
    var tg = e.target && e.target.tagName;
    if (tg === "INPUT" || tg === "TEXTAREA") return;
    if (UI.next) { if (e.key === "Enter" || e.key === "ArrowRight") { e.preventDefault(); UI.next.click(); } return; }
    var idx = "123".indexOf(e.key);
    if (e.key.length === 1 && idx >= 0) {
      var g = UI.s2.hidden ? UI.g1 : UI.s3.hidden ? UI.g2 : UI.g3, b = g.children[idx];
      if (b) b.click();
      return;
    }
    if (e.key === "Enter" && tg !== "BUTTON" && !UI.lock.disabled && !UI.s3.hidden) { e.preventDefault(); UI.lock.click(); }
  });
  intro();
  initCommunity();
})();
