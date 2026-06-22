# Atishay Jain — Resume Website

A fast, sleek single-page resume site built with **Astro** + **Tailwind CSS**. All content lives in one editable JSON file, and the contact form delivers requests via **Web3Forms**. Deployed on **Cloudflare Pages**.

## ✨ Features

- **100% data-driven** — edit `src/data/resume.json` to update any content. No need to touch HTML/CSS.
- **Astro + Tailwind** — ships near-zero JavaScript; only small islands for the typing effect, counters, particles, and form.
- **Modern animations** — scroll reveals, animated counters, typing role text, particle-network background, hover micro-interactions.
- **Request-resume form** — company-email validation, honeypot anti-spam, delivered via Web3Forms.
- **Privacy-first** — phone number and personal email are never published.

## 🗂 Editing content

Everything is in **`src/data/resume.json`**:

| Section      | Key            |
|--------------|----------------|
| Name / hero  | `profile`      |
| Social links | `socials`      |
| Stat counters| `stats`        |
| About + facts| `about`        |
| Work history | `experience`   |
| Skill groups | `skills`       |
| Education    | `education`    |
| Contact form | `contact`      |

Change the values, save, and the site updates on the next build.

## 🚀 Local development

```bash
npm install
cp .env.example .env   # then paste your Web3Forms key
npm run dev            # http://localhost:4321
npm run build          # outputs to dist/
npm run preview        # preview the production build
```

## ☁️ Deploy to Cloudflare Pages

1. Push this repo to GitHub (`atishay27/resumeWebsite`).
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → select the repo.
3. Build settings:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Settings → Environment variables → Add:**
   - `PUBLIC_WEB3FORMS_KEY` = *your Web3Forms access key*
5. Save & deploy.

> The Web3Forms key is a **public client-side key** by design — it is safe to expose in the
> browser, but it is kept in an env var (not committed) so it is easy to rotate.

## 🖼 Headshot

The hero portrait lives at `public/portrait.webp` (with `public/portrait.jpg` fallback).
Replace those files to change the photo — no code changes needed.

## 🔒 Not committed to git

`.gitignore` excludes the source resume PDF, the `PICS/` folder, `.env`, `node_modules/`, and `dist/`.
