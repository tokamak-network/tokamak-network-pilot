#!/usr/bin/env node
/**
 * Example: List projects and get one by ID or slug.
 * GET /projects (no auth), GET /projects/:idOrSlug (no auth)
 *
 * Usage:
 *   TOKAMAK_PILOT_API_URL=http://localhost:4000/api/v1 node examples/node-projects.mjs
 *   node examples/node-projects.mjs
 *   node examples/node-projects.mjs tokamak-bridge   # get single project by slug
 */

const baseUrl = process.env.TOKAMAK_PILOT_API_URL || 'http://localhost:4000/api/v1';
const slugOrId = process.argv[2];

if (slugOrId) {
  // Get single project
  const res = await fetch(`${baseUrl}/projects/${encodeURIComponent(slugOrId)}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Error:', data.message || res.statusText);
    process.exit(1);
  }
  console.log('Project:', JSON.stringify(data, null, 2));
} else {
  // List all projects
  const res = await fetch(`${baseUrl}/projects`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('Error:', data.message || res.statusText);
    process.exit(1);
  }
  const list = Array.isArray(data) ? data : data.projects || data.data || [];
  console.log('Projects:', list.length);
  list.forEach((p) => console.log(`  - ${p.name} (${p.slug}) — ${p.id}`));
}
