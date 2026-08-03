# Sovereign — changelog

## v12.11 — three that were mine

### The state bar was painted black on black

`--ink` is the page background. `--bone` is the text colour. I used the first
for every value in the bar, so the numbers were invisible unless you selected
them. Corrected, and rebuilt properly: labelled pairs with the label small and
above, values in bone, warnings in crisis red, two items dropped. Legitimacy now
goes red under 35, treasury under zero, stability under 30, and an empty
succession reads as a warning rather than a word.

### The fourth suit was numbered `undefined`

The numeral list stopped at three, and the field runs to five. There was already
a one-indexed `ROMAN` in `01-names.js` — my duplicate declaration was caught by
the build's duplicate guard, which is what it is for. The screen also announced
"three suits are pressed" regardless of how many there were; it now counts.

### Nieces and nephews still at court

A niece is not a member of the sovereign's household at any age. The rule was
still letting them stay until twenty-five, and orphans stayed forever because a
dead parent never drifted into a branch to be followed into. Now: anyone outside
the sovereign's own children and the heir's household belongs to their parents'
line, walking up through dead parents to find it — and a parent who died before
ever having a branch still names one.

### On the tests

Two of the tests I wrote for this were vacuous and I caught them before shipping:
one read a `.html` property the mini-DOM does not have, so it joined empty
strings and always passed. The numeral check is now grounded in the numeral
source itself, and I inverted it to confirm it fails.

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
