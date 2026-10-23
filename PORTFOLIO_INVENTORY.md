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

## Empty folders / unreleased

- `Portfolio/HEAVEN COMMUNITY PROJECT/`: empty; future rebuild
- `Portfolio/AI/TRADING BOT/`: empty; **no usable trading bot**
- `Portfolio/INVESTMENTS/`: empty; reserved project area

These are listed as unpublished draft records in the private developer dashboard, not public app features or delivered software.

## Project-management rules

1. Separate **packaged locally** from **live on the website** and **planned**.
2. Preserve large HEAVEN assets in reusable packs and update the game separately.
3. Do not expose the trading bot or HEAVEN Community Project as operational until they exist.
4. The project cards and detail pages describe capabilities only; they do not yet provide files, binaries, a game launcher, or remote AI access.
5. New upload versions should be audited and mapped to the project inventory before a release is announced.
