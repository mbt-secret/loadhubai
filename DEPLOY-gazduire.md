# Deploy TIRGo pe gazduire.net (DirectAdmin) — `tirgo.ciubota.ru`

Ghid pas cu pas pentru a transfera și rula aplicația pe hostingul gazduire.net.

---

## 0. Pe scurt — citește întâi

- Aplicația = server **Node.js** (Express) + bază de date **SQLite** (`node:sqlite`) + front-end PWA deja construit în folderul `dist/`.
- **Necesită Node ≥ 22.5** — folosește `node:sqlite` / `DatabaseSync` (vezi `src/server/db.mjs`). Ideal **Node 24**. Dacă în panou versiunea maximă de Node e ≤ 20, aplicația NU pornește pe shared → vezi secțiunea 11 (VPS).
- **WhatsApp NU funcționează pe hosting partajat.** Componenta WhatsApp pornește Chromium prin Playwright — interzis pe shared (fără browser, procese restricționate). **GeoTrans.md merge normal** (sunt simple apeluri HTTP). WhatsApp îl ții local (ca acum) sau pe un VPS.
- `dist/` e deja inclus în repo → **nu trebuie build** (Vite) pe server.
- Repo (public): `https://github.com/mbt-secret/loadhubai.git`, branch `main`.
- Codul aplicației Node NU se pune în `public_html`. Rulează din folderul lui, iar „Node.js Selector" îl leagă de subdomeniu.

---

## 1. Verificări înainte de start (în DirectAdmin)

1. Loghează-te în **DirectAdmin** (de obicei `https://<server>:2222`).
2. Confirmă că ai subdomeniul **`tirgo.ciubota.ru`** creat (Account Manager → Domains / Subdomains).
3. La **Advanced Features**, caută:
   - **Setup Node.js App** / **Node.js Selector** — obligatoriu. Dacă lipsește, planul nu are Node → scrie suportului gazduire să-l activeze sau treci pe VPS (secțiunea 11).
   - **Git** (Git Manager) — pentru clonare din GitHub prin interfață (opțional, varianta 2B).
   - **SSH Keys / Jailed SSH / Web Terminal** — util pentru comenzi (opțional dar recomandat).
4. În „Setup Node.js App" verifică ce **versiuni de Node** sunt disponibile — îți trebuie **≥ 22**.

---

## 2. Adu codul pe server

Alege **o** variantă.

### Varianta A — SSH + `git clone` (cea mai simplă, repo public)

```bash
ssh utilizator@server          # datele de SSH din contul tău gazduire
cd ~/domains/tirgo.ciubota.ru
git clone https://github.com/mbt-secret/loadhubai.git app
# => codul ajunge în ~/domains/tirgo.ciubota.ru/app
```

Dacă SSH nu e activ, activează-l din DirectAdmin (SSH Keys) sau cere-l la suport.

### Varianta B — DirectAdmin Git Manager (din interfață)

1. Advanced Features → **Git** → **Create Repository**.
2. Completează:
   - **Domain**: `tirgo.ciubota.ru`
   - **Name**: `loadhubai`
   - **Remote**: `https://github.com/mbt-secret/loadhubai.git`
   - **Keyfile**: lasă gol (repo public)
3. **Create** → DirectAdmin clonează un repo *bare* la `~/domains/tirgo.ciubota.ru/loadhubai.git`.
4. Creează din File Manager folderul țintă, ex.: `domains/tirgo.ciubota.ru/app`.
5. Deschide repo → **Modify** → setează **Deploy Branch** = `main` și **Deploy Directory** = `domains/tirgo.ciubota.ru/app` → **Save** → **Deploy**. Codul se copiază în acel folder.
6. (Opțional) **Webhook auto-deploy**: copiază URL-ul de webhook din DirectAdmin → în GitHub: repo → Settings → Webhooks → Add webhook. La fiecare `git push` se redeployează automat.

---

## 3. Creează aplicația Node.js

Advanced Features → **Setup Node.js App** → **Create Application**:

| Câmp | Valoare |
|---|---|
| **Node.js version** | cea mai mare ≥ 22 (ideal 24) |
| **Application mode** | `Production` |
| **Application root** | `domains/tirgo.ciubota.ru/app` (folderul cu `package.json`) |
| **Application URL** | `tirgo.ciubota.ru` |
| **Application startup file** | `src/server/index.mjs` |

Apasă **Create**.

---

## 4. Instalează dependențele (`npm install`)

- În pagina aplicației din Node.js Selector apasă **Run NPM Install**.
- SAU prin SSH, activând mediul virtual afișat de panou (comanda exactă apare în pagina aplicației):

```bash
source ~/nodevenv/domains/tirgo.ciubota.ru/app/<versiune>/bin/activate
cd ~/domains/tirgo.ciubota.ru/app
npm install
```

