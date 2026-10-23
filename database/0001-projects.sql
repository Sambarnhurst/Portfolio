-- Run on a NEW D1 database only. This is the initial project inventory seed.
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
  ('heaven-game', 'HEAVEN FPS', 'HEAVEN', 'In development', 'A local multiplayer FPS build on a procedural spherical planet, with physics-driven combat, world editors, and reusable asset packs.', 'Current local build: game 0.10.8.43 with three reusable asset ZIPs from generation 0.10.8.42. Browser hosting and public multiplayer deployment are not yet configured.', '/heaven.html', 'GAME / LOCAL DEVELOPMENT', 1, 1, 10),
  ('learning-code-cube-forge', 'Certification Tracker & Code Workstation', 'Tools', 'Local build', 'A three-part learning workspace: certification progress, rich documentation notes, and a 3D code workspace with a file editor.', 'Current package: Learning_Code_Cube_Forge_Portable_v4.0.zip. Portable offline HTML or optional Python local server. Includes 33 study milestones and backup/import tools.', '/forge.html', 'WORKSTATION / V4.0', 1, 1, 20),
  ('local-agent-studio', 'AI Workstation', 'AI', 'Source build', 'Local Agent Studio Professional v2.0: a Python-based local AI workspace with conversations, model routing, tool permissions, and project editing.', 'Current package: Local_Agent_Studio_Professional_v2_0_SOURCE.zip. Python 3.11+ source release; not a precompiled executable. Models and inference engines are separate. Live AI operation on this computer is not verified.', '/ai-workstation.html', 'LOCAL AI / SOURCE 2.0', 1, 1, 30),
  ('community-heaven', 'Project HEAVEN Community', 'HEAVEN', 'Prototype', 'Earlier community website prototype with a public town-building proposal, social feed, member system, project voting, OZREN team interfaces, and a file workspace. Rebuild required.', 'Source: PROJECT HEAVEN.zip placed in Portfolio/HEAVEN COMMUNITY PROJECT. Archive preserves index.html, community.html, workspace.html, JavaScript/CSS assets and local Windows server shortcuts. The README says the HTML is a browser-saved snapshot; backend/API and live account data are not included. This is NOT a working deployable community platform. A full backend/auth/data migration rebuild is required.', '/community-project.html', 'COMMUNITY / LEGACY PROTOTYPE', 0, 1, 40),
  ('trading-bot', 'Trading Bot', 'AI', 'Planned', 'Reserved project area for a future trading automation system. No usable trading bot is currently available.', 'Current Portfolio ZIP contains an empty AI/TRADING BOT folder. Do not present this as operating, tested, profitable, or released.', '', 'FUTURE / NOT OPERATIONAL', 0, 0, 60),
  ('investments', 'Investments Workspace', 'Apps', 'Planned', 'Reserved folder for investment research, tracking, and future financial tools. No implementation included yet.', 'Current Portfolio ZIP contains an empty INVESTMENTS folder. Not a product or working tracker at this stage.', '', 'FUTURE / RESERVED', 0, 0, 70);
