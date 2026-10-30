# Unified Team-News xG Adjustment Policy

**Policy ID:** `unified-xg-delta-v1`  
**Status:** Provisional; apply consistently to future toto prediction revisions, subject to validation.

## Core rule

Use one common adjustment mechanism for every team: express a confirmed player absence as a change to the relevant team's expected goals (xG), then recalculate probabilities from the adjusted xG. The *mechanism* is shared; the *magnitude* is individualized.

## Direction of adjustment

- **Attacking / chance-creation absence:** reduce the absent player's own team's xG.
- **Defensive / goalkeeper absence:** increase the opponent's xG.
- **Two-way or unclear role:** assess the player's primary role and available evidence. If the direction or impact cannot be supported, record the news without a numeric adjustment.

## How to set the magnitude

Assess each player and team individually using:
1. Primary role and tactical responsibility.
2. Whether the absence is officially confirmed and its expected duration.
3. Recent appearances, starts, and minutes.
4. Replacement player's quality and squad depth.
5. Team context and opponent matchup.

Do not apply a universal fixed delta to every player, and do not let teams use unrelated adjustment mechanisms. Both home and away changes may be applied when independently justified.

## Evidence and uncertainty

- Use official club / league announcements where available.
- Track uncertain injuries, returns, and expected lineups separately; do not treat them as confirmed absences.
- If evidence is insufficient, make no numeric adjustment.
- Record the source, retrieval time, affected player, role, adjustment direction, magnitude, and rationale.

## Model integration

- **V1:** recalculate Poisson score and outcome probabilities using adjusted xG.
- **V2:** blend the revised Poisson probabilities with the recorded official toto vote share using the versioned blend weights (currently 30% model / 70% market for this project).
- Preserve original predictions append-only; never overwrite the original snapshot.

## Calibration and release discipline

Manual xG deltas are provisional heuristics, not fitted player-value estimates. Do not claim improved accuracy without historical and out-of-sample validation. Keep the interim team-news revision separate from the final pre-kickoff update based on official starting lineups.
