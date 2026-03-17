# Claude Code Command Center

A local dashboard for managing your Claude Code setup — MCPs, plugins, skills, agents, and markdown memory files — across all your projects.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript) ![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss) ![License: MIT](https://img.shields.io/badge/License-MIT-green)

## Features

| Feature | Description |
|---|---|
| **Dashboard** | Overview of every MCP, plugin, skill, and agent — global and per-project |
| **Project cards** | Progress estimate, next steps, augmentation counts, and a one-click Start button |
| **Graph view** | Interactive network diagram of how your Claude config connects to projects |
| **Augmentation panel** | MCP categories, health checks, plugin toggles, skill browser |
| **Discover → GitHub** | Search GitHub for MCPs, plugins, and skills; install with one click |
| **Discover → AI Suggest** | Claude analyses a project and suggests relevant augmentations (needs API key) |
| **Files editor** | Read and edit all `.md` config files (agents, skills, CLAUDE.md, primer.md, plans) |
| **CLAUDE.md templates** | Pre-built templates for Next.js, Python, SaaS, data science, and CLI projects |
| **Session primers** | Per-project `primer.md` files Claude reads at session start and rewrites at end |
| **Activity log** | History of every install, removal, and toggle |
| **Config export** | Download your full Claude config as JSON |
| **Command palette** | `⌘K` / `Ctrl+K` to search and navigate everything |

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Claude Code](https://claude.ai/code) installed (the `claude` CLI)

## Setup

```bash
# 1. Clone
git clone https://github.com/tomnewtoneng/command-center
cd command-center

# 2. Install dependencies
cd app && npm install

# 3. Configure (optional — works with zero config for most setups)
cp .env.local.example .env.local
# Edit .env.local as needed (see Configuration below)

# 4. Start
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

All variables are optional. The app auto-detects sensible defaults.

| Variable | Default | Description |
|---|---|---|
| `CLAUDE_CC_PROJECTS_DIR` | auto-detected | Directory (or comma-separated list) containing your projects. Auto-detects from `~/Desktop`, `~/Projects`, `~/projects`, `~/code`, `~/dev`, `~/workspace` |
| `GITHUB_TOKEN` | — | GitHub Personal Access Token for Discover search. Without it you get 60 req/hr. Create at [github.com/settings/tokens](https://github.com/settings/tokens) with `public_repo` read scope |
| `ANTHROPIC_API_KEY` | — | Enables the **AI Suggest** tab in Discover. Get yours at [console.anthropic.com](https://console.anthropic.com/settings/keys) |

## The primer.md memory system

Each project can have a `primer.md` at its root. Claude reads it at the start of every session to restore context, then rewrites it at the end with what changed, next steps, and blockers.

Apply the **Primer Memory System** template from the Files → Templates tab, or add this to your project's `CLAUDE.md` manually:

```markdown
At the start of every session, read `primer.md` to restore context.

At the end of every session, rewrite `primer.md` completely to reflect:
- What this project is and its current state
- What changed this session
- Next steps
- Open blockers
```

Project cards in the dashboard automatically derive their progress bar and next steps from `task.md`, `plan.md`, and `primer.md`.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open command palette |
| `R` | Rescan configs from disk |
| `D` | Switch to Dashboard tab |
| `F` | Switch to Files tab |
| `G` | Toggle Grid / Graph view |
| `L` | Open / close activity log |
| `Esc` | Close palette / go back |

## Project structure

```
claude-code-command-center/
├── README.md
├── .gitignore
└── app/                          Next.js application
    ├── .env.local.example        Copy to .env.local and configure
    ├── package.json
    ├── tsconfig.json
    └── src/
        ├── app/
        │   ├── layout.tsx        Root layout and metadata
        │   ├── page.tsx          Main dashboard shell (tabs, keyboard shortcuts, palette)
        │   └── api/
        │       ├── scan/         Read all Claude configs and project directories
        │       ├── mutate/       Toggle plugins, remove MCPs / agents / skills
        │       ├── files/        Read and write markdown files
        │       ├── discover/     GitHub repo search for augmentations
        │       ├── install/      Install MCPs and skills from GitHub
        │       ├── health/       Check whether MCP packages are reachable
        │       ├── suggest/      AI-powered augmentation suggestions (Anthropic API)
        │       ├── export/       Download full config as JSON
        │       ├── activity/     Append-only activity log (NDJSON)
        │       ├── start-project/ Launch a project's dev server in the background
        │       └── config/       Expose resolved paths to client components
        ├── components/
        │   ├── project-card.tsx      Project card with status bar and Start button
        │   ├── project-detail.tsx    Expanded project drawer
        │   ├── global-overview.tsx   Top-level stat cards
        │   ├── augmentation-panel.tsx MCPs, plugins, skills, agents panel
        │   ├── discover-panel.tsx    GitHub search + AI suggest
        │   ├── files-panel.tsx       Markdown file editor + templates
        │   ├── graph-view.tsx        Interactive network graph (@xyflow/react)
        │   ├── command-palette.tsx   ⌘K palette
        │   └── activity-log.tsx      Activity log drawer
        └── lib/
            ├── config.ts         Path resolution — reads env vars, auto-detects home dirs
            ├── scanner.ts        Parses Claude configs and derives project status
            ├── files.ts          Markdown file CRUD helpers
            ├── activity.ts       Activity log read/write (append-only NDJSON)
            └── templates.ts      CLAUDE.md template definitions
```

## Extending

The codebase is designed to be straightforward to extend:

**Add a new API route**
Create `src/app/api/your-feature/route.ts`. Import from `src/lib/` for data access; keep route handlers thin.

**Add a new UI panel**
Create `src/components/your-panel.tsx`. Wire it into `page.tsx` alongside the existing tab or panel components.

**Add a new CLAUDE.md template**
Open `src/lib/templates.ts` and append a new entry to the `CLAUDE_TEMPLATES` array — it will appear automatically in the Files → Templates modal.

**Add new project status signals**
Edit `computeProjectStatus()` in `src/lib/scanner.ts` to parse additional files (e.g. a `roadmap.md`) and incorporate them into the progress percentage.

**Add new fields to project scanning**
Edit `scanProject()` and the `ProjectInfo` interface in `src/lib/scanner.ts`. The result flows automatically to project cards and the graph view.

## Activity log

All configuration changes (installs, removals, toggles, project starts) are logged to `~/.claude/command-center-activity.ndjson`. View the last 100 entries from the Activity button in the header or press `L`.

## Contributing

PRs welcome. The app is intentionally local-only — no database, no telemetry, no external services except the optional GitHub and Anthropic APIs.

## License

MIT
