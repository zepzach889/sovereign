# Sovereign

A solo game of governing one nation across centuries. You are not a king —
you are the **will that governs**, the hand on the wheel while sovereigns are
born, crowned and buried. There is no winning and no game over; only the
history you leave behind.

Play it at **[zepzach889.github.io/sovereign](https://zepzach889.github.io/sovereign)**.

## How this repo is arranged

The game is written as 26 modules under `src/`. `index.html` is a short page
that loads them in order — that is the real game, and it is what GitHub Pages
serves. Edit a module, push, and the live game changes. There is no build step
in the loop.

```
index.html          the page — a stylesheet link and 26 script tags
src/00-util.js …    the game, in order
src/manifest.json   the running order
src/style.css       every screen's appearance
```

Order matters. The modules share one namespace and run top to bottom, so a
module that references something defined later will fail loudly on load. If you
add a module, add it to `manifest.json` **and** to the script tags in
`index.html`; `build.js` refuses to run if the two disagree.

| module | what lives there |
|---|---|
| `00-util` | `clamp`, `rand`, `pick`, `chance` |
| `01-names` | culture packs — names, houses, titles, chamber names |
| `02-model` | succession law, estates, power and consent |
| `03-economy` | income, debt, upkeep, mortality |
| `04-family` | the family graph — relations derived, never stored |
| `05-provinces` | named territory, loyalty, secession |
| `06-pressures` | military · radical · constitutional · restorationist |
| `07-actions` | the standing toolbox (Court phase) |
| `08-reforms` | named, previewed constitutional reforms |
| `09-events` | the recurrence-tiered event pool |
| `10-milestones` | what the chronicle records |
| `11-state` | state shape and `newGame` |
| `12-turn` | Event → Court → Advancement → the regime's third phase |
| `13-eras` | eras, advances, works, the knowledge economy |
| `14-succession` | heirs, crises, contested successions |
| `15-revolt` | order collapse |
| `16-junta` | the coup, the provisional government, its exits |
| `17-republic` | elections, mandates, waking behind the winner |
| `18-convention` | the republic's third phase |
| `19-peoples` | the party, the plan, the politburo |
| `20-transition` | the twelve edges between the four regimes |
| `21-legacy` | the historian's verdict |
| `22-render` | every screen |
| `23-handlers` | what the buttons do |
| `24-setup` | the founding screen |
| `25-boot` | save, load, autosave, migration, start-up |

## Testing

```
node harness.js              targeted tests + a 6,000-step chaos run
node harness.js 20000        a longer run
node harness.js 6000 7       a fixed seed, so a failure can be replayed
```

The harness loads the modules under a small fake DOM, plays the game by
clicking randomly through whatever the current screen offers, and checks the
invariants after every single step — chiefly that **the power pool always sums
to exactly 100**. It also installs every regime and walks all twelve transition
edges. The chaos run has caught bugs that every targeted test missed. Run it.

## The offline build

The single-file version still exists; it is just no longer in the way.

```
node build.js        ->  dist/sovereign.html
```

That binds every module and the stylesheet into one self-contained file that
plays with no server, no install and no network — for a plane, a flash drive,
or a classroom with hostile wifi. It also refuses to write a file with
duplicate top-level function definitions, which is how a build once shipped
with two `doDesignate`s where the second silently ate the first.

Never edit `dist/` by hand. It is generated.

## Adding a culture pack

Culture packs are cosmetic: they change what the realm *calls* things, not how
it works. Open `src/01-names.js`, copy any entry in `CULTURES`, change the lists.

```js
myrealm:{ name:"My Realm", blurb:"…",
  m:{early:[…], late:[…]},      // naming fashions drift as the ages turn
  f:{early:[…], late:[…]},
  surnames:[…], houses:[…],
  titles:["King","Emperor"],     // must exist in TITLE_FORMS
  inst:["The Estates", …] }      // suggested names when a chamber is chartered
```

Reload the page and it appears on the founding screen.
