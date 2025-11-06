# Orientierung

Dieses Dokument sammelt grundlegende Richtlinien für unsere Plattform. Es wird fortlaufend erweitert und dient als Einstiegspunkt
für neue Mitwirkende.

---

## 10 · Build- und CI-Policy

- **Hinweis:** Überschrift ist bewusst durch Leerzeilen getrennt, um Markdown-Lint (MD022) zu erfüllen.

- **Lokales Tooling (`scripts/tools/yq-pin.sh`)** hält `yq` ohne Root-Rechte aktuell. Das Skript
  erkennt Binär-/Tarball-Varianten, prüft Checksums und nutzt erweiterte Curl-Retries, um
  Entwickler:innen auf Workstations oder Codespaces unabhängig vom Runner-Setup zu machen.

- **GitHub Actions** installieren `yq` über eine eigene, schlanke Routine in
  `.github/workflows/ci.yml`. Sie arbeiten auf frischen Images, installieren direkt nach
  `/usr/local/bin` und vermeiden Seiteneffekte aus `$HOME`.

- **Link-Checks:** Das CI setzt auf eine „flake-freie“ Konfiguration (`--retry`, limitierte
  Parallelität) als Blocker. Der separate Watchdog `links.yml` läuft nachts bzw. manuell und
  meldet Ausfälle, bricht aber keine Deployments.

<!-- Leere Zeilen um Liste für MD032 bereits gesetzt -->
