# Sovereign — changelog

## v12.9 — the panels behave

### The pinned block

Pinning the state of the realm was right. Pinning *all* of it, with a
transparent backdrop, over a house of seventeen, was not.

- **Opaque now** — it sits on the console's own colour, so nothing scrolls
  visibly through it.
- **Capped at two fifths of the viewport** (a third on shorter screens) and
  scrolls inside itself, so the play options can never be pushed off the bottom.
- **The royal family keeps its own leash** — past nine rows the list scrolls
  within the panel rather than growing without limit.
- **A fold button**, if you would rather have the whole thing out of the way.

### A branch is a family, not a name

Two things were wrong with the cadet lines.

- **Children stayed at court after their parents left it**, so the royal family
  filled with nieces and nephews whose parents were nowhere to be seen. A child
  now goes into their parents' branch, and a spouse follows the person they
  married.
- **Expanding a branch showed only the person it was named after.** It now lists
  every member: their standing to the crown, their age, whom they married, and
  their children by name.

### The heir, and what you can sensibly do with them

A brother was being offered marriage into his own line, which is not a policy.
Coming-of-age now distinguishes three quite different problems:

- **A child** — a successor. Schooling, a command, a progress, or neglect.
- **A brother or sister** — a successor *and* a succession crisis in waiting,
  because the line runs through them and they have no children. If unmarried,
  they can now be **married without delay to secure the line**, which is the
  thing every court in the position actually did.
- **A nephew or cousin** — a claim the country has no feeling about. Adoption
  into the household, or marriage to one of the sovereign's own children, which
  is now only offered when there is somebody to marry, and names them.

The heir's kind is derived from the parent graph rather than the `rel` label,
because those labels are recomputed on every render and are not a thing to make
decisions on.

### More suits pressed

Three to five matches now, not one to three, drawn from six kinds rather than
three: the foreign crown, the great house, the love match, a house the hierarchs
have blessed, new money with a pedigree under construction, and a family that
has given the realm three generations of officers. The field is shuffled, so the
same three do not always survive the trim. Every new chip is wired to a real
effect.

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
