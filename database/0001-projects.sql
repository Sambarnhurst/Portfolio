-- Run against a newly created D1 database: npx wrangler d1 execute portfolio-content --remote --file=database/0001-projects.sql
CREATE TABLE IF NOT EXISTS projects (
  slug TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('HEAVEN','AI','Tools','Apps')),
  status TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL DEFAULT '',
  featured INTEGER NOT NULL DEFAULT 0 CHECK (featured IN (0,1)),
  published INTEGER NOT NULL DEFAULT 0 CHECK (published IN (0,1)),
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(published, featured, sort_order);
INSERT OR IGNORE INTO projects (slug,title,category,status,summary,description,url,label,featured,published,sort_order) VALUES
  ('heaven-game', 'HEAVEN', 'HEAVEN', 'In development', 'A planet-scale multiplayer first-person shooter with procedural terrain, physics-driven movement, and developer creator tools.', 'Flagship game project currently in active development.', '/heaven.html', 'GAME / FLAGSHIP', 1, 1, 10),
  ('heaven-world-editor', 'HEAVEN World Editor', 'HEAVEN', 'In development', 'World-building tools for sculpting procedural terrain, placing assets, and designing worlds on a spherical planet.', 'Internal creator tool in the HEAVEN development workflow.', '', 'EDITOR / WORLD', 1, 1, 20),
  ('heaven-character-editor', 'Character & Weapon Editor', 'HEAVEN', 'In development', 'A development workspace for first-person characters, skeletal attachments, hand grips, weapon alignment, and projectile systems.', 'Internal game development tool.', '', 'EDITOR / CHARACTER', 1, 1, 30),
  ('heaven-code-forge', 'Code Forge 3D', 'Tools', 'Prototype', 'An interactive 3D map of code files and their relationships, designed for exploring and editing complex projects.', 'Code navigation and developer tooling experiment.', '', 'TOOL / CODE', 1, 1, 40),
  ('learning-cube-forge', 'Learning Code Cube Forge', 'Tools', 'Prototype', 'A 3D learning and documentation environment with milestones, coding lessons, progress tracking, and personal notes.', 'Interactive learning platform.', '', 'TOOL / LEARNING', 0, 1, 50),
  ('local-agent-studio', 'Local Agent Studio', 'AI', 'Prototype', 'A local AI workspace exploring model detection, task-based model routing, tool permissions, and desktop integrations.', 'Local AI software experiment.', '', 'AI / DESKTOP', 1, 1, 60),
  ('evolution-ai', 'Evolution AI', 'AI', 'Concept', 'An experimental small-model language-model architecture and training roadmap focused on local operation and future scaling.', 'Research and development concept.', '', 'AI / RESEARCH', 0, 1, 70),
  ('life-os', 'Life OS', 'Apps', 'Prototype', 'A modular personal dashboard for tasks, planning, projects, learning, journals, and daily organization.', 'Personal software project.', '', 'APP / PRODUCTIVITY', 0, 1, 80);
