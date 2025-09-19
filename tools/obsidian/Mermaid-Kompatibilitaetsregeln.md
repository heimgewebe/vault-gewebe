Mermaid-Kompatibilitätsregeln für ältere Obsidian-Versionen

Diese Liste dokumentiert die bekannten Einschränkungen und Besonderheiten der Mermaid-Engine in älteren Obsidian-Versionen. Sie dient als Referenz, um Diagramme so zu schreiben, dass sie zuverlässig gerendert werden.


---

1. Keine Inline-Klassenzuweisung

Nicht unterstützt:

A[Text]:::core

Unterstützt:

A[Text]
class A core
classDef core fill:#ccc;



---

2. Klammern () in Knoten-Labels

Nicht unterstützt:

A[Globale Machtmatrix (Myzelstruktur)]

Unterstützt:

Klammern escapen:

A[Globale Machtmatrix \(Myzelstruktur\)]

Oder Klammern durch Bindestrich / Komma ersetzen.




---

3. Klammern () in subgraph-Titeln

Nicht unterstützt:

subgraph I[1) Infrastrukturkontrolle]

Unterstützt:

subgraph I[1. Infrastrukturkontrolle]

oder

subgraph I[Infrastrukturkontrolle – Stufe 1]



---

4. Vorsicht bei Sonderzeichen in Labels

Doppelpunkte : können in älteren Versionen als Syntax-Delimiter wirken.

<br/> funktioniert nur, wenn htmlLabels aktiv ist; sonst \n verwenden.

Geschützte Bindestriche oder exotische Unicode-Trenn


