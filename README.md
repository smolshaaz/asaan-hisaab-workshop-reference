# Asaan Hisaab Workshop Reference

This is a static, browser-only copy of the Fatoora workspace frontend. Its pages, components, shell, and styles are copied from the main app. The workspace data provider is the only app layer replaced: it loads fictional sample records into `localStorage` and keeps demo changes in that browser.

## Reference mode

- No login or password.
- No API routes, server database, or connection to the live workspace.
- Sample records are fictional and stored in the visitor's browser.
- Browser storage can be cleared from the browser settings to restore the initial examples.
- This site is for product reference. It does not issue official tax documents or submit data to ZATCA.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy

Push to `main` to build and deploy the static export to GitHub Pages. The workflow exports the example routes under `/asaan-hisaab-workshop-reference/` and uploads the generated `out/` directory.

This is a public repository, so its source files are public.
