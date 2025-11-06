# End-to-End: aussensensor → leitstand → heimlern

## Vorbereitung
1. `scripts/e2e/.env.example` nach `scripts/e2e/.env` kopieren und anpassen.
2. Repos lokal vorhanden:
   - `AUSSENSENSOR_DIR` zeigt auf dein `aussensensor`-Klon.
   - `LEITSTAND_INGEST_URL` & `LEITSTAND_TOKEN` gültig.
   - `HEIMLERN_INGEST_URL` gültig.

## Ausführung
```sh
just e2e-dry   # nur Trockenläufe
just e2e       # Echtlauf + Report
```

Artefakte:
- Logs: `./.e2e-logs/`
- Report: `./.hauski-reports/<timestamp>-e2e-aussen-leitstand-heimlern.md`

## Qualitätssicherung
- Optional: `shellcheck scripts/e2e/run_aussen_to_heimlern.sh scripts/e2e/report.sh`
  prüfen, um Shell-Nits früh zu finden.
