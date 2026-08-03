# Sovereign — changelog

## v12.5 — the offices of state

### Regressions fixed (all five caused by v12.4)

Moving the ministry earlier — born with the first chamber rather than with the
crown's defeat — broke three things keyed to *the existence of a ministry* as
shorthand for *parliamentary government*. They used to be the same event.

- **"Responsible government" announced at 74% crown power.** The milestone
  tested `!!S.pm`. Now tests `pmGoverns(S)`.
- **"A contest of arms is unthinkable now" in 1665.** The text branched on
  `S.pm`. The age of settling crowns by war now closes on a real condition —
  a late era, or a charter plus a standing state — not on having a Chancellor.
- **The 70%+ ministry pick was unreachable.** Every route into a first ministry
  ran through `doPMName`, which seated the election winner and never opened the
  crown's field. This is why the `pmpick` screen existed and was never seen.
- **Dissolving under summons did nothing.** The button was live, cost stability,
  and no election followed, because `proceedToElection` returns early unless the
  cadence is a cycle.
- **Refusing a ministry and winning still handed you the country's choice.**
  Now routes into the crown's field, which was the entire point of the right.

### Bugs fixed

- The adopted heir was created with no parents. Every relation label and the
  whole family tree derive from the parent graph, so they read as a cousin from
  nowhere and then acceded to an empty court, consort included. They are now
  adopted *into* the house, with recorded parents.
- An abdicating sovereign was killed outright. They now step sideways into the
  family and are marked as having laid down the crown.
- The sovereign appeared in the Royal Family box only when they happened to have
  a revealed trait or an active regent. Hence the flicker. Always shown now.

### The offices of state

Five posts now, not four — Keeper of the Seals joins the Marshal, the Primate,
the Governor and the Chancellor. The same five under every regime; only the
names and the appointer change. A Commissar for the Plan is the Chancellor of
the Exchequer with a different hat and a worse century.

- **A separate candidate field per office**, generated fresh per vacancy and
  stable within a turn. The men who might run the treasury are not the men who
  might run the army, and sometimes there is nobody good for either.
- **Competence**, shown on every candidate, from *outstanding* to *a disaster
  waiting*. A trained man is better at his own department; royal kin are usually
  worse, and cost you elsewhere for the privilege.
- **Officers now do something, every turn.** A capable holder helps their
  department and discounts work in it by 12%; an incompetent one does the
  reverse. Appointing your brother to the Exchequer is now a decision.
- **The council appears in the Government panel**, under every regime, whether
  or not the holder is related to anybody.
- *Appoint capable ministers* is retired. The council is the council.

### The rest of the prerogative ladder

Withhold assent, create peers and grant a pardon are now real actions rather
than labels. Assent is spendable like the ministry refusal — used three times
against a chamber that keeps coming back, it stops being a right and becomes a
quarrel, and then it is over.

### Fertility

The ceiling was structural: `maybeBirth` rolled once per turn, so five years
could produce at most one child however generous the odds, and the large-family
penalty bit at four. Now three rolls per turn, the penalty deferred to seven
living children, and the wider family breeds properly too — which is why a
failed line kept finding an empty court.

### Marriage

The count of offers now varies (one to three, never nil) and the terms are drawn
from what the realm is actually short of: a dowry when the treasury is empty, a
match into the rival's house when there is a claimant, a house the angriest
estate would follow. Every chip is wired to a real effect.

### Women in office

Gated at the mass-franchise era and uncommon even then, rising afterward. It was
previously possible from roughly 1750, which is indefensible in a classroom.

---

## Known wrong, on purpose — still to come

- **Provinces are still an estate.** Double-counted against real provinces.
  Patch-set five.
- **The commons electorate still contains everybody.** The franchise gate —
  property / widened / broad / universal, with the peasantry weighted at a
  fifth, then a half, then three-quarters, then full — is patch-set five.
- **Reforms still have no base benefit.** The three tiers (of its own motion /
  upon petition / under duress) are patch-set four.
- **A ceremonial crown is not yet rewarded.** That reward lives in the
  legitimacy formula, which is still monarchy-shaped for all four regimes. The
  hooks are in; the values are provisional.
- **Legislation from the estates** — the last thing, once the frame is finished.

## v12.4 — the constitutional frame

Long-reign toggle; the prerogative ladder; the three ministry bands
(70+ crown appoints, 50–69 contested with a spendable refusal, below 50 the
ministry governs and the player follows the power to the desk); summons versus
a player-set electoral cycle.
