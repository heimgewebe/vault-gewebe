// ui-diskurs.js — Version: Σ.v∞.4.webrat.audit.stable

import { diskursApi } from './api-diskurs.js';

export class UIDiskurs {
    constructor(containerId = 'diskurs-container') {
        this.container = document.getElementById(containerId);
        this.navContainer = document.getElementById('diskurs-nav');
        this.activeRaumId = null;
    }

    async init() {
        await this.renderNav();
    }

    async renderNav() {
        const räume = await diskursApi.getAlleRäume();

        this.navContainer.innerHTML = `
            <button id="nav-webrat">Webrat</button>
            <button id="nav-naehstuebchen">Nähstübchen</button>
            <div id="ereignis-nav"></div>
        `;

        document.getElementById('nav-webrat').onclick = () => this.showRaum('webrat');
        document.getElementById('nav-naehstuebchen').onclick = () => this.showRaum('nähstübchen');

        const ereignisNav = document.getElementById('ereignis-nav');
        räume.filter(r => r.typ === 'ereignis').forEach(r => {
            const btn = document.createElement('button');
            btn.textContent = `Ereignis: ${r.referenzId}`;
            btn.onclick = () => this.showRaum(r.id);
            ereignisNav.appendChild(btn);
        });
    }

    async showRaum(raumId) {
        this.activeRaumId = raumId;
        const raum = await diskursApi.getRaum(raumId);
        this.container.innerHTML = `<h2>Raum: ${raum.typ}</h2>`;

        raum.threads.forEach(thread => {
            const div = document.createElement('div');
            div.className = 'diskurs-thread';
            div.innerHTML = `<h4>${thread.titel}</h4>`;

            if (thread.antrag) {
                const statusColor = {
                    einspruchsfrist: 'blue',
                    abstimmung: 'purple',
                    angenommen: 'green',
                    abgelehnt: 'red'
                }[thread.antrag.status] || 'gray';

                const marker = document.createElement('div');
                marker.style = `width: 10px; height: 10px; background: ${statusColor}; border-radius: 50%; display: inline-block; margin-right: 5px`;
                div.prepend(marker);
            }

            const openBtn = document.createElement('button');
            openBtn.textContent = 'Thread öffnen';
            openBtn.onclick = () => this.showThread(thread.id);
            div.appendChild(openBtn);

            this.container.appendChild(div);
        });

        const newThreadBtn = document.createElement('button');
        newThreadBtn.textContent = 'Neuen Thread starten';
        newThreadBtn.onclick = () => this.renderNewThreadForm();
        this.container.appendChild(newThreadBtn);
    }

    async showThread(threadId) {
        const raum = await diskursApi.getRaum(this.activeRaumId);
        const thread = raum.threads.find(t => t.id === threadId);
        this.container.innerHTML = `<h3>Thread: ${thread.titel}</h3>`;

        thread.beiträge.forEach(beitrag => {
            const div = document.createElement('div');
            div.className = 'diskurs-beitrag';
            div.innerHTML = `<p><b>${beitrag.autorId}</b>: ${beitrag.text}</p>`;
            this.container.appendChild(div);
        });

        if (!thread.antrag) {
            const antragBtn = document.createElement('button');
            antragBtn.textContent = 'Antrag stellen';
            antragBtn.onclick = () => this.renderAntragForm(threadId);
            this.container.appendChild(antragBtn);
        }

        if (thread.antrag?.status === 'einspruchsfrist') {
            const einspruchBtn = document.createElement('button');
            einspruchBtn.textContent = 'Einspruch einlegen';
            einspruchBtn.onclick = async () => {
                await diskursApi.legeEinspruchEin({ raumId: this.activeRaumId, threadId, nutzerId: 'test-user' });
                await diskursApi.save();
                this.showThread(threadId);
            };
            this.container.appendChild(einspruchBtn);
        }

        if (thread.antrag?.status === 'abstimmung') {
            ['dafür', 'dagegen'].forEach(wahl => {
                const voteBtn = document.createElement('button');
                voteBtn.textContent = `Stimme ${wahl}`;
                voteBtn.onclick = async () => {
                    await diskursApi.stimmeAb({ raumId: this.activeRaumId, threadId, nutzerId: 'test-user', wahl });
                    await diskursApi.save();
                    this.showThread(threadId);
                };
                this.container.appendChild(voteBtn);
            });

            const auswertenBtn = document.createElement('button');
            auswertenBtn.textContent = 'Abstimmung auswerten';
            auswertenBtn.onclick = async () => {
                await diskursApi.bewerteAbstimmung({ raumId: this.activeRaumId, threadId });
                await diskursApi.save();
                this.showThread(threadId);
            };
            this.container.appendChild(auswertenBtn);
        }
    }

    async renderNewThreadForm() {
        this.container.innerHTML = `
            <h3>Neuen Thread starten</h3>
            <input id="titel" placeholder="Titel" />
            <button id="submit">Erstellen</button>
        `;

        document.getElementById('submit').onclick = async () => {
            const threadId = 't' + Date.now();
            const titel = document.getElementById('titel').value;
            await diskursApi.createThread({ raumId: this.activeRaumId, threadId, titel, erstellerId: 'test-user' });
            await diskursApi.save();
            this.showRaum(this.activeRaumId);
        };
    }

    async renderAntragForm(threadId) {
        this.container.innerHTML = `
            <h3>Antrag stellen</h3>
            <label>Typ: <input id="typ" placeholder="Typ (z.B. auszahlung)" /></label><br>
            <label>Betrag: <input id="betrag" type="number" step="0.01" /></label><br>
            <label>Kommentar: <input id="kommentar" /></label><br>
            <button id="submit">Antrag starten</button>
        `;

        document.getElementById('submit').onclick = async () => {
            const antragId = 'a' + Date.now();
            const typ = document.getElementById('typ').value;
            const betrag = parseFloat(document.getElementById('betrag').value);
            const kommentar = document.getElementById('kommentar').value;

            await diskursApi.starteAntrag({
                raumId: this.activeRaumId, threadId, antragId, typ, betrag, kommentar, beantragtVon: 'test-user'
            });
            await diskursApi.save();
            this.showThread(threadId);
        };
    }
}