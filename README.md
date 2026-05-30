<div align="center">

# 🌱 sprout

**Per-PR Postgres branching + preview environments for any repo — local, free, Docker.**

Open a pull request, run one command, get an isolated database branch (a copy of
your production data) *and* the PR's app running together — with a URL you can open.
Close the PR, it all disappears.

</div>

---

## What you get

```
$ sprout up 123

  🌱  git worktree of PR #123            (your working tree stays untouched)
  🐘  postgres branch  ← restored from your prod snapshot
  📦  your app         ← built from the PR, DATABASE_URL wired automatically
  🔗  http://123.myapp.localhost         (routed by a shared Caddy proxy)
  📜  http://localhost:8080              (Dozzle — logs for every branch)

$ sprout down 123
  ✓  containers + volume + worktree gone
```

Every PR is fully isolated: its own network, its own volume, its own data. Run
ten at once without collisions.

## Why the connection string "just works"

The app and its database sit on the **same Docker network**, so the app reaches
the DB at a fixed internal hostname (`db:5432`). The connection string is
therefore *identical for every branch* — isolation comes from the per-PR network
and volume, not from juggling URLs.

sprout injects that string into whatever env var your app already reads
(`url_var`, e.g. `DATABASE_URL`) plus any mirrors (`DATABASE_URL_UNPOOLED`, …).
**You never type or manage a per-PR connection string.**

## How it works

```
 GitHub PR ──▶ sprout up <pr>
                  │
                  ├─ git worktree add        →  ~/.sprout/worktrees/<project>/pr-<n>
                  ├─ render docker-compose    (db + app + Caddy labels + shared net)
                  ├─ compose up -d --build    →  project  sprout-<project>-<n>
                  │     db  (postgres)  ──┐  internal DNS "db"
                  │     app (your build) ─┘  DATABASE_URL=postgres://…@db:5432/<db>
                  ├─ restore prod snapshot → run migrate → (optional) seed
                  └─ route via shared Caddy  →  http://<n>.<project>.localhost

 shared, started once:   Caddy (:80, label-routed)   ·   Dozzle (:8080, all logs)
```

## Requirements

| Tool | Why |
|------|-----|
| **Docker** | runs the branch DB, the app, Caddy, Dozzle, and the snapshot tooling |
| **git** | PR checkout via worktrees |
| **gh** *(optional)* | resolves a PR number to its git ref (incl. forks) |
| a **Dockerfile** in the target repo | so sprout can build the app |

No host Postgres client needed — `pg_dump`/`pg_restore` run inside containers that
match your configured engine version.

## Install

```bash
npm install        # in this repo
npm run build      # → dist/cli.js  (bin: sprout)
npm link           # optional: put `sprout` on your PATH
```

## Quickstart

```bash
cd your-repo
sprout init                                  # scaffold sprout.yml — then edit it
export PROD_DATABASE_URL=postgresql://…      # source for the data copy
sprout snapshot                              # pg_dump prod → cached base.dump
sprout up 123                                # branch + preview for PR #123
open http://123.your-project.localhost
```

## Commands

| Command | Does |
|---------|------|
| `sprout init` | scaffold a `sprout.yml` in the repo |
| `sprout snapshot` | `pg_dump` the prod DB into a reusable base snapshot |
| `sprout up <pr>` | build + start an isolated branch and preview |
| `sprout down <pr>` | tear it down (containers, volume, worktree) |
| `sprout ls` | list active branches |
| `sprout logs [pr]` | stream a PR's logs, or print the Dozzle URL |
| `sprout shared up\|down` | manage the shared Caddy + Dozzle services |

Useful flags:

- `sprout -C path/to/repo up 123` — operate on another repo without `cd`.
- `sprout up 1 --ref my-branch` — use a local branch instead of resolving a PR.
- `sprout up 1 --skip-snapshot` — start from an empty schema (just migrate/seed).

## Configuration — `sprout.yml`

Drop this in the target repo. Only `project`, `app.build`, `app.port`,
`db.database`, `db.snapshot.source_env`, and `db.migrate` are required — the rest
default to sensible Postgres values.

```yaml
project: myapp                  # namespace for containers / snapshots / domains

app:
  build:
    context: .
    dockerfile: Dockerfile
  port: 3000                    # the app's internal listen port
  env_file: .env.preview        # secrets injected into the app container (optional)
  env:
    NODE_ENV: production

db:
  engine: postgres:16-alpine    # also the version used for dump/restore
  database: appdb
  user: postgres
  password: postgres
  internal_host: db             # docker service name the app connects to
  url_var: DATABASE_URL         # env var your app reads — sprout fills it in
  mirror_vars: [DATABASE_URL_UNPOOLED]   # same value copied into these too
  snapshot:
    source_env: PROD_DATABASE_URL   # env var holding the prod URL to pg_dump
  migrate: "pnpm db:migrate"    # runs inside the app container after restore
  seed: "pnpm db:seed"          # optional

proxy:
  domain: "{pr}.{project}.localhost"   # {pr} and {project} are substituted
```

> `app.env` can set anything **except** the connection string — sprout injects
> `url_var`/`mirror_vars` last, so the branch DB URL can never be clobbered.

See [`examples/sprout.yml`](examples/sprout.yml) for a Next.js + Drizzle setup.

## State & cleanup

Everything lives under `~/.sprout/` (override with `SPROUT_HOME`):

```
~/.sprout/
  snapshots/<project>/base.dump   # the prod data copy
  worktrees/<project>/pr-<n>/      # per-PR checkouts
  compose/<project>/pr-<n>.yml     # generated compose files
  registry.json                    # active branches (powers `sprout ls`)
```

`sprout down <pr>` removes a branch's containers, volume, and worktree.

## Troubleshooting

- **`*.localhost` doesn't resolve.** macOS and modern browsers map it to
  `127.0.0.1` automatically. If yours doesn't, add a `/etc/hosts` entry or use
  `curl --resolve <pr>.<project>.localhost:80:127.0.0.1`.
- **`migrate`/`seed` fails in the container.** Those commands run *inside the app
  image*, so the toolchain they need (e.g. `drizzle-kit`) must be present there.
- **Snapshot contains real data.** It's a raw copy of production, kept only under
  `~/.sprout` and never committed — treat that directory as sensitive.

## Roadmap

- GitHub automation (self-hosted runner / webhook) to auto up/down on PR events
- MySQL and other pluggable database engines

## License

MIT
