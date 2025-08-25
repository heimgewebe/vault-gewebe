// ui-diskurs.js — Version: Σ.v∞.1

export class UIDiskurs {
    constructor(raumManager, authService) {
        this.raumManager = raumManager;
        this.authService = authService;
        this.container = document.getElementById('diskurs-container');
    }

    showRaum(raumId) {
        const raum = this.raumManager.engine.diskursRäume.get(raumId);
        if (!raum) {
            this.container.innerHTML = '<p>Raum nicht gefunden.</p>';
            return;
        }

        this.container.innerHTML = `<h2>Diskursraum: ${raum.typ}</h2>`;

        raum.threads.forEach(thread => {
            const threadDiv = document.createElement('div');
            threadDiv.className = 'diskurs-thread';
            threadDiv.innerHTML = `
                <h3>${thread.titel}</h3>
                <p>Erstellt von ${thread.erstellerId} am ${new Date(thread.startZeit).toLocaleString()}</p>
                <button data-thread="${thread.id}">Details</button>
            `;
            threadDiv.querySelector('button').addEventListener('click', () => {
                this.showThread(raumId, thread.id);
            });
            this.container.appendChild(threadDiv);
        });

        if (this.authService.isLoggedIn()) {
            const form = document.createElement('form');
            form.innerHTML = `
                <h4>Neuen Thread starten</h4>
                <input type="text" id="thread-titel" placeholder="Titel" required>
                <button type="submit">Erstellen</button>
            `;
            form.addEventListener('submit', e => {
                e.preventDefault();
                const titel = form.querySelector('#thread-titel').value;
                const threadId = 't' + Date.now();
                this.raumManager.engine.createThread({
                    raumId,
                    threadId,
                    titel,
                    erstellerId: this.authService.getUser().id
                });
                this.showRaum(raumId);
            });
            this.container.appendChild(form);
        }
    }

    showThread(raumId, threadId) {
        const thread = this.raumManager.engine._findThread(raumId, threadId);
        this.container.innerHTML = `<h3>${thread.titel}</h3>`;

        thread.beiträge.forEach(beitrag => {
            const div = document.createElement('div');
            div.className = 'diskurs-beitrag';
            div.innerHTML = `<p><b>${beitrag.autorId}</b>: ${beitrag.text}</p>`;
            this.container.appendChild(div);
        });

        if (this.authService.isLoggedIn() && !thread.geschlossen) {
            const form = document.createElement('form');
            form.innerHTML = `
                <textarea id="beitrag-text" placeholder="Antwort schreiben..." required></textarea>
                <button type="submit">Absenden</button>
            `;
            form.addEventListener('submit', e => {
                e.preventDefault();
                const text = form.querySelector('#beitrag-text').value;
                const beitragId = 'b' + Date.now();
                this.raumManager.engine.addBeitrag({
                    raumId, threadId, beitragId,
                    autorId: this.authService.getUser().id,
                    text
                });
                this.showThread(raumId, threadId);
            });
            this.container.appendChild(form);
        }

        const backBtn = document.createElement('button');
        backBtn.textContent = 'Zurück zu Raum';
        backBtn.addEventListener('click', () => this.showRaum(raumId));
        this.container.appendChild(backBtn);
    }
}