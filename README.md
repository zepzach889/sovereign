# Sovereign

A solo, offline game of governing one nation across centuries. You are not a king —
you are the **will that governs**, the hand on the wheel while sovereigns are born,
crowned and buried. There is no winning, only the history you leave behind.

Play it by opening `dist/sovereign.html` in any browser. No server, no install,
no network. Progress is kept as save codes you can copy out and paste back in.

## Building

The game ships as a single self-contained HTML file, but the source lives as
modules under `src/`.

```
node build.js
```

That concatenates every module listed in `src/manifest.json`, wraps it in the
HTML shell with the stylesheet, writes `dist/sovereign.html`, and checks that the
bundled script parses. Never edit `dist/` by hand — it is generated.

## Layout

| file | what lives there |
|---|---|
| `src/00-util.js` | tiny helpers (`rand`, `pick`, `clamp`, `esc`) |
| `src/01-core.js` | globals and boot-level constants |
| `src/02-names.js` | **culture packs** — names, houses, titles, chamber names |
| `src/03-model.js` | succession law, estates, power and consent, economy, mortality |
| `src/04-actions.js` | the standing toolbox (Court phase) |
| `src/05-reforms.js` | named, previewed constitutional reforms |
| `src/06-events.js` | the recurrence-tiered event pool |
| `src/07-milestones.js` | milestones the chronicle records |
| `src/08-state.js` | state shape and `newGame` |
| `src/09-turn.js` | the turn: Event → Court → Advancement → Dynasty |
| `src/10-eras.js` | eras, advances, works, the knowledge economy |
| `src/11-succession.js` | heirs, crises, contested successions |
| `src/12-revolt.js` | order collapse (no game over) |
| `src/13-legacy.js` | the historian's verdict |
| `src/14-render.js` | every screen |
| `src/15-handlers.js` | what the buttons do |
| `src/16-setup.js` | the founding screen |
| `src/17-boot.js` | save/load/score/new, and start-up |

## Adding a culture pack

Culture packs are cosmetic: they change what the realm *calls* things, not how it
works. Open `src/02-names.js`, copy any entry in `CULTURES`, and change the lists.

```js
myrealm:{ name:"My Realm", blurb:"…",
  m:{early:[…], late:[…]},      // naming fashions drift as the ages turn
  f:{early:[…], late:[…]},
  surnames:[…], houses:[…],
  titles:["King","Emperor"],     // must exist in TITLE_FORMS
  inst:["The Estates", …] }      // suggested names when a chamber is chartered
```

Run `node build.js` and it appears on the founding screen.
