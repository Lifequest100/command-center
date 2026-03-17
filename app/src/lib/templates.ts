export interface ClaudeTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  content: string;
}

export const CLAUDE_TEMPLATES: ClaudeTemplate[] = [
  {
    id: "primer-system",
    name: "Primer Memory System",
    category: "Memory",
    description: "Instructs Claude to read primer.md at session start and rewrite it at end",
    content: `# Session Memory

At the start of every session, read \`primer.md\` to restore context.

At the end of every session, **rewrite \`primer.md\` completely** to reflect:
- What this project is and its current state
- What changed this session
- Next steps
- Open blockers

> primer.md is the single source of truth for session continuity.
`,
  },
  {
    id: "nextjs-project",
    name: "Next.js / React Project",
    category: "Web",
    description: "Guidelines for a Next.js app with TypeScript and Tailwind",
    content: `# Project Guidelines

## Stack
- Next.js App Router with TypeScript
- Tailwind CSS for styling
- Use \`src/\` directory layout

## Code Style
- Prefer server components; use \`"use client"\` only when needed
- Co-locate types with the files that use them
- Keep API routes thin — logic belongs in \`lib/\`
- Avoid \`any\` — use \`unknown\` and narrow properly

## File Organisation
- \`src/app/\` — pages and API routes
- \`src/components/\` — reusable UI
- \`src/lib/\` — pure logic, no React imports

## Commands
- \`npm run dev\` — start dev server
- \`npm run build\` — production build
- \`npx tsc --noEmit\` — type check

## Planning & Tracking
Maintain these files at the project root:
- \`README.md\` — project overview, setup instructions, feature list
- \`plan.md\` — milestone/phase plan using \`- [ ]\` / \`- [x]\` checkboxes per phase
- \`task.md\` — current session task list with \`- [ ]\` / \`- [x]\` checkboxes; update at the end of every session

## Behaviour
- Always read the file before editing it
- Prefer editing existing files over creating new ones
- Keep solutions simple — avoid over-engineering
`,
  },
  {
    id: "python-project",
    name: "Python Project",
    category: "Backend",
    description: "Guidelines for Python / FastAPI / data science projects",
    content: `# Project Guidelines

## Stack
- Python 3.11+
- Use virtual environments (venv or uv)
- Type hints everywhere — run \`mypy\` before committing

## Code Style
- PEP 8 formatting (black / ruff)
- Descriptive variable names — avoid one-letter vars outside comprehensions
- Dataclasses or Pydantic models for structured data, not plain dicts

## File Organisation
\`\`\`
src/           application code
tests/         pytest test files
scripts/       one-off utilities
requirements.txt or pyproject.toml
\`\`\`

## Commands
- \`python -m uvicorn main:app --reload\` — dev server (FastAPI)
- \`pytest\` — run tests
- \`ruff check .\` — linting

## Planning & Tracking
Maintain these files at the project root:
- \`README.md\` — project overview, setup instructions, API reference
- \`plan.md\` — milestone/phase plan using \`- [ ]\` / \`- [x]\` checkboxes per phase
- \`task.md\` — current session task list with \`- [ ]\` / \`- [x]\` checkboxes; update at the end of every session

## Behaviour
- Always check imports are available before using them
- Prefer raising typed exceptions over returning error strings
- Keep functions short — max ~30 lines before splitting
`,
  },
  {
    id: "saas-product",
    name: "SaaS Product",
    category: "Product",
    description: "Guidelines for a multi-feature SaaS with auth, billing, and users",
    content: `# Project Guidelines

## Architecture
- Auth: check session before every protected route
- Billing: never hardcode plan limits — read from config
- Webhooks: idempotent handlers with event deduplication

## Security Rules
- Validate and sanitise all user input at the boundary
- Never log passwords, tokens, or PII
- Rotate secrets on any suspected exposure immediately
- All API endpoints must check authentication first

## Database
- Prefer explicit transactions for multi-step writes
- Add indexes before going to production
- Run migrations in a transaction where possible

## Testing
- New features need at minimum a happy-path integration test
- Regression tests for every bug fix

## Planning & Tracking
Maintain these files at the project root:
- \`README.md\` — product overview, architecture diagram, setup guide for contributors
- \`plan.md\` — milestone/phase plan using \`- [ ]\` / \`- [x]\` checkboxes (e.g. Auth, Billing, Dashboard)
- \`task.md\` — current session task list with \`- [ ]\` / \`- [x]\` checkboxes; update at the end of every session

## Behaviour
- Warn before any destructive operation (delete, bulk update)
- Check for existing functionality before adding new abstractions
`,
  },
  {
    id: "data-science",
    name: "Data Science / ML",
    category: "Data",
    description: "Guidelines for notebooks, ETL pipelines, and ML experiments",
    content: `# Project Guidelines

## Principles
- Reproducibility first — seed random, pin library versions, version datasets
- Prefer simple models before complex ones — understand baselines first
- Data is immutable: never overwrite raw data, only transform to new files

## File Organisation
\`\`\`
data/raw/        original, unmodified data
data/processed/  cleaned and feature-engineered
notebooks/       exploration (clearly named by date or purpose)
src/             production-ready pipeline code
models/          serialised model artefacts
\`\`\`

## Code Style
- Notebooks for exploration only — move reusable logic to \`src/\`
- Document every feature engineering decision with a comment
- Log experiment metrics to a results file or MLflow

## Planning & Tracking
Maintain these files at the project root:
- \`README.md\` — project goal, dataset description, model summary, results, how to reproduce
- \`plan.md\` — experiment/milestone plan using \`- [ ]\` / \`- [x]\` checkboxes (e.g. EDA, baseline, feature engineering, final model)
- \`task.md\` — current session task list with \`- [ ]\` / \`- [x]\` checkboxes; update at the end of every session

## Behaviour
- When touching a dataset, describe its shape and key stats first
- Report confidence intervals, not just point estimates
- Flag data leakage risks explicitly
`,
  },
  {
    id: "cli-tool",
    name: "CLI Tool",
    category: "Tooling",
    description: "Guidelines for command-line tools and developer utilities",
    content: `# Project Guidelines

## UX Principles
- Fail loudly with a clear error message — never silently
- \`--dry-run\` flag on any command that mutates state
- Exit codes: 0 = success, 1 = user error, 2 = internal error
- Stdout for output, stderr for diagnostics/progress

## Code Style
- Parse arguments with a proper library (argparse, click, commander)
- Validate all inputs before doing any work
- Keep core logic decoupled from the CLI layer (testable in isolation)

## Documentation
- Every command needs a \`--help\` description
- README must include at least one real usage example per command

## Planning & Tracking
Maintain these files at the project root:
- \`README.md\` — tool description, installation steps, usage examples for every command
- \`plan.md\` — feature/milestone plan using \`- [ ]\` / \`- [x]\` checkboxes per command or release
- \`task.md\` — current session task list with \`- [ ]\` / \`- [x]\` checkboxes; update at the end of every session

## Behaviour
- Prefer idempotent operations
- Confirm before destructive actions unless \`--yes\` flag is set
`,
  },
];
