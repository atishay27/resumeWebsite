import type { APIRoute } from 'astro';
import resume from '../../data/resume.json';

// Server-rendered endpoint (runs in the Cloudflare Worker, not prerendered).
export const prerender = false;

const SITE_ORIGIN = 'https://atishay.dev';
const BLOCKED = new Set(resume.contact.blockedEmailDomains.map((d) => d.toLowerCase()));

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  );

const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  // Cloudflare runtime bindings/secrets (falls back to import.meta.env in some dev setups).
  const env: Record<string, string | undefined> =
    (locals as any).runtime?.env ?? (import.meta.env as any);

  const RESEND_API_KEY = env.RESEND_API_KEY;
  const TURNSTILE_SECRET_KEY = env.TURNSTILE_SECRET_KEY;
  const TO = env.CONTACT_TO_EMAIL;
  const FROM = env.CONTACT_FROM_EMAIL || 'Resume Requests <noreply@atishay.dev>';

  // ---- Lock to our own origin (defence-in-depth against cross-site abuse) ----
  const origin = request.headers.get('origin') || '';
  if (origin && origin !== SITE_ORIGIN && !origin.startsWith('http://localhost')) {
    return json(403, { success: false, message: 'Forbidden origin.' });
  }

  if (!RESEND_API_KEY || !TURNSTILE_SECRET_KEY || !TO) {
    // Misconfiguration — never leak which secret is missing.
    return json(500, { success: false, message: 'Server is not configured to send mail yet.' });
  }

  let data: Record<string, string>;
  try {
    data = await request.json();
  } catch {
    return json(400, { success: false, message: 'Invalid request.' });
  }

  // ---- Honeypot: pretend success, send nothing ----
  if (data.botcheck) return json(200, { success: true });

  // ---- Turnstile (server-side, unbypassable) ----
  const token = (data['cf-turnstile-response'] || '').trim();
  if (!token) return json(400, { success: false, message: 'Please complete the verification.' });

  const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: TURNSTILE_SECRET_KEY,
      response: token,
      remoteip: clientAddress || '',
    }),
  });
  const verify = (await verifyRes.json()) as { success: boolean };
  if (!verify.success) {
    return json(403, { success: false, message: 'Verification failed. Please try again.' });
  }

  // ---- Validate + normalise fields (server-side: cannot be bypassed) ----
  const name = (data.name || '').trim().slice(0, 120);
  const company = (data.company || '').trim().slice(0, 160);
  const email = (data.email || '').trim().slice(0, 200);
  const role = (data.role || '').trim().slice(0, 160);
  const workType = (data.work_type || '').trim().slice(0, 40);
  const message = (data.message || '').trim().slice(0, 5000);

  if (!name || !company || !email || !role || !message) {
    return json(400, { success: false, message: 'Please fill in all required fields.' });
  }
  if (!isEmail(email) || BLOCKED.has(email.split('@')[1]?.toLowerCase() || '')) {
    return json(400, { success: false, message: 'Please use a valid company email address.' });
  }

  // ---- Send via Resend ----
  const html = `
    <h2>New resume request</h2>
    <table cellpadding="6" style="border-collapse:collapse">
      <tr><td><b>Name</b></td><td>${escapeHtml(name)}</td></tr>
      <tr><td><b>Company</b></td><td>${escapeHtml(company)}</td></tr>
      <tr><td><b>Email</b></td><td>${escapeHtml(email)}</td></tr>
      <tr><td><b>Role</b></td><td>${escapeHtml(role)}</td></tr>
      <tr><td><b>Work type</b></td><td>${escapeHtml(workType)}</td></tr>
    </table>
    <p><b>Message / JD</b></p>
    <p style="white-space:pre-wrap">${escapeHtml(message)}</p>`;

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      reply_to: email,
      subject: `${resume.contact.subject} — ${name} @ ${company}`,
      html,
    }),
  });

  if (!sendRes.ok) {
    return json(502, { success: false, message: 'Could not send right now. Please try again shortly.' });
  }

  return json(200, { success: true, message: resume.contact.successMessage });
};
