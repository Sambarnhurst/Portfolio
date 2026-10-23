-- Optional migration for an existing D1 database created from 0001-projects.sql.
-- Safe if applied after the updated 0001 seed: updates the same preserved community record.
INSERT INTO projects (slug,title,category,status,summary,description,url,label,featured,published,sort_order)
VALUES (
  'community-heaven',
  'Project HEAVEN Community',
  'HEAVEN',
  'Prototype',
  'Earlier community website prototype with a public town-building proposal, social feed, member system, project voting, OZREN team interfaces, and a file workspace. Rebuild required.',
  'Source: PROJECT HEAVEN.zip placed in Portfolio/HEAVEN COMMUNITY PROJECT. Archive preserves index.html, community.html, workspace.html, JavaScript/CSS assets and local Windows server shortcuts. The README says the HTML is a browser-saved snapshot; backend/API and live account data are not included. This is NOT a working deployable community platform. A full backend/auth/data migration rebuild is required.',
  '/community-project.html',
  'COMMUNITY / LEGACY PROTOTYPE',
  0, 1, 40
)
ON CONFLICT(slug) DO UPDATE SET
  title=excluded.title,
  category=excluded.category,
  status=excluded.status,
  summary=excluded.summary,
  description=excluded.description,
  url=excluded.url,
  label=excluded.label,
  featured=excluded.featured,
  published=excluded.published,
  sort_order=excluded.sort_order,
  updated_at=datetime('now');
