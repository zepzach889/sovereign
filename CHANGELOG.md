# Sovereign — changelog

## v12.7 — the two things I owed you

### Works and advances are different acts

Buying knowledge and building capacity were competing for one slot, so founding
a second Scriptorium cost you an age's worth of advance. They are not the same
kind of decision and should not be priced against each other.

- **One advance a turn**, because knowledge is the limiter. After you take it,
  the advances grey out and say so.
- **As many works as the treasury will bear**, because gold is the limiter.
  Founding one no longer ends the phase or spends your advance.
- An explicit way out of the phase, since nothing closes it for you now.

### The heir comes of age

A new beat, once per heir, when they cross into adulthood under a monarchy. Four
options for a direct heir and six for a collateral one, because a brother's
child who inherits is a genuinely different problem from a son — the claim is
sound on paper, and paper was never the difficulty.

- **Schooled in law and statecraft** — produces sovereigns who are hard to lie to.
- **Given a command on the frontier** — the army meets its future sovereign, in
  weather, and forms a view. That view matters the first time somebody suggests
  a coup.
- **Sent on progress through the provinces** — expensive, and the far country
  remembers it for a generation.
- **Left to their own household** — nothing spent, nothing decided, and they
  arrive at the throne a stranger to everyone.

And for a collateral heir only:

- **Brought into the household and styled the direct heir** — supplies the
  appearance of inevitability, at the price of every family that hoped otherwise.
- **Married into the direct line** — two claims made one, and any standing rival
  claim settled with it.

### Caught by the chaos runner

Two bugs in the above, both found by the 6,000-step run rather than by any
targeted test:

- The coming-of-age screen recursed infinitely when the heir died between the
  beat being raised and the screen being drawn.
- A stale coming-of-age button clicked from the outcome screen applied the beat
  a second time, over a result that was still pending. `doHeirAge` now refuses
  to act unless the game is actually in that phase — which is the general fix
  for that whole class of stale-click bug.

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
