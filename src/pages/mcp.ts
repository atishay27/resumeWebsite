import type { APIRoute } from 'astro';
import resume from '../data/resume.json';

// Stateless remote MCP server (Model Context Protocol) over Streamable HTTP.
// Runs on-demand in the Cloudflare Worker (no Durable Objects, no sessions) so it
// stays on the free tier. Read-only, public, no auth — exposes the resume as MCP
// tools + resources so AI agents can query it. Does not affect the static homepage.
export const prerender = false;

const SUPPORTED_VERSIONS = ['2024-11-05', '2025-03-26', '2025-06-18'];
const DEFAULT_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'atishay-resume', version: '1.0.0' };

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id',
  'Access-Control-Max-Age': '86400',
};

const strip = (s: string) =>
  s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- content generators (from resume.json) ----------
const profileText = () => {
  const { profile, socials, meta } = resume;
  return [
    `${profile.name} — ${profile.title}`,
    `Location: ${profile.location}`,
    `Availability: ${profile.availability}`,
    `Website: ${meta.siteUrl}`,
    ...socials.map((s) => `${s.label}: ${s.url}`),
    '',
    strip(profile.lead),
  ].join('\n');
};
const experienceText = () =>
  resume.experience
    .map((j) => `## ${j.role} — ${j.company} (${j.date})\n` + j.points.map((p) => `- ${strip(p)}`).join('\n'))
    .join('\n\n');
const skillsText = () => resume.skills.map((s) => `- ${s.title}: ${s.items.join(', ')}`).join('\n');
const educationText = () =>
  resume.education
    .map((e) => `- ${e.degree}, ${e.university} (${e.period}) — CGPA ${e.cgpa}/10, ${e.location}`)
    .join('\n');
const requestResumeText = () =>
  `Atishay does not publish his phone number, personal email, or full resume PDF here (privacy by design). ` +
  `To request the full resume, use the contact form at ${resume.meta.siteUrl}/#contact. ` +
  `A company email address is required (free/personal email providers are rejected); you'll get a reply within ~24 hours.`;
const fullMarkdown = () =>
  `# ${resume.profile.name}\n\n${profileText()}\n\n# Experience\n\n${experienceText()}\n\n# Skills\n\n${skillsText()}\n\n# Education\n\n${educationText()}\n\n# Contact\n\n${requestResumeText()}\n`;

// ---------- tools ----------
const noArgs = { type: 'object', properties: {}, additionalProperties: false };
const TOOLS = [
  { name: 'get_profile', description: "Atishay Jain's name, title, location, availability, links, and a short summary.", inputSchema: noArgs, run: profileText },
  { name: 'list_experience', description: 'Work experience: roles, companies, dates, and key achievements.', inputSchema: noArgs, run: experienceText },
  { name: 'get_skills', description: 'Technical skills grouped by category (languages, frameworks, devops, etc.).', inputSchema: noArgs, run: skillsText },
  { name: 'get_education', description: 'Education history: degrees, universities, CGPA, and dates.', inputSchema: noArgs, run: educationText },
  { name: 'how_to_request_resume', description: 'How to request the full resume / contact Atishay (company email required).', inputSchema: noArgs, run: requestResumeText },
] as const;

// ---------- resources ----------
const RESOURCES = [
  { uri: 'resume://atishay-jain/full', name: 'Atishay Jain — full résumé (markdown)', description: 'The complete résumé as markdown.', mimeType: 'text/markdown', read: fullMarkdown },
];

// ---------- JSON-RPC plumbing ----------
const result = (id: unknown, r: unknown) => ({ jsonrpc: '2.0', id, result: r });
const error = (id: unknown, code: number, message: string) => ({ jsonrpc: '2.0', id, error: { code, message } });

function handle(msg: any): object | null {
  const { id, method, params } = msg ?? {};
  // Notifications (no id) get no response.
  if (id === undefined || id === null) return null;

  switch (method) {
    case 'initialize': {
      const v = params?.protocolVersion;
      return result(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(v) ? v : DEFAULT_VERSION,
        capabilities: { tools: {}, resources: {} },
        serverInfo: SERVER_INFO,
        instructions:
          "Read-only MCP server for Atishay Jain's résumé. Use the tools to fetch profile, experience, skills, and education.",
      });
    }
    case 'ping':
      return result(id, {});
    case 'tools/list':
      return result(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case 'tools/call': {
      const tool = TOOLS.find((t) => t.name === params?.name);
      if (!tool) return error(id, -32602, `Unknown tool: ${params?.name}`);
      return result(id, { content: [{ type: 'text', text: tool.run() }], isError: false });
    }
    case 'resources/list':
      return result(id, { resources: RESOURCES.map(({ uri, name, description, mimeType }) => ({ uri, name, description, mimeType })) });
    case 'resources/read': {
      const res = RESOURCES.find((r) => r.uri === params?.uri);
      if (!res) return error(id, -32602, `Unknown resource: ${params?.uri}`);
      return result(id, { contents: [{ uri: res.uri, mimeType: res.mimeType, text: res.read() }] });
    }
    case 'prompts/list':
      return result(id, { prompts: [] });
    default:
      return error(id, -32601, `Method not found: ${method}`);
  }
}

export const OPTIONS: APIRoute = () => new Response(null, { status: 204, headers: CORS });

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({ server: SERVER_INFO, transport: 'streamable-http (stateless)', hint: 'POST JSON-RPC 2.0 messages to this endpoint.' }),
    { status: 200, headers: { 'Content-Type': 'application/json', ...CORS } }
  );

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify(error(null, -32700, 'Parse error')), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...CORS },
    });
  }

  // Batch or single.
  const responses = Array.isArray(body)
    ? body.map(handle).filter((r): r is object => r !== null)
    : (() => {
        const r = handle(body);
        return r ? [r] : [];
      })();

  // All notifications → 202 Accepted, no body.
  if (responses.length === 0) return new Response(null, { status: 202, headers: CORS });

  const payload = Array.isArray(body) ? responses : responses[0];
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
};
