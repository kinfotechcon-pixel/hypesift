/* Hypesift web backend: a small adapter that gives the game the same shape of
   database it gets inside Claude, but backed by Supabase over plain HTTPS.
   It is only used when config.js contains a Supabase URL and public (anon) key.

   Players sign in anonymously (no email, no password); each browser gets a random id.
   Row-level security in supabase/schema.sql decides what each id may read or write. */
(function () {
  "use strict";

  /* Save a generated file the normal web way: a temporary link click. */
  function downloads() {
    return {
      save: function (req) {
        return new Promise(function (resolve, reject) {
          try {
            var blob = typeof Blob !== "undefined" && req.data instanceof Blob ? req.data : new Blob([req.data]);
            var url = URL.createObjectURL(blob);
            var a = document.createElement("a");
            a.href = url;
            a.download = req.filename || "download";
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
            resolve({ status: "saved" });
          } catch (e) {
            reject({ code: "unavailable", message: String(e) });
          }
        });
      }
    };
  }

  function create(cfg) {
    var base = String(cfg.supabaseUrl).replace(/\/+$/, "");
    var anon = cfg.supabaseAnonKey;
    var SKEY = "hypesift-sb-session";
    var session = null;
    var sessionP = null;

    function readSession() {
      try {
        var s = JSON.parse(localStorage.getItem(SKEY) || "null");
        if (s && s.access_token && s.user_id) return s;
      } catch (e) {}
      return null;
    }
    function writeSession(s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} }
    function toSession(j) {
      var now = Math.floor(Date.now() / 1000);
      return { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || now + (j.expires_in || 3600), user_id: j.user && j.user.id };
    }
    function authCall(path, body) {
      return fetch(base + "/auth/v1/" + path, {
        method: "POST",
        headers: { apikey: anon, "Content-Type": "application/json" },
        body: JSON.stringify(body || {})
      }).then(function (r) {
        if (!r.ok) throw { code: "unavailable", message: "auth " + r.status };
        return r.json();
      });
    }

    /* Anonymous sign-in, reused across visits and refreshed when it expires. */
    function ensureSession() {
      var now = Math.floor(Date.now() / 1000);
      if (!session) session = readSession();
      if (session && session.expires_at > now + 60) return Promise.resolve(session);
      if (sessionP) return sessionP;
      var p;
      if (session && session.refresh_token) {
        p = authCall("token?grant_type=refresh_token", { refresh_token: session.refresh_token }).catch(function () { return authCall("signup", {}); });
      } else {
        p = authCall("signup", {});
      }
      sessionP = p.then(function (j) {
        var s = toSession(j);
        if (!s.user_id || !s.access_token) throw { code: "unavailable", message: "no session" };
        session = s; writeSession(s); sessionP = null;
        return s;
      }, function (e) { sessionP = null; throw e; });
      return sessionP;
    }

    function rest(method, path, body, extra) {
      return ensureSession().then(function (s) {
        var h = { apikey: anon, Authorization: "Bearer " + s.access_token, "Content-Type": "application/json" };
        if (extra) { for (var k in extra) h[k] = extra[k]; }
        return fetch(base + "/rest/v1/" + path, { method: method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) });
      }).then(function (r) {
        if (!r.ok) {
          var code = r.status === 401 || r.status === 403 ? "invalid_argument" : r.status === 429 ? "resource_exhausted" : "unavailable";
          throw { code: code, message: "rest " + r.status };
        }
        if (r.status === 204) return null;
        return r.text().then(function (t) { return t ? JSON.parse(t) : null; });
      });
    }

    var TABLES = { players: { pk: "id" }, submissions: { pk: "user_id" } };
    var cache = {}; // players by id, kept so names can be resolved without another request

    function fetchPlayers() {
      return rest("GET", "players?select=id,data&order=updated_at.desc&limit=1000").then(function (rows) {
        var docs = [];
        cache = {};
        (rows || []).forEach(function (r) {
          var d = r.data || {};
          cache[r.id] = d;
          docs.push({ id: r.id, data: function () { return d; } });
        });
        return { docs: docs, size: docs.length, empty: !docs.length };
      });
    }

    var ticks = []; // refresh functions of live board listeners, run again after our own write

    var db = {
      collection: function (name) {
        return {
          onSnapshot: function (next, error) {
            if (name !== "players") return function () {};
            var stopped = false, first = true, timer = null;
            function tick() {
              if (stopped) return;
              fetchPlayers().then(function (snap) { first = false; if (!stopped) next(snap); }, function (e) {
                if (first && !stopped && error) { first = false; stopped = true; clearInterval(timer); error(e); }
              });
            }
            ticks.push(tick);
            tick();
            timer = setInterval(function () { if (typeof document !== "undefined" && document.hidden) return; tick(); }, 30000);
            return function () {
              stopped = true; clearInterval(timer);
              var i = ticks.indexOf(tick); if (i >= 0) ticks.splice(i, 1);
            };
          }
        };
      },
      doc: function (path) {
        var parts = String(path).split("/");
        var t = TABLES[parts[0]];
        var id = parts[1];
        return {
          set: function (data) {
            var row = { data: data };
            row[t.pk] = id;
            return rest("POST", parts[0] + "?on_conflict=" + t.pk, row, { Prefer: "resolution=merge-duplicates,return=minimal" }).then(function () {
              if (parts[0] === "players") ticks.slice().forEach(function (f) { f(); });
            });
          },
          onSnapshot: function (next, error) {
            var stopped = false;
            rest("GET", parts[0] + "?" + t.pk + "=eq." + encodeURIComponent(id) + "&select=data").then(function (rows) {
              if (stopped) return;
              var d = rows && rows[0] ? rows[0].data : null;
              next({ exists: !!d, data: function () { return d || undefined; } });
            }, function (e) { if (!stopped && error) error(e); });
            return function () { stopped = true; };
          }
        };
      }
    };

    var user = {
      id: function () { return ensureSession().then(function (s) { return s.user_id; }, function () { return null; }); },
      can: function () { return Promise.resolve(true); },
      canEdit: function () { return Promise.resolve(false); },
      isOwner: function () { return Promise.resolve(false); },
      /* Names come only from a nickname the player chose to publish. */
      profiles: function (ids) {
        var out = {};
        (ids || []).forEach(function (i) {
          var d = cache[i];
          out[i] = { id: i, name: d && typeof d.display === "string" ? d.display : "" };
        });
        return Promise.resolve(out);
      }
    };

    /* Call a Supabase Edge Function as the signed-in anonymous player. */
    function fn(name, body) {
      return ensureSession().then(function (s) {
        return fetch(base + "/functions/v1/" + name, {
          method: "POST",
          headers: { apikey: anon, Authorization: "Bearer " + s.access_token, "Content-Type": "application/json" },
          body: JSON.stringify(body || {})
        });
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { j = j || {}; j.status = r.status; return j; });
      });
    }

    return { db: db, user: user, downloads: downloads(), fn: fn };
  }

  window.HypesiftBackend = { create: create, downloads: downloads };
})();
