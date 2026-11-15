/* Checks words.js before it is committed: node scripts/validate-words.js */
const fs = require("fs");
const path = require("path");
global.window = {};
eval(fs.readFileSync(path.join(__dirname, "..", "words.js"), "utf8"));
const D = window.HYPESIFT_WORDS;
const problems = [];
const seenWords = {}, seenPacks = {};
const LEVELS = ["Starter", "Everyday", "Insider"];
D.packs.forEach((pk) => {
  if (seenPacks[pk.id]) problems.push("duplicate pack id " + pk.id);
  seenPacks[pk.id] = true;
  ["id", "label", "blurb", "checked"].forEach((k) => { if (!pk[k]) problems.push(pk.id + ": missing " + k); });
  if (["starter", "weekly"].indexOf(pk.track) < 0) problems.push(pk.id + ": track must be starter or weekly");
  if (pk.words.length !== 8) problems.push(pk.id + ": expected 8 words, found " + pk.words.length);
  const levels = {}, dpos = [0, 0, 0], upos = [0, 0, 0];
  pk.words.forEach((w) => {
    const at = pk.id + "/" + w.id;
    if (seenWords[w.id]) problems.push("duplicate word id " + w.id);
    seenWords[w.id] = true;
    ["id", "word", "say", "plain", "where", "mixup", "src"].forEach((k) => { if (!w[k]) problems.push(at + ": missing " + k); });
    if (LEVELS.indexOf(w.level) < 0) problems.push(at + ": bad level " + w.level);
    levels[w.level] = (levels[w.level] || 0) + 1;
    if (!/^https:\/\//.test(w.url || "")) problems.push(at + ": url must start with https://");
    [["defs", "d", dpos], ["uses", "u", upos]].forEach(([list, idx, pos]) => {
      if (!Array.isArray(w[list]) || w[list].length !== 3) { problems.push(at + ": " + list + " needs exactly 3 items"); return; }
      if (!(w[idx] >= 0 && w[idx] < 3)) problems.push(at + ": " + idx + " must be 0, 1 or 2"); else pos[w[idx]]++;
      if (new Set(w[list]).size !== 3) problems.push(at + ": " + list + " has duplicates");
      w[list].forEach((t) => { if (!t || t.length > 140) problems.push(at + ": " + list + " item empty or over 140 characters"); });
    });
    if (w.plain && w.plain.length > 330) problems.push(at + ": plain is over 330 characters");
  });
  console.log(pk.label + " (" + pk.id + "): " + pk.words.length + " words, levels " + JSON.stringify(levels) + ", right-answer positions meaning " + JSON.stringify(dpos) + " sentence " + JSON.stringify(upos));
});
if (problems.length) { console.error("\nProblems:\n - " + problems.join("\n - ")); process.exit(1); }
console.log("words.js is valid (" + Object.keys(seenWords).length + " words)");
