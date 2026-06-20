# LoadHUB AI

Web app PWA pentru cautarea si monitorizarea curselor din surse logistice.

## Cerinte server

- Node.js 24.x
- npm
- HTTPS activ pe domeniu pentru instalarea PWA pe Android

## FastComet

Setari recomandate in Node.js App:

- Node.js version: `24.15.0`
- Application mode: `Production`
- Application URL: `app2.aimuzica.ro`
- Application root: folderul repo-ului clonat
- Application startup file: `src/server/index.mjs`

Comenzi dupa clone/pull:

```bash
npm install
npm run build
```

Apoi reporneste aplicatia Node.js din cPanel.

## Local

```bash
npm install
npm run build
npm start
```

Aplicatia porneste implicit pe `http://127.0.0.1:3000`.
