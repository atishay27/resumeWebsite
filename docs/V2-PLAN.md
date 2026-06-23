# V2 — Self-Hosted Secure Contact Form (Evaluation & Plan)

> Status: **evaluation / design** — nothing here is deployed. Branch: `v2-secure-form`.
> Goal: move off Web3Forms to a self-owned, high-security form flow with captcha
> (and optional email-OTP verification), using only Cloudflare's free serverless stack.

---

## 1. The core constraint (read this first)

The brief asked for **"free SMTP servers without a backend."** After verifying against
current (2026) docs, the honest engineering reality is:

1. **Browsers cannot speak SMTP.** There's no raw-TCP API in the browser, and putting SMTP
   credentials in client-side JS would expose them to anyone viewing source — an instant
   account takeover / open relay. So a *pure static* site can never send mail securely.
2. **Cloudflare Workers cannot speak SMTP either.** The V8 isolate runtime blocks raw socket
   connections to mail servers. Per Cloudflare's own docs, **email from Workers must go through
   an HTTP email API**, not SMTP.
3. **OTP verification is impossible without a backend.** Verifying a one-time code requires
   server-side state (store the code, compare it, enforce attempts/expiry). Client-side
   verification is trivially bypassed.

**So "no backend" is not achievable for what we want.** Web3Forms/EmailJS/Formspree aren't
"no backend" — they *are* a backend-as-a-service you're renting (and rate-limiting/Pro-gating
you). The real choice is: *whose* backend.

**Good news:** your site already deploys **as a Cloudflare Worker**. Adding a few `/api/*`
routes to it is the natural, $0, "no separate server to manage" path — and it unlocks
**server-side** captcha + validation + OTP, which is strictly more secure than today.

---

## 2. Recommended architecture

```
┌──────────────┐     POST /api/request-otp      ┌─────────────────────┐
│  Astro static │ ─────────────────────────────▶│  Cloudflare Worker   │
│  contact form │     POST /api/verify-and-send  │  (same project)      │
│  + Turnstile  │ ◀─────────────────────────────│                      │
└──────────────┘            JSON                  │  • verify Turnstile  │
                                                  │  • validate email    │
                                                  │  • rate-limit (KV)   │
                                                  │  • OTP store (KV)     │
                                                  │  • send via Resend    │
                                                  └─────────┬───────────┘
                                                            │ HTTPS API
                                                            ▼
                                                    ┌───────────────┐
                                                    │    Resend      │  → your inbox
                                                    │ (atishay.dev   │  → (opt) requester
                                                    │  verified)     │
                                                    └───────────────┘
```

- **Frontend:** same Astro site (static).
- **Backend:** Astro server endpoints via the `@astrojs/cloudflare` adapter (output: `hybrid`/
  `server`) → deploys as part of the existing Worker. No separate service.
- **Captcha:** Cloudflare **Turnstile** (free), verified **server-side** in the Worker.
- **State:** Cloudflare **KV** (free tier) for OTP codes + rate-limit counters.
- **Email:** **Resend** HTTP API (free 3k/mo), sending from a verified `atishay.dev` address.
- **Secrets:** Resend API key, Turnstile secret, OTP pepper → **Worker secrets** (never client).

Cost at our volume (a few requests/day): **$0** — comfortably inside every free tier.

---

## 3. Email provider comparison (verified 2026)

| Provider | Free tier | Transport | Deliverability | Verdict |
|---|---|---|---|---|
| **Resend** ⭐ | **3,000/mo, 100/day**, 1 verified domain | HTTPS API | Excellent (verify `atishay.dev` → DKIM/SPF) | **Recommended** — best DX, generous, proven on Workers |
| **Cloudflare Email Service** | ~free at our volume (**$0.35 / 1,000**), public beta | **Native Worker binding** (no API key) | Good | Cleanest integration, but paid + beta |
| MailChannels API | 100/day free | HTTPS API | Good | Free Cloudflare tier **ended Aug 2024**; fallback only |
| Brevo (Sendinblue) | 300/day free | HTTPS API | Good | Viable alternative |
| SendGrid | ❌ free tier discontinued (2026) | — | — | Avoid |

**Recommendation: Resend.** Free, generous, and verifying `atishay.dev` gives proper
DKIM/SPF/DMARC so OTP/notification mail lands in inboxes, not spam. Cloudflare Email Service is
the runner-up if you prefer zero secret-management (native binding) and don't mind pennies/month.

> ⚠️ SMTP-from-Workers is impossible (§1). "SMTP credentials" services like SMTP2GO still
> require a backend that can open SMTP — not viable here. We use HTTPS email APIs instead.

---

## 4. Captcha — upgrade to server-verified Turnstile

Today's hCaptcha is validated by Web3Forms and was Pro-gated for Turnstile. With our own Worker
we can do it **properly**:

