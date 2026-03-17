# Claude Code Command Center

A local dashboard for managing your Claude Code setup — MCPs, plugins, skills, agents, and markdown memory files — across all your projects.

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
| **Command palette** | ⌘K to search and navigate everything |
| **Keyboard shortcuts** | `R` rescan · `G` toggle graph · `L` activity log · `D`/`F` switch tabs · `Esc` back |

## Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Claude Code](https://claude.ai/code) installed (the `claude` CLI)

## Setup

```bash
# 1. Clone
git clone https://github.com/your-username/claude-code-command-center
cd claude-code-command-center/app

# 2. Install dependencies
npm install

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
| `CLAUDE_CC_PROJECTS_DIR` | auto-detected | Directory containing your projects. Comma-separate for multiple: `~/Projects,~/work`. Auto-detects from `~/Desktop`, `~/Projects`, `~/projects`, `~/code`, `~/dev`, `~/workspace` |
| `GITHUB_TOKEN` | — | GitHub Personal Access Token for Discover search. Without it you get 60 req/hr. Create at [github.com/settings/tokens](https://github.com/settings/tokens) with `public_repo` read scope |
| `ANTHROPIC_API_KEY` | — | Enables the **AI Suggest** tab in Discover. Get yours at [console.anthropic.com](https://console.anthropic.com/settings/keys) |

## The primer.md memory system

Each project can have a `primer.md` at its root. Claude reads it at the start of every session to restore context, then rewrites it at the end with what changed, next steps, and blockers.

To enable this for a project, add a `CLAUDE.md` in the project root:

```markdown
At the start of every session, read `primer.md` to restore context.

At the end of every session, rewrite `primer.md` completely to reflect:
- What this project is and its current state
- What changed this session
- Next steps
- Open blockers
```

The **Files** tab in Command Center lets you edit both files. The **Files → Templates** tab has a ready-made "Primer Memory System" template you can apply with one click.

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
app/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── scan/          Scans all Claude configs
│   │   │   ├── mutate/        Toggle plugins, remove MCPs/agents/skills
│   │   │   ├── files/         Read/write markdown files
│   │   │   ├── discover/      GitHub search for augmentations
│   │   │   ├── install/       Install MCPs/skills from GitHub
│   │   │   ├── health/        Check if MCPs are reachable
│   │   │   ├── suggest/       AI-powered augmentation suggestions
│   │   │   ├── export/        Download config as JSON
│   │   │   ├── activity/      Activity log CRUD
│   │   │   ├── start-project/ Launch a project's dev server
│   │   │   └── config/        Expose resolved paths to client
│   │   └── page.tsx           Main dashboard
│   ├── components/            UI components
│   └── lib/
│       ├── config.ts          Path resolution (env vars + auto-detect)
│       ├── scanner.ts         Reads Claude configs and project directories
│       ├── files.ts           Markdown file CRUD
│       ├── activity.ts        Activity log (append-only NDJSON)
│       └── templates.ts       CLAUDE.md template library
└── .env.local.example         Environment variable template
```

## Activity log

All configuration changes (installs, removals, toggles, project starts) are logged to `~/.claude/command-center-activity.ndjson`. View the last 100 entries from the Activity button in the header or press `L`.

## Contributing

PRs welcome. The app is intentionally local-only — no database, no telemetry, no external services except the optional GitHub and Anthropic APIs.

## License

MIT
