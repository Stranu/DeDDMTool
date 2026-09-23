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

1. Incrementa la costante `CACHE` in `sw.js`, per esempio da `dm-toolkit-v13` a `dm-toolkit-v14`.
2. Esegui commit e push dei file modificati.
3. Attendi la pubblicazione di GitHub Pages.

Il nuovo service worker precarica gli asset dalla rete, elimina automaticamente le cache precedenti e prende il controllo delle pagine aperte. L’app controlla gli aggiornamenti all’avvio, quando torna visibile e ogni cinque minuti; se una nuova versione è pronta, mostra un messaggio e ricarica la pagina. I dati utente sono in IndexedDB e non vengono cancellati dal cambio versione.

Dalla scheda **Impostazioni** importa i due CSV separatamente:

- Condizioni: `Name,Original Name,Description`
- Magie: `Name,Original Name,Level,School,Casting Time,Range,Components,Duration,Description,Class`

Il parser gestisce campi tra virgolette, virgole e descrizioni su più righe. I file restano sul dispositivo e non vengono caricati da nessuna parte.

## Funzioni principali

- Sezione **PG/Alleati** per personaggi giocanti e alleati ricorrenti.
- Archivio persistente nella sezione **Mostri/PNG** per le schede riutilizzabili, con ricerca per nome, tipo creatura e GS, CA, PF, TS, note, magie conosciute e aggiunta rapida all’iniziativa come copia indipendente.
- Iniziativa con aggiunta manuale di mostri/PNG/PG, ordinamento automatico e avanzamento del turno.
- Dettagli combattente: CA, PF attuali/massimi, tiri salvezza e note su attacchi/capacità.
- Condizioni associate a ogni combattente.
- Magie conosciute/lanciabili con stato **Lanciata** e magie collegate come effetti attivi sul bersaglio.
- Ricerca magie per nome italiano/inglese o testo, con filtri combinabili per livello, classe e scuola.
- Funzionamento offline dopo il primo caricamento degli asset.

## Dati locali e aggiornamenti

La persistenza è separata per origine e browser. Cancellare i dati del sito o usare un browser/dispositivo diverso rimuove o non mostra i dati precedentemente salvati. I file CSV originali non sono inclusi nel repository: vanno importati dall'utente.

## Backup e sicurezza dati

Dalla scheda **Impostazioni** puoi esportare o importare un backup JSON completo oppure una singola categoria: iniziativa, PG/Alleati, Mostri/PNG, condizioni o magie. L’importazione valida formato e versione e chiede conferma prima di sostituire i dati della categoria selezionata.

Le modifiche di iniziativa e roster vengono salvate automaticamente in IndexedDB. In caso di errore di storage l’app mostra un messaggio visibile invece di fallire silenziosamente.

## Combattimento

- **Reset iniziativa**: azzera round e valori di iniziativa mantenendo tutti i partecipanti.
- **Reset completo**: svuota l’iniziativa corrente senza rimuovere PG/Alleati o schede Mostri/PNG salvate.
- I combattenti possono avere PF temporanei, mostrati anche nella lista iniziativa.
- Le magie attive sui bersagli sono indicate da un simbolo compatto; i dettagli restano nel drawer del combattente.

## Magie

La lista può essere ordinata per nome oppure per livello crescente, oltre ai filtri per livello, classe e scuola.

## Normalizzazione delle descrizioni

Durante l’importazione CSV, le descrizioni vengono ripulite dai ritorni a capo tipografici e dagli spazi superflui. I bullet delle descrizioni vengono mantenuti come righe separate e il paragrafo “Ai Livelli Più Alti.” viene preservato. Il testo originale resta disponibile nel campo interno `descriptionRaw`; per applicare la normalizzazione ai dati già importati è sufficiente reimportare il CSV.

Le magie possono anche essere create o modificate manualmente dalla sezione **Magie**. Le nuove magie sono marcate con un simbolo, filtrabili con **Create a mano** e usano `Manuale base` quando il campo Manuale viene lasciato vuoto. Per una magia manuale sono obbligatori nome, tempo di lancio, almeno una classe, livello e descrizione.

Le magie possono essere contrassegnate come preferite tramite la stellina accanto al nome. Il filtro **Preferite** mostra solo le magie selezionate; lo stato viene salvato in IndexedDB e incluso nei backup JSON.

## Modalità Player

Dal menu in alto a sinistra è possibile passare tra modalità **GM** e **Player**. La modalità Player è locale al dispositivo e permette più schede personaggio con caratteristiche, calcoli derivati, PF, inventario, equipaggiamento, oggetti magici, sintonizzazione massima predefinita a 3 e magie assegnate dalla lista Magie. Non sono presenti account, permessi o sincronizzazione remota.

Le schede Player possono avere un colore identificativo selezionabile; le magie assegnate mostrano un pallino per ogni personaggio assegnatario. Sono disponibili tiri salvezza e abilità calcolati con competenza e doppia competenza, oltre a bonus temporanei globali e bonus ai tiri salvezza forniti dagli oggetti equipaggiati.

La modalità Player mostra inizialmente una scheda non editabile e raffinata; il pulsante **Modifica scheda** apre i controlli completi. È presente una tab **Inventario** separata, con categorie, equipaggiamento e oggetti modificabili. La scheda personaggio mostra solo gli oggetti equipaggiati, le armi con TxC/danni calcolati e le magie raggruppate per livello con slot e pulsante **Lancia**.

La scheda Player viene visualizzata in pagina intera: da qui è possibile tornare all’elenco o passare alla modalità modifica. Le abilità sono raggruppate per caratteristica, mentre gli slot magia hanno controlli manuali per diminuire/aumentare gli slot usati e un pulsante Lancia.
