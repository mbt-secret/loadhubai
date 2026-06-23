# IMPROVE OFERTE — backlog scalare (mii → zeci de mii de oferte)

> Listă de pași de revenit **când avem resurse / când începe să dea lag**.
> Acum nu e nevoie: arhitectura ține lejer câteva mii de oferte.
> Scop: să rămână rapid și la zeci/sute de mii fără rescrieri mari.

## Stare actuală (de ce merge bine acum)
- **Stocare permanentă** în SQLite (`data/loadhub.sqlite`, WAL): tabele `messages` (text brut + `hash` UNIQUE), `loads` (oferta parsată), `loads_fts` (căutare full-text).
- **Dedup** prin `hash` sha256 (grup+id+text+timp), UNIQUE → mesajele repetate nu se dublează. (`db.mjs` → `hashMessage`, `saveParsedMessage`)
- **WhatsApp = push, nu polling**: doar mesaje noi, live (`messages.upsert`). Istoricul NU se trage (`whatsapp.mjs` → `importGroupMessages()` întoarce `[]`). Deci grupuri cu mii de mesaje vechi nu costă nimic.
- **GeoTrans** = auto-sync la 5 min, cu dedup (`index.mjs` → `geotransAutoSyncIntervalMs`, `startGeotransAutoSync`).
- **Citiri plafonate**: `/api/loads` întoarce max 200 (default), 500 la căutare/filtre (`index.mjs:345`). Nu se încarcă niciodată „tot".

## Pași (în ordinea recomandată)

### 1. Indexe pe coloanele de sortare/filtrare  ⭐ ieftin, mare impact
- **Problema**: interogarea principală e `ORDER BY m.captured_at DESC LIMIT 200` (`db.mjs` → `listLoads`, `listAllLoads`). NU există index pe `messages.captured_at` / `messages.message_time` / `loads.load_country`. La zeci de mii → full table scan + sort la fiecare request.
- **Fix**: în `db.mjs` → `migrate()`, adaugă:
  ```sql
  CREATE INDEX IF NOT EXISTS idx_messages_captured_at ON messages(captured_at DESC);
  CREATE INDEX IF NOT EXISTS idx_messages_message_time ON messages(message_time DESC);
  CREATE INDEX IF NOT EXISTS idx_loads_load_country ON loads(load_country);
  ```
- **Cost**: ~minute, fără risc. Singur ține aplicația rapidă mult în zona zecilor de mii.

### 2. Retenție / arhivare oferte vechi  ⭐ cel mai eficient pentru curse
- **Problema**: `messages`/`loads` cresc la nesfârșit; o cursă veche de 3 săptămâni e inutilă (date perisabile).
- **Fix**: job intern (cron, ca `startGeotransAutoSync`) care șterge sau mută în arhivă ofertele mai vechi de N zile (setare configurabilă, ex. 30–60). Ține tabela „caldă" mică → rapid permanent.
- **De decis**: ștergere vs. arhivare (tabel `loads_archive`); valoarea N (zile) ca setting în UI.

### 3. Filtrare în SQL în loc de JS  (când căutarea ratează oferte vechi)
- **Problema**: la căutare serverul trage 500 de rânduri și filtrează în JavaScript (`index.mjs:372-379` → `searchLoadsStructured`, `searchLoads`, distanță, `messageAge`). La 500 e ok, dar caută doar în cele mai recente 500 → oferte vechi care s-ar potrivi pot fi ratate.
- **Fix**: mută filtrele (țară, tip camion, dată, rază GPS) în clauze `WHERE` cu indexele de la pasul 1, ca să interoghezi toată tabela eficient.

### 4. Hartă: clustering + încărcare pe viewport  (când sunt prea multe pin-uri)
- **Problema**: sute de markere = ok; mii de markere DOM Leaflet → lag în browser.
- **Fix**: clustering (grupare puncte) + fetch doar pentru zona vizibilă a hărții (bounds), nu toate odată.

### 5. Migrare la Postgres  (doar dacă depășești SQLite — foarte departe)
- SQLite + WAL + indexe duce lejer sute de mii de rânduri pentru acest workload. De luat în calcul doar la volum foarte mare sau multi-server.

## Notă de cost zero acum
Nimic din toate astea nu blochează lansarea. Minimul „de siguranță" când prinde tracțiune = **pasul 1 + pasul 2**.
