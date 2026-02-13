## Firewall (kanonisch)

**Prinzip:** INPUT=DROP, explizite Allow-List.  
**Extern erlaubt:**
- SSH `22/tcp`
- WireGuard `51820/udp`

Alles Weitere ist lokal (`127.0.0.1`) oder Docker-intern.

### Drift-Guard

Ein systemd-basierter Guard prüft zyklisch die Realität (aktive Listener)
gegen das Sollbild.

- Script: `/usr/local/lib/heimserver/firewall-guard.sh`
- Service: `firewall-guard.service`
- Timer: `firewall-guard.timer` (alle 5 Minuten)

**Verhalten:**
- OK → Log-Eintrag
- Abweichung → Exit≠0 + Log mit Port/Protokoll

Ziel: Neue öffentliche Dienste dürfen nur bewusst entstehen.