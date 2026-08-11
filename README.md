# Digital Dash Fantasy League (DDFL)

The site for our fantasy football league's 10th season — standings, drafts,
playoff brackets, records, and a decade of head-to-head history across our
two Sleeper leagues (dynasty and redraft).

All league data comes from the public [Sleeper API](https://docs.sleeper.com/).
Historical seasons are fetched once at build time and reshaped into local
JSON (see `scripts/`); the current season uses ISR; live scores (when a
season is active) poll client-side. The rationale is written out in more
detail as each of those pieces gets built.

## Stack

- Next.js (App Router) + TypeScript (strict)
- Tailwind CSS v4, theme tokens in `app/globals.css`
- shadcn/ui component base
- Motion for animation
- Deployed on Vercel

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Logo assets

`assets/logo-source.png` is the original crest art. Everything under
`public/` and the `app/icon.png` / `app/apple-icon.png` /
`app/opengraph-image.png` / `app/twitter-image.png` favicon and social-card
files are derived from it — regenerate them with:

```bash
npm run logo
```

## Project status

Early scaffold — homepage placeholder and design tokens only. Sleeper data
layer, standings, drafts, brackets, and everything else on the roadmap comes
next.