- Render **Cloudflare Turnstile** (free, privacy-first, native to your stack).
- The Worker calls `https://challenges.cloudflare.com/turnstile/v0/siteverify` with the
  **secret key** before doing anything else. No valid token → 403, no email sent.
- This is **unbypassable** from the client (unlike a purely client-side check).

(hCaptcha also supports server-side `siteverify`; Turnstile is the natural Cloudflare fit.)

---

## 5. Feature (b): Email-OTP verification

### Flow
```
1. Visitor fills form (name, company, company email, role, JD) + solves Turnstile.
2. POST /api/request-otp { email, company, turnstileToken }
   Worker:
     • verify Turnstile (server-side)
     • validate company email server-side (block free providers) — now UNBYPASSABLE
     • rate-limit: per-email + per-IP + global daily cap   ← anti email-bombing
     • generate 6-digit code; store SHA-256(code + pepper) in KV, TTL 10 min, attempts=0
     • Resend → email the code to the submitted address
     • respond 200 (generic) — UI reveals the OTP input
3. Visitor enters the code.
4. POST /api/verify-and-send { email, code, ...formData }
   Worker:
     • load KV record; if missing/expired → fail
     • attempts >= 5 → lock + delete
     • compare hash; on success → DELETE key (single-use) and dispatch the request
       (notify you, and/or auto-send the resume — see §7)
     • on failure → attempts++
```

### Why it helps
Proves the requester **controls the email they submitted** → filters bots and fake/disposable
addresses, so you only get real leads.

### Honest trade-offs
- ➖ **Friction.** A recruiter must leave the page, open email, and type a code → measurable
  drop-off on a resume-request form.
- ➖ **New attack surface: email bombing.** Your form could be abused to spam a victim's inbox
  with codes. *Must* be mitigated with strict rate limits (below).
- ➕ Strong assurance the lead is real.
- ➖ More code + state to maintain.

**Take:** Turnstile (server-verified) + server-side company-email validation + honeypot already
delivers "high-class security" with **zero friction**. OTP is a *second* layer worth adding only
if you actually see spam. Recommend shipping the foundation first, OTP as an optional phase.

---

## 6. Security analysis (threats → mitigations)

| Threat | Today (Web3Forms) | V2 mitigation |
|---|---|---|
| Public key abuse | Key is public in HTML | **No public key** — Resend key is a Worker secret |
| Captcha bypass | Client-side-ish | **Server-side** Turnstile `siteverify` |
| Company-email spoofing | Client JS only (bypassable) | **Server-side** validation in the Worker |
| OTP brute force | n/a | 6-digit + **max 5 attempts** + 10-min TTL + single-use + **hashed at rest** (pepper) |
| Email bombing via OTP | n/a | Rate-limit **per recipient email + per IP + global daily cap** (KV counters) |
| Enumeration | n/a | Uniform/generic responses |
| Secrets exposure | Public submission key | Worker **encrypted env secrets**; nothing sensitive client-side |
| Cross-origin abuse | — | **CORS locked to `atishay.dev`**; reject other origins |
| Bots | Honeypot | Honeypot **+** Turnstile **+** (opt) OTP; Cloudflare WAF/Rate-Limiting rules |

---

## 7. Resume delivery — decision needed

| Option | Behaviour | Pros | Cons |
|---|---|---|---|
| **A. Notify-only** (like today) | After verification, email **you** the request; you reply with the PDF | PDF stays private; you gatekeep | Manual reply |
| **B. Auto-send** | After verification, email the requester a **time-limited signed link** (PDF in Cloudflare **R2**) | Instant, hands-off | Anyone passing OTP gets it; need R2 + signed-URL logic |

**Recommendation:** **A** (notify-only) keeps you in control and the PDF private, while OTP still
adds the "verified email" signal. Upgrade to **B** later if you want full automation.

---

## 8. Phased plan

- **Phase 1 — Foundation (big win, no friction):** Astro Cloudflare adapter + `/api/send`
  endpoint, server-verified **Turnstile**, **Resend** (verify `atishay.dev`), server-side email
  validation, honeypot, CORS lock. → **Replaces Web3Forms entirely.**
- **Phase 2 — OTP (optional):** add KV, `/api/request-otp` + `/api/verify-and-send`, the OTP UI
  step, and rate-limit/anti-bombing counters.
- **Phase 3 — Auto-send (optional):** R2 + signed expiring links (delivery option B).

---

## 9. Open decisions (please confirm before build)

1. **Email provider:** Resend (recommended) / Cloudflare Email Service / other?
2. **OTP:** build now (Phase 2) or ship foundation first and add OTP only if spam appears?
3. **Resume delivery:** notify-only (A) or auto-send signed link (B)?
4. **Captcha:** switch to Turnstile (recommended) or keep hCaptcha?

All paths stay within Cloudflare/Resend free tiers (**~$0/month**).
