/* Checks packs.js before it is committed: node scripts/validate-packs.js */
const fs = require("fs");
const path = require("path");
global.window = {};
eval(fs.readFileSync(path.join(__dirname, "..", "packs.js"), "utf8"));
const D = window.HYPESIFT_DATA;
const problems = [];
const seenIds = {}, seenPackIds = {};
const VERDICTS = ["solid", "overstated", "context"];
D.packs.forEach((pk) => {
  if (seenPackIds[pk.id]) problems.push("duplicate pack id " + pk.id);
  seenPackIds[pk.id] = true;
  if (!pk.label || !pk.checked) problems.push(pk.id + ": label and checked are required");
  if (pk.cases.length !== 8) problems.push(pk.id + ": expected 8 cases, found " + pk.cases.length);
  pk.cases.forEach((c) => {
    const w = pk.id + "/" + c.id;
    if (seenIds[c.id]) problems.push("duplicate case id " + c.id);
    seenIds[c.id] = true;
    ["id", "title", "date", "src", "url", "claim", "why", "pattern"].forEach((k) => { if (!c[k]) problems.push(w + ": missing " + k); });
    if (typeof c.primary !== "boolean") problems.push(w + ": primary must be true or false");
    if (!/^https:\/\//.test(c.url || "")) problems.push(w + ": url must start with https://");
    if (VERDICTS.indexOf(c.verdict) < 0) problems.push(w + ": bad verdict " + c.verdict);
    if (!Array.isArray(c.opts) || c.opts.length !== 3) problems.push(w + ": needs exactly 3 opts");
    else if (!(c.right >= 0 && c.right < 3)) problems.push(w + ": right must be 0, 1 or 2");
    if (!Array.isArray(c.facts) || c.facts.length < 2) problems.push(w + ": needs at least 2 facts");
    if (!D.tips[c.pattern]) problems.push(w + ": pattern '" + c.pattern + "' has no entry in tips");
  });
  const counts = {};
  pk.cases.forEach((c) => { counts[c.verdict] = (counts[c.verdict] || 0) + 1; });
  console.log(pk.label + " (" + pk.id + "): " + pk.cases.length + " cases, verdicts " + JSON.stringify(counts));
});
if (problems.length) { console.error("\nProblems:\n - " + problems.join("\n - ")); process.exit(1); }
console.log("packs.js is valid");