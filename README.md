# DM Toolkit

PWA statica per Dungeon Master di D&D. Non usa un backend: l'iniziativa, il roster e i CSV importati vengono salvati nel browser tramite IndexedDB.

## Avvio locale

Serve un web server statico: le ES modules e il service worker non funzionano correttamente aprendo `index.html` direttamente con `file://`.

Esempi:

- Visual Studio Code: estensione **Live Server** e apertura di `index.html`.
- Python: `python -m http.server 8080` nella cartella del progetto, poi apri `http://localhost:8080`.

## Deploy su GitHub Pages

1. Crea un repository GitHub e copia tutti i file del progetto nella root del repository.
2. Esegui commit e push sul branch scelto.
3. In GitHub apri **Settings → Pages**.
4. Seleziona **Deploy from a branch**, scegli il branch (normalmente `main`) e la cartella `/ (root)`.
5. Apri l'URL pubblicato usando HTTPS.

Il `manifest.webmanifest` e il service worker usano percorsi relativi, quindi funzionano anche quando il repository è pubblicato sotto un sottopercorso, per esempio `https://utente.github.io/nome-repository/`.

### Pubblicare aggiornamenti

Quando modifichi HTML, CSS o JavaScript:

1. Incrementa la costante `CACHE` in `sw.js`, per esempio da `dm-toolkit-v3` a `dm-toolkit-v4`.
2. Esegui commit e push dei file modificati.
3. Attendi la pubblicazione di GitHub Pages.

Il nuovo service worker precarica gli asset dalla rete, elimina automaticamente le cache precedenti e prende il controllo delle pagine aperte. L’app controlla gli aggiornamenti all’avvio, quando torna visibile e ogni cinque minuti; se una nuova versione è pronta, mostra un messaggio e ricarica la pagina. I dati utente sono in IndexedDB e non vengono cancellati dal cambio versione.

Dalla scheda **Impostazioni** importa i due CSV separatamente:

- Condizioni: `Name,Original Name,Description`
- Magie: `Name,Original Name,Level,School,Casting Time,Range,Components,Duration,Description,Class`

Il parser gestisce campi tra virgolette, virgole e descrizioni su più righe. I file restano sul dispositivo e non vengono caricati da nessuna parte.

## Funzioni principali

- Roster separato per PG e PNG ricorrenti.
- Archivio persistente nella sezione **Mostri/PNG** per le schede riutilizzabili, con ricerca per nome, tipo creatura e GS, CA, PF, TS, note, magie conosciute e aggiunta rapida all’iniziativa come copia indipendente.
- Iniziativa con aggiunta manuale di mostri/PNG/PG, ordinamento automatico e avanzamento del turno.
- Dettagli combattente: CA, PF attuali/massimi, tiri salvezza e note su attacchi/capacità.
- Condizioni associate a ogni combattente.
- Magie conosciute/lanciabili con stato **Lanciata** e magie collegate come effetti attivi sul bersaglio.
- Ricerca magie per nome italiano/inglese o testo, con filtri combinabili per livello, classe e scuola.
- Funzionamento offline dopo il primo caricamento degli asset.

## Dati locali e aggiornamenti

La persistenza è separata per origine e browser. Cancellare i dati del sito o usare un browser/dispositivo diverso rimuove o non mostra i dati precedentemente salvati. I file CSV originali non sono inclusi nel repository: vanno importati dall'utente.
