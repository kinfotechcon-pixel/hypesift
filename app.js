(function () {
  "use strict";

  var D = window.HYPESIFT_DATA || { checked: "", packs: [], tips: {} };
  var CHECKED = D.checked, PACKS = D.packs, TIPS = D.tips;
  var WD = window.HYPESIFT_WORDS || { checked: "", packs: [] }, WPACKS = WD.packs;
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
    $("#navBack").hidden = !playing;
    $("#navHow").hidden = playing;
    $("#navProfile").hidden = playing;
    $("#navComm").hidden = playing || !DB;
    $("#navInbox").hidden = playing || !(DB && ADMIN);
    if (!playing) UI = null;
    if (playing) {
      $("#hLabel").textContent = screen === "wplay" ? "Word" : "Case";
      $("#hCase").textContent = Math.min(S.i + 1, CASES.length);
      $("#hTotal").textContent = CASES.length;
      $("#hScore").textContent = S.score;
      var d = $("#dots"); d.innerHTML = "";
      for (var i = 0; i < CASES.length; i++) d.appendChild(el("i", { class: i < S.i ? (S.log[i] && !S.log[i].vOk ? "on no" : "on") : i === S.i ? "cur" : "" }));
    }
  }

  /* ---------- progress saved on this device ---------- */
  var KEY = "hypesift-v2";
  function blank() { return { runs: [], badges: {}, conf: [[0, 0], [0, 0], [0, 0]], days: [], packs: {}, words: { packs: {}, learned: {}, daily: "" } }; }
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
  if (!P.words || typeof P.words !== "object") P.words = { packs: {}, learned: {}, daily: "" };
  P.words.packs = P.words.packs || {}; P.words.learned = P.words.learned || {}; P.words.daily = P.words.daily || "";
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
  var WEB = false, FN = null;
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
      return Promise.resolve({ user: b.user, db: b.db, dl: b.downloads, fn: cfg.checkStory ? b.fn : null, web: true });
    }
    return Promise.resolve({ user: null, db: null, dl: B ? B.downloads() : null, web: true });
  }
  function initCommunity() {
    getPlatform().then(function (p) {
      DL = p.dl || null; WEB = p.web; USER = p.user; DB = p.db; FN = p.fn || null;
      if (FN && screen === "intro") intro();
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
  /* ---------- guide content, shared by the home page and the How it works page ---------- */
  var STEPS = [
    ["Read the claim", "Each round is one real AI headline, put in plain words and checked against its source."],
    ["Make your call", "Pick Signal, Hype or Fine print. Then choose the clue that decides it."],
    ["Say how sure you are", "Guess, Likely or Certain. Sure and right earns the most. Sure and wrong costs points."],
    ["See the facts", "You get the verdict, the reason, the source link and a rule of thumb for next time."]
  ];
  var WSTEPS = [
    ["See the word", "One AI word at a time, with a plain-English guide to saying it."],
    ["Pick the meaning", "Choose what it means from three options. The wrong ones sound believable."],
    ["Pick the sentence", "Then choose the sentence that uses the word correctly."],
    ["Learn it", "See the meaning in plain words, where you will meet the word, and what it is easy to confuse with."]
  ];
  var MEANS = {
    solid: "The claim holds up against a solid source.",
    overstated: "The claim stretches or exaggerates what the source says.",
    context: "It is true, but important context is missing."
  };
  var FAQ = [
    ["Do I need to know about AI?", "No. Words and claims are written in plain language, and every answer screen explains the facts. You pick up the jargon as you go."],
    ["Who picks the words and claims?", "Each week's 8 claims come from recent AI news. They are researched with AI help and checked against the original source: a company post, a study, a filing or a major report. Word meanings are written in plain language and checked against reliable glossaries from Google, Anthropic, IBM and others. Every claim and word links to its source, so you can check it yourself. If you spot a mistake, use Suggest a claim to tell us."],
    ["How long does it take?", "A word takes about 30 seconds, and a set of 8 takes about five minutes. There is a new word of the day every day and a new set of claims every week. Older sets stay available."],
    ["What is AIVoCab?", "The word game. You see an AI word like \"hallucination\", pick what it means, then pick the sentence that uses it correctly. After each word you see the meaning in plain language and where you will run into it."],
    ["What is Check a story?", "Paste a link to an AI story you found online. Hypesift AI reads it, searches the web for the original source and gives a verdict with reasons. It can be wrong, so open the sources and judge for yourself."],
    ["Is it free? What do you keep about me?", "It is free to play. There is no account and no email. Your progress stays on your device. If you open the Board, your score is stored under a random ID, and a nickname shows only if you choose one."]
  ];

  function stepsBlock(steps) {
    var box = el("div", { class: "how-steps" });
    steps.forEach(function (s, i) {
      box.appendChild(el("div", { class: "how-step" }, [el("span", { class: "n", text: String(i + 1) }), el("b", { text: s[0] }), el("p", { text: s[1] })]));
    });
    return box;
  }
  function verdictGuide() {
    var box = el("div", { class: "verdicts" });
    VERDICTS.forEach(function (v) {
      box.appendChild(el("div", { class: "vrow" }, [glyph(v), el("div", {}, [el("b", { text: v.name }), el("span", { text: MEANS[v.k] })])]));
    });
    return box;
  }
  function gameCard(title, text, btnText, onclick, tone, tag) {
    var b = el("button", { class: "btn" + (onclick ? "" : " ghost"), type: "button", text: btnText });
    if (onclick) b.onclick = onclick; else b.disabled = true;
    return el("div", { class: "game " + tone }, [tag ? el("span", { class: "tag", text: tag }) : null, el("h3", { text: title }), el("p", { text: text }), b]);
  }

  /* ---------- home ---------- */
  function intro() {
    screen = "intro"; setChrome("intro"); app.innerHTML = "";
    var pk = PACKS[PACKS.length - 1], rec = P.packs[pk.id], earned = Object.keys(P.badges).length;
    var learned = Object.keys(P.words.learned).length, wtotal = allWords().length;
    var hasWords = WPACKS.length > 0;

    var heroBtns = [];
    if (hasWords) { var wb = el("button", { class: "btn", type: "button", text: "Play AIVoCab" }); wb.onclick = function () { go("words"); }; heroBtns.push(wb); }
    else { var nb = el("button", { class: "btn", type: "button", text: "Play this week's " + pk.cases.length + " claims" }); nb.onclick = function () { start(pk); }; heroBtns.push(nb); }
    var how = el("button", { class: "btn ghost", type: "button", text: "How it works" });
    how.onclick = function () { go("how"); };
    heroBtns.push(how);
    app.appendChild(el("section", { class: "hero home" }, [
      el("h1", { html: 'Learn <span class="h">AI</span>, one small game at a time.' }),
      el("p", { text: "Hypesift is a pair of quick games for anyone curious about AI. Learn the words people keep using, or check whether an AI headline holds up. Five minutes is plenty. No tech background needed." }),
      el("div", { class: "row" }, heroBtns),
      el("span", { class: "meta", text: "New words and claims every week" })
    ]));

    var daily = dailyCard(); if (daily) app.appendChild(daily);

    var cards = el("div", { class: "games" });
    if (hasWords) cards.appendChild(gameCard("AIVoCab", "Guess what AI words mean, then spot the sentence that uses each one correctly. " + wtotal + " words to start, with more every week.", "Play AIVoCab", function () { go("words"); }, "a", "Word game"));
    cards.appendChild(gameCard("Signal or hype?", "Real AI headlines, each checked against its source. Call it Signal, Hype or Fine print. 8 new claims every week.", rec ? "Play this week again" : "Play this week's " + pk.cases.length + " claims", function () { start(pk); }, "b", "News game"));
    app.appendChild(el("section", { class: "sec" }, [el("h2", { text: "Pick a game" }), cards]));

    if (P.runs.length || learned || P.days.length) {
      app.appendChild(el("div", { class: "tiles" }, [
        stat(String(dayStreak()), "day streak"),
        stat(learned + "/" + wtotal, "words learned"),
        stat(earned + "/" + allPatterns().length, "badges")
      ]));
    }

    var more = el("button", { class: "btn ghost", type: "button", text: "Read the full guide" });
    more.onclick = function () { go("how"); };
    var two = el("div", { class: "how-steps" }, [
      el("div", { class: "how-step" }, [el("b", { text: "AIVoCab" }), el("p", { text: "See an AI word. Pick what it means, then pick the sentence that uses it correctly. Learn it in plain words." })]),
      el("div", { class: "how-step" }, [el("b", { text: "Signal or hype?" }), el("p", { text: "Read a real AI headline. Pick Signal, Hype or Fine print, choose the clue that decides it, then see what the source says." })])
    ]);
    app.appendChild(el("section", { class: "sec" }, [el("h2", { text: "How it works" }), two, verdictGuide(), el("div", { class: "row" }, [more])]));

    var extra = el("div", { class: "games" });
    if (FN) extra.appendChild(gameCard("Check a story", "Found an AI story online? Paste the link and Hypesift AI looks for the original source.", "Check a story", function () { go("check"); }, "a"));
    if (DB) extra.appendChild(gameCard("Suggest a claim", "Spotted an AI headline that needs checking? Send it in. We verify it before it joins a pack.", "Suggest a claim", function () { go("submit"); }, "c"));
    if (extra.children.length) app.appendChild(el("section", { class: "sec" }, [el("h2", { text: "More to try" }), extra]));

    if (PACKS.length > 1) {
      var list = el("div", { class: "packs" });
      PACKS.slice(0, -1).reverse().forEach(function (p2) {
        var r2 = P.packs[p2.id], b = el("button", { class: "btn ghost", type: "button", text: "Play" });
        var row2 = el("div", { class: "pack", style: "cursor:pointer" }, [el("div", {}, [el("b", { text: p2.label }), el("small", { text: r2 ? "Best " + r2.best + " / " + p2.cases.length * 100 : "Not played" })]), b]);
        row2.onclick = function () { start(p2); };
        b.onclick = function (e) { e.stopPropagation(); start(p2); };
        list.appendChild(row2);
      });
      app.appendChild(el("section", { class: "sec" }, [el("h2", { text: "Earlier claim packs" }), list]));
    }
  }

  /* ---------- how it works (full guide) ---------- */
  function howPage() {
    screen = "how"; setChrome("how"); app.innerHTML = "";
    var pk = PACKS[PACKS.length - 1];
    var back = el("button", { class: "btn ghost", type: "button", text: "Back" });
    back.onclick = goBack;
    app.appendChild(el("section", { class: "hero" }, [
      el("h1", { class: "rank", text: "How Hypesift works" }),
      el("p", { text: "Two quick games that build one habit: asking what AI words and headlines really mean." }),
      el("div", { class: "row" }, [back])
    ]));
    app.appendChild(el("section", { class: "sec" }, [
      el("h2", { text: "The idea" }),
      el("p", { class: "note big", text: "AI news moves fast, it comes with a lot of jargon, and headlines often say more than the facts support. Hypesift helps with both. AIVoCab teaches the words in plain language. Signal or hype? gives you real claims to judge, then shows you what the source says. Play a little each day and you start to understand the news, and to spot exaggeration on your own." })
    ]));
    if (WPACKS.length) app.appendChild(el("section", { class: "sec" }, [el("h2", { text: "AIVoCab, step by step" }), stepsBlock(WSTEPS)]));
    app.appendChild(el("section", { class: "sec" }, [el("h2", { text: "Signal or hype?, step by step" }), stepsBlock(STEPS)]));
    app.appendChild(el("section", { class: "sec" }, [el("h2", { text: "The three calls" }), verdictGuide()]));
    app.appendChild(el("section", { class: "sec" }, [
      el("h2", { text: "Scoring" }),
      el("p", { class: "note big", text: "AIVoCab: up to 100 points per word. You get 60 for the right meaning and 40 for the right sentence." }),
      el("p", { class: "note big", text: "Signal or hype?: up to 100 points per claim. You get 60 for the right call, 20 for finding the clue that decides it, and up to 20 for how well your confidence matched. Certain and right pays most. Certain and wrong costs 20. Badges unlock when you get a claim's call and clue both right." })
    ]));
    var faq = el("div", { class: "card faq" });
    FAQ.forEach(function (qa) { faq.appendChild(el("details", {}, [el("summary", { text: qa[0] }), el("div", { class: "in" }, [el("p", { class: "note big", text: qa[1] })])])); });
    app.appendChild(el("section", { class: "sec" }, [el("h2", { text: "Questions" }), faq]));
    var row = [];
    if (WPACKS.length) { var wp = el("button", { class: "btn", type: "button", text: "Play AIVoCab" }); wp.onclick = function () { go("words"); }; row.push(wp); }
    var play = el("button", { class: "btn" + (WPACKS.length ? " ghost" : ""), type: "button", text: "Play this week's " + pk.cases.length + " claims" });
    play.onclick = function () { start(pk); };
    row.push(play);
    app.appendChild(el("div", { class: "row" }, row));
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

  /* ---------- AIVoCab: the AI word game ---------- */
  var WRANKS = [[720, "Word Wizard"], [600, "Fluent"], [450, "Getting there"], [250, "Curious"], [0, "Just starting"]];
  var WS = { daily: false }; // the AIVoCab round in progress
  var commWord = null;
  function wrankFor(score, max) {
    var f = score / max;
    for (var i = 0; i < WRANKS.length; i++) { if (f >= WRANKS[i][0] / 800) return WRANKS[i][1]; }
    return WRANKS[WRANKS.length - 1][1];
  }
  function allWords() { var out = []; WPACKS.forEach(function (pk) { pk.words.forEach(function (w) { out.push(w); }); }); return out; }
  function wordOfDay() {
    var all = allWords(); if (!all.length) return null;
    var t = new Date(), n = Math.floor(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()) / 86400000);
    return all[n % all.length];
  }
  function countUp(num, total) {
    num.textContent = String(total);
    try {
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && total > 0) {
        var t0 = null;
        var step = function (ts) { if (t0 === null) t0 = ts; var f = Math.min(1, (ts - t0) / 700); num.textContent = String(Math.round(total * (1 - Math.pow(1 - f, 3)))); if (f < 1) requestAnimationFrame(step); else num.textContent = String(total); };
        num.textContent = "0"; requestAnimationFrame(step);
      }
    } catch (e) {}
  }

  function wordStart(pk, daily) {
    CASES = pk.words;
    S = { pack: pk, order: shuffle(pk.words.map(function (_, i) { return i; })), i: 0, score: 0, streak: 0, log: [], pick: {} };
    WS = { daily: !!daily };
    if (!daily) { commPack = pk; commWord = pk; }
    mark("play");
    wordPlay(); window.scrollTo(0, 0);
  }

  function wordPlay() {
    screen = "wplay";
    var w = CASES[S.order[S.i]];
    S.pick = {};
    setChrome("play"); app.innerHTML = "";
    var mOrder = shuffle([0, 1, 2]), uOrder = shuffle([0, 1, 2]);

    var card = el("section", { class: "card" }, [
      el("div", { class: "tags" }, [el("span", { class: "chip", text: WS.daily ? "Word of the day" : "AIVoCab" }), el("span", { class: "chip", text: w.level })]),
      el("p", { class: "claim", text: w.word }),
      el("span", { class: "meta", text: "Say it: " + w.say })
    ]);
    var lock = el("button", { class: "btn block sticky", type: "button", text: "Lock in" });
    lock.disabled = true;
    var updateLock = function () { lock.disabled = !(S.pick.m !== undefined && S.pick.u !== undefined); };

    var s1 = el("div", { class: "step" }, [el("span", { class: "label", text: "What does it mean?" })]);
    var g1 = el("div", { class: "opts", role: "radiogroup", "aria-label": "What does it mean?" });
    mOrder.forEach(function (k) {
      var b = el("button", { class: "opt plain", type: "button", role: "radio", "aria-checked": "false", text: w.defs[k] });
      b.onclick = function () { choose(g1, b); S.pick.m = k; reveal(s2); updateLock(); };
      g1.appendChild(b);
    });
    s1.appendChild(g1);

    var s2 = el("div", { class: "step", hidden: "" }, [el("span", { class: "label", text: "Which sentence uses it correctly?" })]);
    var g2 = el("div", { class: "opts", role: "radiogroup", "aria-label": "Which sentence uses it correctly?" });
    uOrder.forEach(function (k) {
      var b = el("button", { class: "opt plain", type: "button", role: "radio", "aria-checked": "false", text: w.uses[k] });
      b.onclick = function () { choose(g2, b); S.pick.u = k; updateLock(); };
      g2.appendChild(b);
    });
    s2.appendChild(g2);

    lock.onclick = function () { wordSubmit(w, [g1, g2], [mOrder, uOrder], lock); };
    [s1, s2, lock].forEach(function (n) { card.appendChild(n); });
    UI = null;
    app.appendChild(card);
  }

  function wordSubmit(w, groups, orders, lock) {
    var mOk = S.pick.m === w.d, uOk = S.pick.u === w.u;
    var total = (mOk ? 60 : 0) + (uOk ? 40 : 0);
    S.score += total;
    S.log.push({ w: w, mOk: mOk, uOk: uOk, pts: total, vOk: mOk });
    [[groups[0], orders[0], w.d], [groups[1], orders[1], w.u]].forEach(function (x) {
      Array.prototype.forEach.call(x[0].children, function (b, idx) {
        b.disabled = true;
        if (x[1][idx] === x[2]) b.classList.add("right");
        else if (b.getAttribute("aria-checked") === "true") b.classList.add("wrong");
      });
    });
    lock.remove();
    var dot = document.querySelectorAll("#dots i")[S.i];
    if (dot) dot.className = mOk ? "on" : "no";

    if (WS.daily) {
      var today = dayStr(new Date());
      P.words.daily = today;
      if (mOk && !P.words.learned[w.id]) P.words.learned[w.id] = today;
      if (P.days.indexOf(today) < 0) P.days.push(today);
      P.days = P.days.slice(-400);
      save();
    }

    var title = mOk && uOk ? "Nailed it" : mOk ? "Right meaning" : "Not quite. Now you know it";
    var head = el("div", { class: "fb-head " + (mOk ? "ok" : "no") }, [el("h2", { text: title }), el("p", { text: w.plain })]);
    var pts = el("div", { class: "pts" }, [
      el("span", { class: mOk ? "hi" : "lo", text: "Meaning " + (mOk ? "+60" : "0") }),
      el("span", { class: uOk ? "hi" : "lo", text: "Sentence " + (uOk ? "+40" : "0") }),
      el("span", { class: "tot", text: "= " + total })
    ]);
    var note = function (b, t) { return el("div", { class: "pattern" }, [el("b", { text: b }), el("span", { text: t })]); };
    var body = el("div", { class: "fb-body" }, [
      pts,
      note("Use it like this", w.uses[w.u]),
      note("You will see it in", w.where),
      note("Don't mix it up", w.mixup),
      el("a", { href: w.url, target: "_blank", rel: "noopener", text: "Source: " + w.src })
    ]);
    var last = S.i === CASES.length - 1;
    var next = el("button", { class: "btn block sticky", type: "button", text: last ? (WS.daily ? "Done" : "See results") : "Next word" });
    next.onclick = function () {
      S.i++;
      if (last) { if (WS.daily) goBack(); else wordResults(); } else wordPlay();
      window.scrollTo(0, 0);
    };
    body.appendChild(next);
    var fb = el("section", { class: "fb", "aria-live": "polite" }, [head, body]);
    app.appendChild(fb);
    $("#hScore").textContent = S.score;
    try { fb.scrollIntoView({ behavior: "smooth", block: "start" }); } catch (e) {}
  }

  function wordResults() {
    screen = "wresults"; setChrome("results");
    var pk = S.pack, n = CASES.length, max = n * 100, total = S.score;
    var mRight = S.log.filter(function (l) { return l.mOk; }).length;
    var uRight = S.log.filter(function (l) { return l.uOk; }).length;
    var rank = wrankFor(total, max);
    var today = dayStr(new Date());
    var rec = P.words.packs[pk.id] || { best: 0, plays: 0 };
    var prev = rec.best, isBest = total > prev;
    S.log.forEach(function (l) { if (l.mOk && !P.words.learned[l.w.id]) P.words.learned[l.w.id] = today; });
    if (P.days.indexOf(today) < 0) P.days.push(today);
    P.days = P.days.slice(-400);
    P.words.packs[pk.id] = { best: Math.max(prev, total), plays: rec.plays + 1 };
    save();
    // the board keeps only the first completed run on each pack; replays are practice
    var practice = false;
    if (DB && UID) {
      if (typeof myDoc.scores[pk.id] === "number") practice = true; else myDoc.scores[pk.id] = total;
      pushMine();
    }

    app.innerHTML = "";
    var num = el("span", { class: "n", text: "0" });
    var top = el("section", { class: "hero" }, [
      el("div", { class: "score" }, [num, el("span", { class: "d", text: "/ " + max })]),
      el("h1", { class: "rank", text: rank }),
      el("span", { class: "meta", text: (isBest && prev ? "New best (was " + prev + ")" : prev ? "Best: " + Math.max(prev, total) : "First run saved") + " · " + dayStreak() + "-day streak" })
    ]);
    if (practice) top.appendChild(el("span", { class: "meta", text: "Practice run, not on the board" }));
    var learned = Object.keys(P.words.learned).length;
    var stats = el("div", { class: "tiles" }, [
      stat(mRight + "/" + n, "meanings right"),
      stat(uRight + "/" + n, "sentences right"),
      stat(learned + "/" + allWords().length, "words learned")
    ]);
    var blocks = [top, stats];
    blocks.push(el("div", { class: "list" }, S.log.map(function (l) {
      return el("div", { class: "li" }, [
        el("span", { class: "m " + (l.mOk ? "ok" : "no"), text: l.mOk ? "✓" : "×" }),
        el("div", { class: "t" }, [document.createTextNode(l.w.word), el("small", { text: l.mOk ? l.w.level + " · " + l.w.defs[l.w.d] : "Means: " + l.w.defs[l.w.d] })]),
        el("span", { class: "p", text: l.pts })
      ]);
    })));
    var again = el("button", { class: "btn", type: "button", text: "Play again" });
    again.onclick = function () { wordStart(pk); };
    var row = [again];
    var morePacks = el("button", { class: "btn ghost", type: "button", text: "More word packs" });
    morePacks.onclick = function () { go("words"); };
    row.push(morePacks);
    if (DB) { var bd = el("button", { class: "btn ghost", type: "button", text: "Leaderboard" }); bd.onclick = function () { commPack = pk; go("community"); }; row.push(bd); }
    var base = "AIVoCab: " + total + "/" + max + " (" + rank + "). " + mRight + "/" + n + " AI words right. How many do you know?";
    var shareText = base + " " + SITE;
    var copy = el("button", { class: "btn ghost", type: "button", text: "Copy result" });
    copy.onclick = function () {
      var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy result"; }, 1800); };
      try { navigator.clipboard.writeText(shareText).then(done, function () { copy.textContent = shareText; }); } catch (e) { copy.textContent = shareText; }
    };
    if (navigator.share) {
      var sh = el("button", { class: "btn ghost", type: "button", text: "Share" });
      sh.onclick = function () {
        var send = function (d) { try { navigator.share(d).catch(function () {}); } catch (e) {} };
        var plain = { title: "AIVoCab", text: base, url: SITE };
        if (cardCanvas && navigator.canShare) {
          cardCanvas.toBlob(function (b) {
            try {
              if (b) {
                var withFile = { title: "AIVoCab", text: shareText, files: [new File([b], "aivocab-" + total + ".png", { type: "image/png" })] };
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
    blocks.push(shareBlock(total, max, rank, S.log, "words"));
    blocks.push(el("div", { class: "row" }, row));
    blocks.push(el("details", {}, [el("summary", { text: "How scoring works" }), el("div", { class: "in" }, [el("p", { class: "note", text: "60 points for the right meaning and 40 for picking the sentence that uses the word correctly, so up to 100 per word. A word counts as learned once you get its meaning right." })])]));
    blocks.forEach(function (x) { app.appendChild(x); });
    countUp(num, total);
  }

  function dailyCard() {
    var w = wordOfDay();
    if (!w) return null;
    var done = P.words.daily === dayStr(new Date());
    var b = el("button", { class: "btn", type: "button", text: done ? "Play it again" : "Play today's word" });
    b.onclick = function () { wordStart({ id: "daily", label: "Word of the day", words: [w] }, true); };
    return el("section", { class: "card daily" }, [
      el("div", { class: "tags" }, [el("span", { class: "chip", text: "Word of the day" }), el("span", { class: "chip", text: w.level })]),
      el("p", { class: "claim", text: w.word }),
      el("span", { class: "meta", text: done ? "Done today. It counts toward your day streak." : "About 30 seconds. Counts toward your day streak." }),
      el("div", { class: "row" }, [b])
    ]);
  }

  function packRow(p2) {
    var rec = P.words.packs[p2.id];
    var known = p2.words.filter(function (w) { return P.words.learned[w.id]; }).length;
    var b = el("button", { class: "btn" + (rec ? " ghost" : ""), type: "button", text: rec ? "Play again" : "Play" });
    var row2 = el("div", { class: "pack", style: "cursor:pointer" }, [
      el("div", {}, [el("b", { text: p2.label }), el("small", { text: p2.blurb }), el("small", { text: (rec ? "Best " + rec.best + " / " + p2.words.length * 100 + " · " : "Not played · ") + known + " of " + p2.words.length + " learned" })]),
      b
    ]);
    row2.onclick = function () { wordStart(p2); };
    b.onclick = function (e) { e.stopPropagation(); wordStart(p2); };
    return row2;
  }

  function wordsHome() {
    screen = "words"; setChrome("words"); app.innerHTML = "";
    var back = el("button", { class: "btn ghost", type: "button", text: "Back" });
    back.onclick = goBack;
    app.appendChild(el("section", { class: "hero" }, [
      el("h1", { class: "rank", text: "AIVoCab" }),
      el("p", { text: "Learn the AI words everyone keeps using. One word at a time, about 30 seconds each." }),
      el("div", { class: "row" }, [back])
    ]));
    var d = dailyCard(); if (d) app.appendChild(d);
    var starter = WPACKS.filter(function (p2) { return p2.track === "starter"; });
    var weekly = WPACKS.filter(function (p2) { return p2.track === "weekly"; }).reverse();
    if (weekly.length) {
      var wl = el("div", { class: "packs" }); weekly.forEach(function (p2) { wl.appendChild(packRow(p2)); });
      app.appendChild(el("section", { class: "sec" }, [el("h2", { text: "New this week" }), wl]));
    }
    var sl = el("div", { class: "packs" }); starter.forEach(function (p2) { sl.appendChild(packRow(p2)); });
    app.appendChild(el("section", { class: "sec" }, [el("h2", { text: "Start here" }), sl]));
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

    var isWords = !!commPack.words;
    if (WPACKS.length) {
      var gsw = el("div", { class: "tabs" });
      [["Signal or hype?", false], ["AIVoCab", true]].forEach(function (g) {
        var gb = el("button", { class: "nav" + (isWords === g[1] ? " on" : ""), type: "button", text: g[0] });
        gb.onclick = function () { community(g[1] ? (commWord || WPACKS[0]) : PACKS[PACKS.length - 1]); };
        gsw.appendChild(gb);
      });
      app.appendChild(gsw);
    }
    var tabList = isWords ? WPACKS : PACKS.slice().reverse();
    if (tabList.length > 1) {
      var tabs = el("div", { class: "tabs" });
      tabList.forEach(function (p2) {
        var tb = el("button", { class: "nav" + (p2 === commPack ? " on" : ""), type: "button", text: p2.label });
        tb.onclick = function () { if (isWords) wordStart(p2); else start(p2); };
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
          board.appendChild(el("div", { class: "br" + (me ? " me" : "") }, [el("span", { class: "r", text: String(pos) }), el("span", { class: "nm", text: nm }), el("span", { class: "sc", text: r.score + " / " + (commPack.cases || commPack.words).length * 100 })]));
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
    var hs = (commPack.cases || []).map(function (c) { var st = caseStats(c); return { c: c, st: st, pct: st.n ? Math.round(st.ok / st.n * 100) : null }; }).filter(function (x) { return x.st.n >= 3; });
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
  function drawCard(total, max, rank, log, mode) {
    var W = 1080, H = 1080, c = document.createElement("canvas");
    c.width = W; c.height = H;
    var x = c.getContext("2d"), D = '"Young Serif", Georgia, serif', B = '"Hanken Grotesk", "Helvetica Neue", Arial, sans-serif';
    var PLUM = "#3a1f3d", TEAL = "#1f9d8f", TEAL_INK = "#0e6f64", CORAL = "#ff6f59", CORAL_INK = "#c23a24", SUN = "#ffbe0b", MUTE = "#7a5a78";
    x.fillStyle = "#fff1e2"; x.fillRect(0, 0, W, H);

    // sunrise shapes, top right
    x.fillStyle = SUN; x.beginPath(); x.arc(W - 40, 20, 190, 0, Math.PI * 2); x.fill();
    x.fillStyle = CORAL; x.beginPath(); x.arc(W - 250, 10, 78, 0, Math.PI * 2); x.fill();
    x.fillStyle = TEAL; x.beginPath(); x.arc(W - 40, 250, 46, 0, Math.PI * 2); x.fill();

    // logo mark: sun, coral disc, check
    x.save(); x.translate(72, 64); x.scale(1.55, 1.55);
    x.fillStyle = SUN; x.beginPath(); x.arc(19, 19, 18, 0, Math.PI * 2); x.fill();
    x.fillStyle = CORAL; x.beginPath(); x.arc(24.5, 24.5, 9, 0, Math.PI * 2); x.fill();
    x.strokeStyle = PLUM; x.lineWidth = 3.4; x.lineCap = "round"; x.lineJoin = "round";
    x.beginPath(); x.moveTo(10, 19); x.lineTo(15.5, 24.5); x.lineTo(26.5, 12.5); x.stroke();
    x.restore();

    x.textBaseline = "alphabetic";
    x.font = "400 62px " + D; x.fillStyle = PLUM; x.fillText("Hype", 150, 118);
    var hw = x.measureText("Hype").width; x.fillStyle = CORAL_INK; x.fillText("sift", 150 + hw, 118);

    var words = mode === "words";
    var parts = words ? [["AI", TEAL_INK], ["VoCab", CORAL_INK]] : [["Signal", TEAL_INK], [" or ", PLUM], ["hype?", CORAL_INK]], px = 72;
    x.font = "400 100px " + D;
    parts.forEach(function (p) { x.fillStyle = p[1]; x.fillText(p[0], px, 360); px += x.measureText(p[0]).width; });

    x.font = "400 280px " + D; x.fillStyle = TEAL_INK; x.fillText(String(total), 66, 660);
    var sw = x.measureText(String(total)).width;
    x.font = "800 58px " + B; x.fillStyle = MUTE; x.fillText("/ " + max, 66 + sw + 24, 660);

    x.font = "400 88px " + D; x.fillStyle = PLUM; x.fillText(rank, 72, 800);

    var n = log.length, r = 28, gap = 24, startX = 72 + r;
    log.forEach(function (l, i) {
      var cx = startX + i * (r * 2 + gap);
      x.beginPath(); x.arc(cx, 892, r, 0, Math.PI * 2); x.fillStyle = l.vOk ? TEAL : CORAL; x.fill();
      x.font = "800 30px " + B; x.fillStyle = PLUM; x.textAlign = "center"; x.fillText(l.vOk ? "✓" : "×", cx, 903); x.textAlign = "left";
    });
    var right = log.filter(function (l) { return l.vOk; }).length;
    x.font = "600 42px " + B; x.fillStyle = MUTE; x.fillText(right + " of " + n + (words ? " meanings right" : " calls right"), 72, 992);
    x.font = "800 32px " + B; x.fillStyle = PLUM; x.textAlign = "right"; x.fillText(words ? "How many AI words do you know?" : "Can you sift it?", W - 72, 1024); x.textAlign = "left";
    return c;
  }
  function shareBlock(total, max, rank, log, mode) {
    var box = el("section", { class: "sec" }, [el("span", { class: "label", text: "Share card" })]);
    var img = el("img", { class: "share", alt: "Result card: " + total + " of " + max + ", " + rank });
    var canvas = null;
    var go = function () { try { canvas = cardCanvas = drawCard(total, max, rank, log, mode); img.src = canvas.toDataURL("image/png"); } catch (e) {} };
    try {
      if (document.fonts && document.fonts.load) Promise.all([document.fonts.load('400 80px "Young Serif"'), document.fonts.load('800 40px "Hanken Grotesk"'), document.fonts.load('600 40px "Hanken Grotesk"')]).then(go, go);
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

  /* ---------- check a story: paste a link, get a sourced verdict ---------- */
  var CHECK_NAME = { solid: "Signal", overstated: "Hype", context: "Fine print", unverified: "Can't verify" };
  var CHECK_COLOR = { solid: "var(--signal)", overstated: "var(--hype)", context: "var(--ctx)", unverified: "var(--mute)" };
  var CHECK_GLYPH = { solid: "✓", overstated: "!", context: "?", unverified: "–" };
  var lastCheck = null, checkLeft = null;

  function checkScreen() {
    screen = "check"; setChrome("check"); app.innerHTML = "";
    var back = el("button", { class: "btn ghost", type: "button", text: "Back" });
    back.onclick = goBack;
    app.appendChild(el("section", { class: "hero" }, [
      el("h1", { class: "rank", text: "Check a story" }),
      el("p", { text: "Found an AI story online? Paste the link and I'll look for the original source." }),
      el("div", { class: "row" }, [back])
    ]));
    if (!FN) { app.appendChild(el("p", { class: "note", text: "Story checking isn't available here." })); return; }

    var link = el("input", { id: "chkUrl", type: "url", maxlength: "500", placeholder: "https://", autocomplete: "off" });
    var text = el("textarea", { id: "chkText", maxlength: "4000", rows: "4", placeholder: "Optional: paste the text of the post. Needed for Facebook, LinkedIn, X and Instagram, which often hide posts." });
    var msg = el("p", { class: "msg", "aria-live": "polite" });
    var go1 = el("button", { class: "btn block", type: "button", text: "Check it" });
    var out = el("div", { class: "chkout" });
    var left = el("p", { class: "meta" });
    function paintLeft() { left.textContent = checkLeft === null ? "" : checkLeft + (checkLeft === 1 ? " free check" : " free checks") + " left today. Repeat checks of the same story are free."; }

    go1.onclick = function () {
      var u = (link.value || "").trim(), t = (text.value || "").trim();
      if (!u && t.length < 20) { msg.className = "msg no"; msg.textContent = "Paste a link, or at least a sentence of the post."; return; }
      if (u && !safeUrl(u)) { msg.className = "msg no"; msg.textContent = "The link should start with http."; return; }
      go1.disabled = true; msg.className = "msg"; msg.textContent = "Checking the source. This can take up to a minute…"; out.innerHTML = "";
      FN("check-story", { url: u, text: t }).then(function (r) {
        go1.disabled = false;
        if (typeof r.left === "number") { checkLeft = r.left; paintLeft(); }
        if (r.result) { lastCheck = r.result; msg.textContent = ""; paintCheck(out, r.result, r.cached); return; }
        msg.className = "msg no"; msg.textContent = r.message || "That check didn't work. Please try again.";
      }, function () { go1.disabled = false; msg.className = "msg no"; msg.textContent = "Couldn't reach the checker. Check your connection and try again."; });
    };
    app.appendChild(el("section", { class: "card" }, [field("chkUrl", "Link", link), field("chkText", "Post text (optional)", text), msg, go1, left]));
    app.appendChild(out);
    paintLeft();
    if (lastCheck) paintCheck(out, lastCheck, false);
    app.appendChild(el("p", { class: "note", text: "Hypesift AI reads the page and searches the web, so it can be wrong. Open the sources to judge for yourself." }));
  }

  function paintCheck(box, r, cached) {
    box.innerHTML = "";
    var v = CHECK_NAME[r.verdict] ? r.verdict : "unverified";
    var head = el("div", { class: "vchip" }, [el("span", { class: "g", text: CHECK_GLYPH[v] }), document.createTextNode(CHECK_NAME[v])]);
    head.firstChild.style.background = CHECK_COLOR[v];
    var kids = [head, el("p", { class: "claim", text: r.headline || "" })];
    if (r.claim) kids.push(el("small", { class: "meta", text: "Claim checked: " + r.claim }));
    var ul = el("ul", { class: "why" });
    (r.reasons || []).forEach(function (x) { ul.appendChild(el("li", { text: x })); });
    if (ul.children.length) kids.push(ul);
    if (r.missing) kids.push(el("p", { class: "note", text: "Missing context: " + r.missing }));
    var srcs = (r.sources || []).filter(function (s) { return safeUrl(s.url); });
    if (srcs.length) {
      var sl = el("div", { class: "srcs" }, [el("span", { class: "label", text: "Sources" })]);
      srcs.forEach(function (s) { var a = el("a", { href: s.url, target: "_blank", rel: "noopener noreferrer nofollow", text: s.title || s.url }); sl.appendChild(a); });
      kids.push(sl);
    }
    kids.push(el("small", { class: "meta", text: "Confidence: " + (r.confidence || "low") + (cached ? " · checked recently" : "") }));
    var copy = el("button", { class: "btn ghost", type: "button", text: "Copy result" });
    copy.onclick = function () {
      var t = "Hypesift check: " + CHECK_NAME[v] + ". " + (r.headline || "") + " " + SITE;
      var done = function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy result"; }, 1800); };
      try { navigator.clipboard.writeText(t).then(done, function () { copy.textContent = "Copy failed"; }); } catch (e) { copy.textContent = "Copy failed"; }
    };
    kids.push(el("div", { class: "row" }, [copy]));
    box.appendChild(el("section", { class: "card" }, kids));
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
    var wk = Object.keys(P.words.learned).length, wt = allWords().length;
    var wsec = el("section", { class: "sec" }, [
      el("span", { class: "label", text: "AI words learned" }),
      el("div", { class: "meter" }, [el("i", { style: "width:" + (wt ? Math.round(wk / wt * 100) : 0) + "%" })]),
      el("p", { class: "note", text: wk + " of " + wt + " words. " + (wk ? "Keep going in AIVoCab." : "Play AIVoCab to start collecting words.") })
    ]);
    [head, stats, cal, hist, WPACKS.length ? wsec : null, bs, el("div", { class: "row" }, [reset])].forEach(function (x) { if (x) app.appendChild(x); });
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
    else if (name === "check") checkScreen();
    else if (name === "how") howPage();
    else if (name === "words") wordsHome();
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
  $("#navBack").onclick = goBack;
  $("#navHow").onclick = function () { go("how"); };
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
