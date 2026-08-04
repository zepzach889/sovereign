# Sovereign — changelog

## v13.1 — you were toppled by the calendar

### Why the monarchy fell, and why it will not happen like that again

The constitutional pressure formula had no term for crown power, for a
charter, or for reform. A king holding 75 and a king holding 5 faced the
same reading, and nothing a player could do would lower it. It was:

```
collapse×0.5 + merchants×0.28 + reformers×0.3 + press + opinion + era×4 + 8
```

In the 1817 save that is ≈82 with collapse at zero — legitimacy 58, stability
98, and a rupture regardless. A clock, not a response.

Half of that was right and stays: the demand for representative government rose
with literacy and commerce whatever any individual monarch did, and 1848 hit
prosperous states. That is the **rising floor**. What was missing is that
conceding *worked*, which is the whole Britain-and-France lesson the prerogative
ladder exists to teach.

So there is now a **relief term** you earn:

- The age has an expectation of what a crown holds — 88 in the first era, five
  by the last. Sitting under it pays; sitting far over it costs.
- Chambers that hold real power, a charter, each widening of the franchise, and
  a ministry that actually governs all count.
- A reform granted **of its own motion** is remembered and keeps paying.

A crown at 20 in the Steam age should now sit under the curve. A crown at 75
should be far over it, and that gap is the number to watch.

### The three warnings I owed you

Proposed in the v12.3 triage, written into the plan, and then not built four
builds running. That is why the rupture felt arbitrary.

- **Attribution.** Every reading names its two largest drivers and what would
  bring it down. "The Barracks" at breaking point with the officers at 100 now
  says *a state the officers no longer believe can govern* rather than implying
  your soldiers hate you.
- **Tidings.** Any pressure raises a notice the turn it crosses 62, and again at
  78, phrased as report rather than alarm. It does not nag at the same band.
- **Above the fold.** Once anything passes 62 the Drift panel moves to the top of
  the sidebar instead of sitting under the provinces.

### A ministry comes from a lower house

Making the ministry born with the *first* chamber was my error. An Estates
General holding twelve points and consenting to taxes is not a body that
produces a Prime Minister — it is a body you summon when you need money and send
home again. It now takes a commons, or an assembly grown to hold 30 points, and
that single gate removes the coalition management, the programme of legislation,
the early elections and the PM who "just is there" from a period where none of
them existed.

### The heir's nursery

The sovereign's own children bred at 0.4 with one roll a turn, while cadet
branches ran at 0.55. The direct line was starved by construction — which is why
every game arrived at adoption. Three rolls now, as for a reigning house, and
grandchildren enter at 0–4 like everyone else.

### Fixed

- A new sovereign's consort stranded in a cadet line — whoever is crowned brings
  their household back to court with them.
- Relation labels in the branches going stale. They are recomputed against the
  current sovereign at display time, which is the rule this project already had.
- Office candidates labelled "cousin" instead of son or niece.
- Duplicate Aristocracy chips on a match when the estate being placated *was* the
  aristocracy — the chips and the effect now agree.
- "Create peers" says why the Lords loathe it: every peer you create is a vote
  the old families no longer control.
- The crown in personal rule now names its minister after **every** election, not
  only when the benches change hands.

---

## Still to come

- **The republic rework** — naming, the offices-of-state slate, mandate-keeping
  feeding the election, civil society and the constitution folded into the
  convention phase, and a full audit of monarchy screens leaking through. This is
  the next build.
- **Foreign powers** — three to five named rivals, light diplomacy, no map.
- **Eras IX–XII**, and an answer for what knowledge does once the tree runs out.
- **Court options for the workers** once they wake, and where "the workers wake"
  sits in the tree.
- **The regime-aware vocabulary pass** — 86 uses of "the Crown" in the event
  pool, most of them ungated.
- **The Legacy page**, which is twenty-two lines and needs to be real before the
  five end states mean anything.
- **The UI rework.**

Parked by agreement: health and cause of death; the constitution-drafting entry
mode; the deeper culture and religion layer.

---

## Earlier

**v12.11** — state bar colours, suit numerals, nieces to their parents' line.
**v12.10** — the state bar; branches named for the blood.
**v12.9** — pinned panels; cadet detail; relation-aware heir options; wider marriage field.
**v12.8** — the trait-key deadlock; one coming-of-age beat.
**v12.7** — works split from advances; the heir comes of age.
**v12.6** — the `S.pm` audit; the household and cadet branches; council loyalty.
**v12.5** — the offices of state; fertility; the rest of the prerogative ladder.
**v12.4** — the constitutional frame: prerogative ladder, ministry bands, the seat at 50.
