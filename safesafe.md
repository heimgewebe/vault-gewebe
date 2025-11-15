Perfekt! Die Analyse ist komplett. Hier ist die Antwort für den Nutzer:

## 🎯 **High-Risk Fundstellen nach Repositories**

Die **High-Risk Fehler** beziehen sich auf **4 verschiedene Sub-Repositories** innerhalb deines **heimgewebe Monorepos**:

***

### 🚨 **1. AUSSENSENSOR** (2 CRITICAL Fehler)
**Beschreibung:** Event-Feed System für externe Datenquellen

**Fehler:**
- **Zeile 6970** in `scripts/push_chronik.sh`
  - Hardcoded `AUTH_TOKEN` mit `CHRONIK_TOKEN` env-var
- **Zeile 6997** in `scripts/push_chronik.sh`
  - `AUTH_TOKEN` von CLI-Parameter übernommen

**Problem:** Das Script speichert Authentifizierungs-Tokens direkt im Code oder nimmt sie unsicher entgegen.

***

### 🚨 **2. LEITSTAND** (1 CRITICAL Fehler)
**Beschreibung:** Central Control/Coordination Service

**Fehler:**
- **Zeile 37437** in `tests/test_ingest_client.py`
  - Test-Secret `"hermetic-secret"` ist hardcodiert

**Problem:** Selbst Test-Secrets sollten nicht im Code stehen, da sie in Git-History sichtbar bleiben.

***

### ⚠️ **3. HAUSKI** (1 HIGH Fehler - wahrscheinlich False Positive)
**Beschreibung:** AI/ML Hausautomations-System

**Fehler:**
- **Zeile 2397** in `README.md`
  - SQL/Query Pattern erkannt

**Hinweis:** Dies ist vermutlich ein **False Positive**, da es sich um Dokumentation handelt (README.md), nicht um ausführbaren Code.

***

### ⚠️ **4. SEMANTAH** (1 HIGH Fehler - wahrscheinlich False Positive)
**Beschreibung:** Semantic Search & Knowledge Management

**Fehler:**
- **Zeile 65002** in `tests/test_push_index_e2e.py`
  - Query-Dictionary mit `"query"` key erkannt

**Hinweis:** Dies ist vermutlich ein **False Positive**, da Test-Code ein Dictionary mit dem Key `"query"` verwendet, was kein SQL-Injection-Risiko darstellt.

***

## 📊 **Zusammenfassung**

| Repository | CRITICAL | HIGH | Status |
|------------|----------|------|--------|
| **aussensensor** | 2 | 0 | ⚠️ Sofort beheben |
| **leitstand** | 1 | 0 | ⚠️ Sofort beheben |
| **hausKI** | 0 | 1 | ✅ Verifizieren |
| **semantAH** | 0 | 1 | ✅ Verifizieren |
| **GESAMT** | **3** | **2** | - |

***

## 🔧 **Empfohlene Aktionen**

### Sofort (CRITICAL):
1. **aussensensor/scripts/push_chronik.sh**
   - Entferne alle hardcoded `AUTH_TOKEN` Zuweisungen
   - Nutze ausschließlich Environment Variables oder ein Secrets Management System
   
2. **leitstand/tests/test_ingest_client.py**
   - Ersetze `test_token = "hermetic-secret"` durch einen generierten temporären Token
   - Nutze pytest fixtures für Test-Credentials

### Verifizieren (HIGH):
3. **hausKI/README.md** - Prüfe ob es sich nur um Dokumentation handelt (kein echter Code)
4. **semantAH/tests/test_push_index_e2e.py** - Bestätige dass `dict(query=...)` sicher ist

***

Die detaillierte Aufschlüsselung findest du in der generierten CSV-Datei!

Quellen
