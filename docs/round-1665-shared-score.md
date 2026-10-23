# Round 1665 shared score model — corrected v2

Version 2 supersedes the earlier v1 snapshot where team-name aliases were not consistently normalized. Team names are canonicalized using aliases from `toto-lab/data/teams.json` before matching the historical dataset.

The same expected-goal rates generate both exact independent-Poisson score-pair 1X2 probabilities (scores 0–10, renormalized) and goal buckets (0, 1, 2, 3+). This keeps the two markets on the same model basis.

Run `node --test tests/round-1665-shared-score-v2.test.js` to validate 13 fixtures, unique IDs, alias-normalized history availability, valid probabilities and sums.

Limitations: this remains an uncalibrated baseline. The historical source is a community mirror with a mixed competition set; injury/suspension data and market odds are not included.
