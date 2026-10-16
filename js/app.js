"use strict";

/*
 * love-adventure — "The Adventure Machine".
 *
 * Three reels (where / what / twist) spin into a little quest for two.
 * Reels can be locked; a quest can be sent as a link (?q=w,wh,t) so both
 * halves of the couple get the exact same one. Completed quests land in a
 * local logbook (localStorage `mena-adventure`).
 */

(function () {
  var WHERE = [
    "our kitchen",
    "a pizza place in Karachi",
    "a park in Bucharest",
    "the balcony at sunset",
    "a quiet bookshop",
    "the living-room floor",
    "a long video call",
    "the cinema",
    "a museum we've never tried",
    "a sleepy little cafe"
  ];
  var WHAT = [
    "cook something from scratch",
    "order the same pizza in both cities",
    "write a letter to future-us",
    "dance to one song, however silly",
    "draw each other badly",
    "build a blanket fort",
    "watch the same sunset on a call",
    "learn five words of each other's language",
    "take ten photos of ordinary things",
    "bake something sweet",
    "read one chapter out loud",
    "plan the next trip in real detail"
  ];
  var TWIST = [
    "everything whispered",
    "in your bravest accent",
    "against a twenty-minute timer",
    "one of you blindfolded to start",
    "only talking in questions",
    "both wearing something white",
    "with the rain (real or imagined)",
    "holding one hand the whole time"
  ];

  var LS = "mena-adventure";
  var state = {
    spins: 0,
    done: [],
    locks: { where: false, what: false, twist: false },
    current: null
  };

  function $(id) { return document.getElementById(id); }

  function load() {
    try {
      var raw = window.localStorage.getItem(LS);
      if (!raw) return;
      var p = JSON.parse(raw);
      state.spins = p.spins | 0;
      state.done = Array.isArray(p.done) ? p.done.slice(0, 10) : [];
      if (p.locks) {
        state.locks.where = !!p.locks.where;
        state.locks.what = !!p.locks.what;
        state.locks.twist = !!p.locks.twist;
      }
      if (p.current) state.current = p.current;
    } catch (e) { /* fresh */ }
  }

  function save() {
    try {
      window.localStorage.setItem(LS, JSON.stringify({
        spins: state.spins,
        done: state.done,
        locks: state.locks,
        current: state.current
      }));
    } catch (e) { /* ignore */ }
  }

  function fmtDate(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    return d.getDate() + "/" + (d.getMonth() + 1);
  }

  function pick(list) {
    return Math.floor(Math.random() * list.length);
  }

  function questText(c) {
    if (!c) return "Press the button and let the machine choose.";
    return "Go to " + WHERE[c.w] + " and " + WHAT[c.wh] +
      " \u2014 but " + TWIST[c.t] + ".";
  }

  function renderReels() {
    var c = state.current;
    $("where-text").textContent = c ? WHERE[c.w] : "\u2014";
    $("what-text").textContent = c ? WHAT[c.wh] : "\u2014";
    $("twist-text").textContent = c ? TWIST[c.t] : "\u2014";
    ["where", "what", "twist"].forEach(function (key) {
      var locked = state.locks[key];
      var btn = $("lock-" + key);
      btn.setAttribute("aria-pressed", locked ? "true" : "false");
      btn.textContent = locked ? "\uD83D\uDD12" : "\uD83D\uDD13";
      var reel = $("reel-" + key);
      if (reel.classList) {
        if (locked) reel.classList.add("locked");
        else reel.classList.remove("locked");
      }
    });
  }

  function renderQuest() {
    $("quest-text").textContent = questText(state.current);
  }

  function renderStats() {
    $("spins").textContent = String(state.spins);
    $("done-count").textContent = String(state.done.length);
    $("last-done").textContent = state.done.length ? fmtDate(state.done[0].at) : "never";
  }

  function renderLog() {
    var list = $("quest-log");
    list.textContent = "";
    if (!state.done.length) {
      var empty = document.createElement("li");
      empty.className = "empty-note";
      empty.textContent = "No adventures yet \u2014 that changes today.";
      list.appendChild(empty);
      return;
    }
    state.done.forEach(function (entry) {
      var li = document.createElement("li");
      var text = document.createElement("span");
      text.textContent = entry.text;
      var date = document.createElement("span");
      date.className = "log-date";
      date.textContent = fmtDate(entry.at);
      li.appendChild(text);
      li.appendChild(date);
      list.appendChild(li);
    });
  }

  function spin() {
    var c = state.current || { w: 0, wh: 0, t: 0 };
    if (!state.locks.where) c.w = pick(WHERE);
    if (!state.locks.what) c.wh = pick(WHAT);
    if (!state.locks.twist) c.t = pick(TWIST);
    state.current = c;
    state.spins += 1;
    save();
    renderReels();
    renderQuest();
    renderStats();
    $("spin-note").textContent = "The machine has chosen. No take-backs \u2665";
  }

  function accept() {
    if (!state.current) {
      $("spin-note").textContent = "Spin a quest first \u2665";
      return;
    }
    var c = state.current;
    state.done.unshift({
      w: c.w, wh: c.wh, t: c.t,
      text: questText(c),
      at: Date.now()
    });
    if (state.done.length > 10) state.done = state.done.slice(0, 10);
    save();
    renderLog();
    renderStats();
    $("spin-note").textContent = "Logged in the book \u2014 look at you two go \u2665";
  }

  function share() {
    if (!state.current) {
      $("share-note").textContent = "Spin a quest first, then send it \u2665";
      return;
    }
    var c = state.current;
    var url;
    try {
      url = window.location.origin + window.location.pathname +
        "?q=" + c.w + "," + c.wh + "," + c.t;
    } catch (e) {
      url = "?q=" + c.w + "," + c.wh + "," + c.t;
    }
    function copied() {
      $("share-note").textContent = "Quest copied \u2014 send it and see if they dare \u2665";
    }
    function fallback() {
      $("share-note").textContent = "Copy this by hand: " + url;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(copied, fallback);
      } else {
        fallback();
      }
    } catch (e) {
      fallback();
    }
  }

  function wireLocks() {
    ["where", "what", "twist"].forEach(function (key) {
      $("lock-" + key).addEventListener("click", function () {
        state.locks[key] = !state.locks[key];
        save();
        renderReels();
      });
    });
  }

  function readArrival() {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return false; }
    var q = params.get("q");
    if (!q) return false;
    var parts = q.split(",").map(Number);
    if (parts.length !== 3 || parts.some(function (n) { return !(n >= 0); })) return false;
    if (parts[0] >= WHERE.length || parts[1] >= WHAT.length || parts[2] >= TWIST.length) return false;
    state.current = { w: parts[0], wh: parts[1], t: parts[2] };
    return true;
  }

  function boot() {
    load();
    var arrived = readArrival();
    renderReels();
    renderQuest();
    renderStats();
    renderLog();
    wireLocks();

    $("spin").addEventListener("click", spin);
    $("accept").addEventListener("click", accept);
    $("share-quest").addEventListener("click", share);

    if (arrived) {
      var note = $("arrive-note");
      note.textContent = "Ammar sent you this quest \u2665 \u2014 press \u201cWe did it!\u201d when you finish.";
      note.hidden = false;
      $("spin-note").textContent = "A quest arrived, exactly as it was spun.";
    }

    if (typeof navigator !== "undefined" && navigator.serviceWorker) {
      try { navigator.serviceWorker.register("sw.js"); } catch (e) { /* ignore */ }
    }
  }

  boot();
})();
