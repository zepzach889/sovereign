# Sovereign — changelog

## v12.8 — the blocker

### The deadlock, and what actually caused it

v12.7's coming-of-age beat wrote `h.trait = "able"` — a key that is not in
`TRAITS`. `traitShown()` then did `TRAITS[p.trait].name` with no guard, so from
that moment **every render in the game threw**, and no button did anything. The
chronicle would not open because nothing would open.

Three fixes, because one was not enough:

- The outcome writes a real trait key.
- `traitShown()` now returns nothing for an unknown key instead of taking down
  the entire UI. A bad key should degrade, not detonate.
- The skill and loyalty rolls added in v12.6 were also reading trait names that
  do not exist (`able`, `idle`, `loyal`, `ambitious`), so those modifiers had
  silently never fired. They now use the real traits — and a martial candidate
  is better at the army, a pious one at the pulpit, a cruel one less trusted.

New tests drive all six coming-of-age outcomes, assert that nothing anywhere
writes an unknown trait key, and assert the UI survives one if it ever does.

### One coming-of-age beat, not two

There was already an `ofage` beat in the dynastic phase. In v12.7 I built a
second one beside it and wired mine into `toDynCourt()` — which is called from
inside render passes, so entering the phase called `render()` from within
`render()`. That is why you saw the old screen and then the new one.

The old two-option screen is gone. The existing beat now renders the new one, so
there is a single entry point and no re-entrant render. `doHeirAge` also refuses
to act unless the game is actually in that beat, so a stale button cannot apply
it twice.

### Pinned panels

The government box and the royal family stay put while the decision below them
scrolls — they are the state of the realm, and you should not have to scroll
away from them to read a choice. On short screens they release back to normal
flow rather than eating the viewport.

### Cadet lines, on request

The summary line now has a **show** toggle: branch by branch, with names, ages
and who is married. Closed by default, which you were right about.

---

## Known wrong, on purpose — still to come

**Next, in order:**
- **Reform bonus tiers** — of its own motion / upon petition / under duress.
- **The franchise** — property / widened / broad / universal as a weighted gate
  on the commons; provinces removed as an estate; officers to the upper house.
- **Legislation** — named bills from the dominant estate, so assent has an object.

**Then the thing everything waits on:**
- **Legitimacy and revenue.** Regime-specific formulas; the junta ceiling;
  per-regime routes back up; a grant action for every regime; retrenchment as a
  costed choice. Until this lands, a ceremonial crown is not rewarded and a
  people's republic cannot exceed about 39 legitimacy.

**After that:** foreign powers; Eras IX–XII and an answer for knowledge once the
tree runs out; court options for the workers once they wake, and where "the
workers wake" sits in the tree; the regime-aware vocabulary pass; the Legacy
page; the UI rework.

**Parked by agreement:** health and cause of death; constitution-drafting entry
mode; the deeper culture and religion layer.

## v12.5 — the offices of state

Five posts, per-office candidate fields, competence, the rest of the prerogative
ladder wired to real actions, fertility rebuilt, variable marriage terms, and the
era gate on women in office.

## v12.4 — the constitutional frame

Long-reign toggle; the prerogative ladder; the three ministry bands; summons
versus a player-set electoral cycle.
