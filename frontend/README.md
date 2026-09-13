# DevSocial V2 Frontend

This is the React + Vite frontend for DevSocial V2.

## Getting Started

Run the development server:

```bash
corepack pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) with your browser.

## Notes

- Routing is implemented in `src/App.tsx` as a Vite React shell.
- Pages are organized under `src/app/**/page.tsx` and imported directly by `src/App.tsx`.
- Legacy route names from the old Next app are migrated incrementally and mapped in the shell where needed.
- Wallet/payment migration work is intentionally paused.

## Build and lint

```bash
corepack pnpm build
corepack pnpm lint
```
