# Asaan Hisaab Workshop Reference

A public, static reference preview of the Asaan Hisaab workshop workspace.

## What this is

- Fictional example workshop records for a product walkthrough.
- No password, API, server-side database, or connection to the live workspace.
- Demo edits are saved with `localStorage` in the visitor's browser and can be reset from the sidebar.
- Built as a static Next.js export and deployed to GitHub Pages through GitHub Actions.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy

Push to `main` to build and deploy the static export. The GitHub Pages workflow uses the project path `/asaan-hisaab-workshop-reference/` and uploads the generated `out/` directory.

GitHub Pages and standard hosted Actions are free for public repositories on GitHub Free. Because this repository is public, its source files are public as well.