> `npm install` **nu** descarcă Chromium (acela e separat: `npm run install:chromium`, care oricum nu merge pe shared). Dacă vezi un avertisment că `engines` cere `node>=24` și tu ai 22, e doar avertisment — continuă.

---

## 5. Variabile de mediu + pornire

- În Node.js Selector → secțiunea **Environment variables** (opțional):
  - `NODE_ENV=production` (setat automat de „Application mode = Production")
  - **Nu** seta `PORT` — îl furnizează Passenger automat.
- Apasă **Restart** (sau Start).

> Cheia AI (OpenAI) și restul setărilor NU stau în variabile de mediu, ci în baza de date — le configurezi din aplicație (pasul 7).

---

## 6. DNS + SSL (HTTPS)

- **DNS**: dacă `ciubota.ru` are nameserverele la gazduire, subdomeniul creat în DirectAdmin primește automat record A spre IP-ul serverului. Dacă DNS-ul e în altă parte, adaugă manual un record **A**: `tirgo` → IP-ul serverului gazduire.
- **SSL**: DirectAdmin → **SSL Certificates** → **Let's Encrypt** → emite certificat pentru `tirgo.ciubota.ru` (gratuit). Necesar și pentru instalarea PWA pe Android.

---

## 7. Prima configurare în aplicație

1. Deschide `https://tirgo.ciubota.ru`.
2. Baza de date pornește **goală** (e creată automat la prima rulare). În **Setări**:
   - Reintrodu **cheia AI** (OpenAI) — nu se transferă din instanța ta locală.
   - Activează **GeoTrans.md** → **Sync**. Ar trebui să apară curse.
3. (Opțional) Importă orașele pentru căutare, prin SSH în mediul activat:
   ```bash
   npm run import:places
   ```
   (necesită fișierul geonames; dacă nu îl ai pe server, sari peste.)

---

## 8. WhatsApp pe server (important)

- Pe shared, la **„Conectează WhatsApp"** vei primi o eroare de tipul „Chromium nu este instalat pe server" — e **normal**, nu se poate rula un browser pe hosting partajat.
- Opțiuni:
  - Ții ingestia WhatsApp **local** (ca acum). Atenție: scrie în SQLite-ul local, nu în cel de pe server.
  - Pentru WhatsApp pe server real → **VPS** (secțiunea 11), unde poți instala Chromium și rula un proces permanent.

---

## 9. Actualizări viitoare

```bash
cd ~/domains/tirgo.ciubota.ru/app
git pull
# dacă s-au schimbat dependențe: Run NPM Install (sau npm install în venv)
```
Apoi în Node.js Selector apasă **Restart**. (Sau folosește Deploy / webhook din Git Manager.)

---

## 10. Depanare (erori frecvente)

- **Nu există „Setup Node.js App"** → planul nu are Node.js Selector; cere-l la suport sau treci pe VPS.
- **Versiune Node < 22.5** → aplicația crapă la `node:sqlite`. Cere Node 22/24 la suport sau VPS.
- **502 / 503 / Passenger error** → deschide log-ul aplicației (stderr) din Node.js Selector; verifică `Application startup file = src/server/index.mjs` și că ai rulat `npm install`.
- **Pagină albă / 404** → „Application URL" greșit sau `.htaccess`; reface „Setup Node.js App".
- **Eroare la pornire cu fișier `.mjs` (ESM/Passenger)** (rar) → spune-mi și îți dau un mic wrapper CommonJS care încarcă `index.mjs`.
- **DB read-only / nu salvează** → verifică permisiunile pe folderul `data/` din app root (trebuie scriere pentru user).

---

## 11. Alternativă: VPS (pentru TOT, inclusiv WhatsApp)

Dacă vrei aplicația completă (cu WhatsApp), un **VPS** gazduire (KVM, root) e soluția corectă. Pe scurt, pe Ubuntu:

```bash
# ca root / sudo
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -    # Node 24
apt-get install -y nodejs git
git clone https://github.com/mbt-secret/loadhubai.git /opt/loadhubai
cd /opt/loadhubai
npm install
npx playwright-core install --with-deps chromium               # Chromium pt WhatsApp
PORT=4000 NODE_ENV=production npm start                         # test rapid
```

Apoi, pentru producție: rulează cu **PM2** (`pm2 start src/server/index.mjs --name loadhubai`), pune un **reverse proxy** (Nginx/Apache) de la `tirgo.ciubota.ru` către `127.0.0.1:4000` și activează **Let's Encrypt** pentru HTTPS.

> Spune-mi dacă mergi pe VPS și îți scriu ghidul VPS detaliat (PM2 + Nginx + SSL + autostart).

---

### Rezumatul fluxului (shared)
`git clone (SSH sau Git Manager)` → **Setup Node.js App** (root, URL, startup `src/server/index.mjs`, Node ≥22) → **Run NPM Install** → **Restart** → DNS + **Let's Encrypt** → configurezi cheia AI + GeoTrans în app. WhatsApp rămâne local.
