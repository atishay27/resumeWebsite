# V2 Migration — Cloudflare Worker → Cloudflare Pages (zero-downtime)

> The live site (`atishay.dev`) currently runs as a **static Cloudflare Worker**. V2 needs
> **Pages** (to run the `/api/send` Function). This plan stands up Pages **in parallel** and only
> touches the live domain at the final cutover, so there's **no downtime** and **instant rollback**.

## Guiding principle
1. Build & test V2 entirely on a `*.pages.dev` URL — the live Worker keeps serving `atishay.dev`.
2. Only at the end do we move `atishay.dev` from the Worker to Pages (a ~30-second DNS swap).
3. Keep the old Worker around (disabled) until V2 is confirmed stable → one-click rollback.

## What does NOT change (important)
- **Redirect Rules** for `atishay.net`, `jainatishay.com`, `www.*` → `atishay.dev` are **zone-level**,
  not tied to the Worker. They keep working throughout. ✅
- DNS for the other domains, your email (MX/SPF/DMARC), and the sitemap/robots all stay as-is.
- `_headers` (CSP/security) and `_routes.json` are read natively by Pages — same behaviour.

---

## Prerequisites (do these first)
1. **Turnstile** → Cloudflare → Turnstile → add widget for `atishay.dev` → copy **Site key** + **Secret key**.
2. **Resend** → sign up (no card) → **Domains → add `atishay.dev`** → add the **DKIM/SPF** DNS records
   it shows you (in Cloudflare DNS) → wait for "Verified" → **API Keys → create** one.
3. Decide the delivery inbox (`CONTACT_TO_EMAIL`) and sender (`CONTACT_FROM_EMAIL`, e.g.
   `Resume Requests <noreply@atishay.dev>` — must be on the verified domain).

---

## Step A — Create the Pages project (parallel, safe)
1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.
2. Select repo `atishay27/resumeWebsite`. Name it e.g. **`atishay-resume`** → `atishay-resume.pages.dev`.
3. Build settings:
   - **Production branch:** `main`
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Save & deploy. (Production builds `main` = V1 today; harmless — it lives only on `*.pages.dev`,
   NOT your real domain.)

## Step B — Functions config + secrets  ⚠️ critical
1. **Settings → Functions → Compatibility flags:** add **`nodejs_compat`**; set **Compatibility date**
   to `2024-09-23` or later. *(The Astro adapter needs this or the Function 500s.)*
2. **Settings → Environment variables** — add for **BOTH** Production and Preview:
   | Name | Type | Value |
   |---|---|---|
   | `PUBLIC_TURNSTILE_SITE_KEY` | Plaintext (build) | your Turnstile **site** key |
   | `TURNSTILE_SECRET_KEY` | **Secret** | your Turnstile **secret** key |
   | `RESEND_API_KEY` | **Secret** | `re_...` |
   | `CONTACT_TO_EMAIL` | **Secret** | your inbox |
   | `CONTACT_FROM_EMAIL` | Plaintext | `Resume Requests <noreply@atishay.dev>` |

## Step C — Deploy V2 to a Preview URL and TEST (no domain yet)
1. The `v2-secure-form` branch auto-builds a **preview** at `v2-secure-form.atishay-resume.pages.dev`.
   (If it built before the flags/vars were set, hit **Retry deployment**.)
2. On that preview URL:
   - Form loads, Turnstile widget appears.
   - Submit with a **company email** → green success.
   - A real email lands in `CONTACT_TO_EMAIL` (check spam first time).
   - Quick negative checks: free email (gmail) blocked; empty submit blocked.
3. Only proceed once the preview works end-to-end.

## Step D — Promote to production
1. Merge `v2-secure-form` → `main` (PR or fast-forward). Pages rebuilds **production** = V2 at
   `atishay-resume.pages.dev`. Confirm the form works there too (Production env vars apply).

## Step E — Domain cutover (the only live-affecting step, ~30s)
> A custom domain can attach to only ONE service at a time. This moves `atishay.dev` Worker → Pages.
1. Pages project → **Custom domains → Set up a custom domain → `atishay.dev`**.
2. Cloudflare will say the record is in use by the Worker and offer to **update it to point to Pages** —
   confirm. (If it doesn't auto-handle: first remove `atishay.dev` from the old Worker's
   *Domains & Routes*, then add it on Pages.)
3. Add **`www.atishay.dev`** as a custom domain on Pages too (the www→root redirect rule still applies).
4. Within a minute, `https://atishay.dev` is served by Pages (V2). Verify:
   - Homepage loads (static, fast).
   - `/api/send` works (submit a real test).
   - `atishay.net` / `jainatishay.com` still 301 → `atishay.dev` (unchanged).

## Step F — Decommission the old Worker
1. Leave the old Worker **deployed but with no custom domain** for a few days (rollback safety).
2. Once V2 is confirmed stable, delete the old Worker (and its `PUBLIC_WEB3FORMS_KEY` var).
3. Optional: deactivate the Web3Forms account; the hCaptcha shared-key usage is gone.

---

## Rollback (if anything breaks after cutover)
- Re-attach `atishay.dev` to the **old Worker** (Workers → old project → Domains & Routes → add
  `atishay.dev`). It still serves V1. ~30s to recover. Then debug Pages on its `*.pages.dev` URL.

## Post-migration cleanup
- Remove `PUBLIC_WEB3FORMS_KEY` everywhere; delete the old Worker.
- Update README's deploy section to describe the Pages + Resend + Turnstile setup.
- (Optional, later) Phase 2 OTP, Phase 3 auto-send — see `V2-PLAN.md`.
