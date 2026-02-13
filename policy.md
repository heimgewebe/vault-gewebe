Zielbild Phase 1 (konkret)

A) Branch-Protection (GitHub Settings) – Minimal-Set

Für main (und ggf. master, falls vorhanden):

Require a pull request before merging
Require status checks to pass before merging

Pflicht-Checks:

Guard contracts mirror (hast du)
optional: lint/test falls existieren
Require linear history (optional, aber oft gut)
Require conversation resolution (optional)
Restrict who can push to matching branches (wichtig: nur Admins)
Do not allow bypassing the above settings (oder bypass nur Admins)
Fehlerprävention:

Wenn du „Allow auto-merge“ nutzt: nur erlauben, wenn die Status-Checks stabil sind, sonst erzeugt das „Auto-merge Roulette“.