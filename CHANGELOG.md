# Sovereign — changelog

## v13.3 — the floor of the house

### The Ledger was never in your game

`index.html` is hand-maintained and carries its **own** copy of the top-bar
markup. I added the Ledger button to `src/shell-mid.html`, which feeds `dist/`
and not the page GitHub Pages serves. So the entire headline feature of v13.2 —
the answer to "no way to shrink the army", asked for twice — sat in the code
fully working and completely unreachable.

The button is now in `index.html`, and **the build fails** if any control in the
shell is missing from it. Verified by removing the button: `CONTROL MISMATCH:
index.html is missing btnLedger`.

### Seats, and the counting of votes

Consent used to be a hidden roll — you asked, and afterwards you were told. That
is not parliamentary government. Parliamentary government is arithmetic you can
see and work on.

- **The chamber has seats.** 90 for an upper house, 150 for a commons, divided
  among the interests by influence and by the franchise. Mood does not change
  the size of the house; an interest does not lose seats for being cross.
- **A division bar** under each chamber: who is for, doubtful and against, with
  a needle at the majority line.
- **The floor**, on a toggle: every interest, its seats, and where it stands.
- **A whip count on anything that needs consent** — before you spend the turn.
  *"About 68 of 150, 76 carries it — 8 short."*
- **And who is gettable**, with what it would take: an office, a bill of theirs
  passed first, or a concession.

Widening the franchise now visibly moves seats, which is the whole point of it
and was previously invisible.

### A season is five years

One act per turn meant fixing the taxes and celebrating the birth of an heir
were the same decision. A turn now allows **one act of state, one reform, and
one change to the rate**, and the court sits until you close it. Doing nothing
at all still costs you.

### The ask has to actually happen

The reform tiers inferred a petition from the state of the world, so the card
said "asked for" when nobody had asked — three playthroughs running. Now:

- **A real petition event** — the great houses, the towns and the church ask for
  an assembly, politely, and you receive it or return it unread. Return it three
  times and the next reform is under duress.
- **The reformers publish their programme** as a Tiding when they wake.
- The tiers no longer invent an ask that never happened.

### Fixed

- **No woman of the blood in office before the mass franchise.** The gate covered
  generated courtiers and not the royal family, which is how a princess ran the
  Exchequer in 1645.
- **The Drift headline is dynamic.** It was static flavour that could contradict
  the reasons printed directly beneath it — telling you the officers had been
  asked to solve too many problems while the attribution correctly said
  otherwise.
- **Bills are attributed to the chamber whose interest sponsored them**, not to
  whichever chamber happened to be first in the list.

---

## Still to come

- **Voluntary transitions** — lay down the crown by statute, restore one by
  statute, proclaim the workers' state deliberately. Right now every road out of
  a monarchy is a rupture, which is why steering well still feels like being
  steered. Gated by the machinery needed to do it: you cannot convert to a
  republic by statute without a chamber to pass the statute.
- **The petition that never fires** — the reform tiers read state rather than
  events, so the card says "asked for" when nobody ever asked.
- **The electorate** — `runElection` unions every chamber, so the unelected
  upper house is voting. This is why the franchise felt absent.
- **Careers for non-heir siblings** — the cloth, a regiment, a governorship, the
  law. Taking the cloth removes someone from the succession.
- **Province naming** — better defaults, and the player may rename.
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
