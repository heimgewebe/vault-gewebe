graph TD

%% Knoten
A[1. Erkenne dich selbst]:::fundament
B[2. Meinung statt Ding]:::freiheit
C[3. Alles fließt]:::wandel
D[4. Goldene Regel]:::ethik
E[5. Gutes = Tun]:::handeln
F[6. Misstraue Überzeugungen]:::korrektiv
G[7. Stille ist nicht Leere]:::tiefe

%% Verbindungen - Verstärkungen
A --> B
A --> D
B --> C
B --> F
C --> D
D --> E
G --> A
G --> F

%% Verbindungen - Spannungsverhältnisse
E -.-> F
C -.-> E

%% Stildefinitionen
classDef fundament fill:#f0c674,stroke:#333,stroke-width:1px,color:#000;
classDef freiheit fill:#8abeb7,stroke:#333,stroke-width:1px,color:#000;
classDef wandel fill:#81a2be,stroke:#333,stroke-width:1px,color:#fff;
classDef ethik fill:#b5bd68,stroke:#333,stroke-width:1px,color:#000;
classDef handeln fill:#cc6666,stroke:#333,stroke-width:1px,color:#fff;
classDef korrektiv fill:#de935f,stroke:#333,stroke-width:1px,color:#000;
classDef tiefe fill:#c5c8c6,stroke:#333,stroke-width:1px,color:#000;