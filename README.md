# atishay.dev — Personal Résumé Site

A fast, single-page résumé website for **Atishay Jain**, built with **Astro** + **Tailwind CSS** and deployed on **Cloudflare Pages**. Content is fully data-driven from one JSON file, the contact form runs on a serverless endpoint with captcha + email delivery, and the site exposes an **MCP server** and **`llms.txt`** so AI agents can read it.

🔗 **Live:** [atishay.dev](https://atishay.dev)

## Features

- **Data-driven** — all content lives in [`src/data/resume.json`](src/data/resume.json). Edit one file; no HTML/CSS changes needed.
- **Modern, animated UI** — scroll reveals, animated counters, typing role text, a particle-network background, hover micro-interactions. Fully responsive, dark theme, and respects `prefers-reduced-motion`.
- **Secure contact form** — a Cloudflare Function (`/api/send`) with server-side **Turnstile** verification, company-email validation, honeypot, and rate limiting; delivers via **Resend**. Personal email/phone are never published — visitors request the résumé instead.
- **Fast & accessible** — static-first (near-zero JS), self-hosted variable fonts, optimized images. Lighthouse Performance / Accessibility / SEO in the high-90s–100.
- **SEO & AI-ready** — `Person` + `WebSite` JSON-LD, Open Graph / Twitter cards, sitemap, security headers (CSP, HSTS), plus an **MCP server** (`/mcp`), **`llms.txt`**, and agent-discovery metadata.

## Tech stack

Astro · Tailwind CSS · TypeScript · Cloudflare Pages (Functions) · Resend · Cloudflare Turnstile

## Getting started

```bash
npm install
cp .env.example .env             # PUBLIC_TURNSTILE_SITE_KEY (build-time, public)
cp .dev.vars.example .dev.vars   # server secrets for the form (local dev)
npm run dev                      # http://localhost:4321
npm run build                    # → dist/
```

## Editing content

Everything is in **`src/data/resume.json`**:

| Section | Key |
|---|---|
| Hero / profile | `profile` |
| Social links | `socials` |
| Stat counters | `stats` |
| About + quick facts | `about` |
| Work history | `experience` |
| Skills | `skills` |
| Education | `education` |
| Contact copy + blocked email domains | `contact` |

`llms.txt` and the MCP server are generated from the same file, so they always stay in sync.

## Contact form configuration

The form posts to `/api/send` (a Cloudflare Function). Set these in the deployment's environment (and in `.dev.vars` for local dev):

| Variable | Type | Purpose |
|---|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | build (public) | Turnstile widget |
| `TURNSTILE_SECRET_KEY` | secret | Turnstile server-side verification |
| `RESEND_API_KEY` | secret | Email delivery |
| `CONTACT_TO_EMAIL` | secret | Where requests are delivered |
| `CONTACT_FROM_EMAIL` | secret | Verified Resend sender |

## Deployment

Cloudflare Pages — framework preset **Astro**, build command `npm run build`, output directory `dist`. Add the environment variables above and enable the **`nodejs_compat`** compatibility flag (required by the Astro Cloudflare adapter).

## Project structure

```
src/
  components/        UI sections (Hero, Experience, Skills, …)
  data/resume.json   ← all content
  layouts/
  pages/
    index.astro      home
    404.astro
    api/send.ts      contact-form endpoint
    mcp.ts           MCP server (read-only résumé tools)
    llms.txt.ts      AI-readable markdown summary
public/              static assets, fonts, _headers, robots, sitemap, .well-known/
```

## Not committed

`.gitignore` excludes the résumé PDF, source photos (`PICS/`), `.env`, `.dev.vars`, `node_modules/`, and `dist/`.
