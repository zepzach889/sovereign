# Sovereign — changelog

## v13.2 — the Ledger, and remedies that exist

The warnings landed last build: you got a Tiding, the Drift moved above the
fold, you read the diagnosis and went to do something about it. Then the game
named three remedies and contained none of them. That is worse than silence.

### The Ledger

Its own screen, opened from the top bar whenever you like, and it does **not**
cost you the court's action — cutting the army should never compete with
celebrating a birth.

Every standing commitment is a named line with its cost per turn, a posture you
set, and somebody who lives off it:

- **The host** — regiments, garrisons, powder and forage.
- **The standing establishment** — the permanent army the Drilled Ranks
  committed you to.
- **Privileges of the great houses** — sinecures and exemptions on the roll
  since nobody remembers when.
- **The civil list** — the sovereign's household.
- **Rails, sewers, schools and locks** — what your own advances promised.

Each step down names what it saves and whom it enrages, holds until you revisit
it, and can be restored at a price. Lines you have no commitment on don't
appear. `retrench` — one action that rolled a die between three things you
couldn't choose — is retired.

### Remedies that exist

The diagnosis panel named three things. All three now exist:

- **Pay the army's arrears.** Expensive, unglamorous, and the most reliable
  thing any state has ever done about the possibility of a coup.
- **Open the granaries and fund relief.** Every rising was hungry first.
- **Endow the old order.** Titles, chapels and precedence — cheap, ceremonial,
  and it keeps the great houses arguing about seating instead of restoration.
- **Commission from outside the great houses** — an officer corps that owes its
  career to the state rather than to its cousins.

There is a test asserting that every remedy the panel names is an action the
player can actually take, and that each one moves the pressure it claims to.

**"Stop leaning on the regiment"** was scolding you in 1905 for a levy in 1730 —
`_militaryLeaned` never decayed. It does now.

### The floor that swallowed your concession

Verified arithmetic from the save. Relief was `max(−14, gap × 0.55)`. In the
Reason age the expectation is 44; a crown at 88 gives gap −44 → −24 → clamped to
**−14**. Granting the Estates General twelve points moved it to −32 → −17.6 →
**still −14.** Zero change from the crown-power term; the reading shifted by 3,
entirely from the "chambers hold something" line.

The floor is gone. The mechanism built to reward conceding was invisible until
you were already nearly compliant, which is exactly backwards — the *first*
concession is the one that has to feel like it bought something.

### Also

The Drift panel now says who each pressure means: the officer corps; the
peasantry and the urban workers; merchants, reformers and an educated public;
the great houses and the church.

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
