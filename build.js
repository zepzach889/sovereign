#!/usr/bin/env node
/* Sovereign build — stitches src/ modules into one standalone offline HTML file. */
const fs = require("fs"), path = require("path");
const SRC = path.join(__dirname, "src"), DIST = path.join(__dirname, "dist");
const manifest = JSON.parse(fs.readFileSync(path.join(SRC, "manifest.json"), "utf8"));
const read = f => fs.readFileSync(path.join(SRC, f), "utf8");

const js = manifest.map(m => read(m + ".js")).join("\n");
const out = [read("shell-head.html"), read("style.css"), read("shell-mid.html"), js, read("shell-tail.html")].join("\n");

fs.mkdirSync(DIST, { recursive: true });
const target = path.join(DIST, "sovereign.html");
fs.writeFileSync(target, out);
console.log(`built ${target}  (${out.length.toLocaleString()} bytes, ${manifest.length} modules)`);

/* sanity: the bundle must parse as JS */
try { new Function(js); console.log("script parses: OK"); }
catch (e) { console.error("SCRIPT PARSE ERROR:", e.message); process.exit(1); }
