#!/usr/bin/env node
/* Sovereign — bind the src/ modules into one standalone offline file.
   This is NOT part of the edit loop. Development is multi-file: index.html
   loads src/ directly and GitHub Pages serves it as-is. Run this when you
   want a single file to hand to someone with no wifi.
       node build.js          -> dist/sovereign.html                        */
const fs = require("fs"), path = require("path");
const SRC = path.join(__dirname, "src"), DIST = path.join(__dirname, "dist");
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, "manifest.json"), "utf8"));
const read = f => fs.readFileSync(path.join(SRC, f), "utf8");

const js = manifest.map(m => read(m + ".js")).join("\n");
const out = [read("shell-head.html"), read("style.css"), read("shell-mid.html"),
             js, read("shell-tail.html")].join("");

fs.mkdirSync(DIST, { recursive: true });
const target = path.join(DIST, "sovereign.html");
fs.writeFileSync(target, out);
console.log(`bound ${target}  (${out.length.toLocaleString()} bytes, ${manifest.length} modules)`);

/* --- guard 1: the bundle must parse --- */
try { new Function(js); console.log("  script parses: OK"); }
catch (e) { console.error("SCRIPT PARSE ERROR:", e.message); process.exit(1); }

/* --- guard 2: no duplicate top-level functions.
   A build once shipped two doDesignate definitions and the later one
   silently ate the newer logic. Never again. --- */
const names = [...js.matchAll(/^function\s+([A-Za-z0-9_$]+)/gm)].map(m => m[1]);
const dupes = names.filter((n, i) => names.indexOf(n) !== i);
if (dupes.length) {
  console.error("DUPLICATE FUNCTIONS:", [...new Set(dupes)].join(", "));
  process.exit(1);
}
console.log(`  ${names.length} top-level functions, no duplicates: OK`);

/* --- guard 3: index.html must list every module, in manifest order --- */
const idx = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
/* the ?v= suffix is cache-busting for GitHub Pages; bump it on every publish */
const tagged = [...idx.matchAll(/<script src="src\/([^"?]+)\.js(?:\?[^"]*)?"><\/script>/g)].map(m => m[1]);
if (tagged.join("|") !== manifest.join("|")) {
  console.error("index.html script tags do not match the manifest.");
  console.error("  manifest:", manifest.join(", "));
  console.error("  index:   ", tagged.join(", "));
  process.exit(1);
}
console.log(`  index.html loads all ${tagged.length} modules in order: OK`);
