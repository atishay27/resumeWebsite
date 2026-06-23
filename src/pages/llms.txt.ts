import type { APIRoute } from 'astro';
import resume from '../data/resume.json';

// Prerendered to a static /llms.txt at build time — zero runtime cost, no perf impact.
// llms.txt is the emerging convention for giving LLMs/agents a clean, structured
// markdown overview of a site. Generated from resume.json so it never drifts.
export const prerender = true;

const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const GET: APIRoute = () => {
  const { profile, about, experience, skills, education, socials, meta } = resume;
  const L: string[] = [];

  L.push(`# ${profile.name}`, '');
  L.push(`> ${strip(profile.lead)}`, '');
  L.push(`- **Role:** ${profile.title}`);
  L.push(`- **Location:** ${profile.location}`);
  L.push(`- **Availability:** ${profile.availability}`);
  L.push(`- **Website:** ${meta.siteUrl}`);
  socials.forEach((s) => L.push(`- **${s.label}:** ${s.url}`));
  L.push('');

  L.push('## About', '');
  about.paragraphs.forEach((p) => L.push(strip(p), ''));

  L.push('## Experience', '');
  experience.forEach((j) => {
    L.push(`### ${j.role} — ${j.company} (${j.date})`);
    j.points.forEach((pt) => L.push(`- ${strip(pt)}`));
    L.push('');
  });

  L.push('## Skills', '');
  skills.forEach((s) => L.push(`- **${s.title}:** ${s.items.join(', ')}`));
  L.push('');

  L.push('## Education', '');
  education.forEach((e) =>
    L.push(`- **${e.degree}**, ${e.university} (${e.period}) — CGPA ${e.cgpa}/10, ${e.location}`)
  );
  L.push('');

  L.push('## Contact', '');
  L.push(
    `Full resume is available on request via the contact form at ${meta.siteUrl}/#contact ` +
      `(a company email address is required). Personal phone/email are intentionally not published.`
  );
  L.push('');

  return new Response(L.join('\n'), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
