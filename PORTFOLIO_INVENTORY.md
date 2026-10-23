# Portfolio upload audit — 2026-10-23

Source reviewed: user-provided `Portfolio(1).zip` (~151 MiB compressed).

**Readme scope:** Inventory only. The ZIP's contents are **not** deployed automatically, and their presence does not imply a working hosted service.

## Packaged applications

| Website project | Folder in upload | Package | Availability |
|---|---|---|---|
| HEAVEN FPS | `Portfolio/FPS/` | `HEAVEN_GAME_0.10.8.43_GAME_ONLY.zip` plus three `HEAVEN_ASSETS_0.10.8.42_PART_{1,2,3}_OF_3` ZIPs | Local game build; multiplayer browser hosting not configured |
| Certification Tracker & Code Workstation | `Portfolio/CERTIFICATION/` | `Learning_Code_Cube_Forge_Portable_v4.0.zip` | Portable HTML frontend and optional Python local server |
| AI Workstation | `Portfolio/AI/AI ASSISTANT/` | `Local_Agent_Studio_Professional_v2_0_SOURCE.zip` | Python 3.11+ source release, no Windows EXE; live local model operation not verified |

### HEAVEN FPS

- Game source package is version **0.10.8.43**.
- Asset-generation archives are **0.10.8.42**. Keeping the asset packs is the documented incremental update approach.
- The game archive contains a `client/`, Node-based `server/`, `shared/`, tests and launch scripts, not simply a single standalone public HTML page.
- Do **not** expose development server administration endpoints or local persistent data to the public website while preparing a deployable game.
- The three asset archives and the game archive have not been deployed to Cloudflare assets or R2.

### Certification Tracker and workstation

The v4.0 package includes `Forge_v4.0/index.html` and `forge_server.py`, with three modes:
- **Learn**: cube learning map, 33 study milestones, lessons, backups
- **Notes**: document editor with full advanced formatting tools
- **Code**: 3D code/file workspace, local source editor, search, import/export

These are integrated views of one application, rather than three independent downloaded projects.

### AI Workstation

Local Agent Studio Professional 2.0 is a Python local server + native JavaScript frontend, with local model adapters, conversation storage, tool approval flow, and project file editing. It requires Python 3.11+ and separate local inference engines/models. Package's own release manifest reports an unbuilt Windows EXE and installer and notes that live AI inference wasn't tested in its release environment.

## Project HEAVEN Community — legacy website prototype

New archive supplied October 23, 2026: `PROJECT HEAVEN.zip`, located in `Portfolio/HEAVEN COMMUNITY PROJECT/` (about 6.7 MB compressed, 30 entries). SHA-256: `0c9a0965946729cf1a8f870355ccda5ca2c0eb3cee572ece0a7e81693f83bd85`. ZIP content CRC validation passed in Python; the archive contains some legacy non-UTF-8 filename encoding differences.

The ZIP contains a `PROJECT HEAVEN/` directory with three substantial saved HTML pages:

- `WEBSITE FILES/index.html`: proposed shared-town initiative, gate-based nonbinding interest registry and public explainer
- `WEBSITE FILES/community.html`: social feed, users, projects/voting, uploads and OZREN AI team interfaces
- `WEBSITE FILES/workspace.html`: file storage workspace and AI-assisted editor interface

Also present: browser-saved `_next`/CSS/JS/image assets and Windows command/shortcut files aimed at an earlier local Caddy service. The included `README - START HERE.txt` explicitly states the deployed HTML was derived from a **browser snapshot**, with links/forms potentially still tied to the original backend. The ZIP does **not** include the Caddy configuration, API server implementation, auth database, account data, or a complete installable runtime.

**Classification:** archived prototype, rebuild required. A public *description* page can be published, but **do not copy or mount the snapshot as a live interactive application**. A future rebuild needs a real backend, authenticated social data/storage, voting/registry security, AI model hosting, and an intentional migration. This community/town initiative is separate from the HEAVEN FPS game's multiplayer systems.

## Empty folders / unreleased

- `Portfolio/AI/TRADING BOT/`: empty; **no usable trading bot**
- `Portfolio/INVESTMENTS/`: empty; reserved project area

Trading Bot and Investments remain unpublished drafts. The Community prototype has a public **description only**, without running community features.

## Project-management rules

1. Separate **packaged locally** from **live on the website** and **planned**.
2. Preserve large HEAVEN assets in reusable packs and update the game separately.
3. Do not expose the trading bot as operational, or describe the HEAVEN Community snapshot as a working website or backend.
4. The project cards and detail pages describe capabilities only; they do not yet provide files, binaries, a game launcher, or remote AI access.
5. New upload versions should be audited and mapped to the project inventory before a release is announced.
