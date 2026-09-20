# Folio — personal project manager

Live: https://esemmelman.github.io/prmg/

A responsive personal workspace with multiple projects, task boards and lists, priorities, dates, subtasks, comments, Markdown knowledge pages, a Gantt chart, activity history, search, project archiving, and JSON export.

## Local development

Requires Node.js 24 or later. Run `npm ci`, then `npm run dev` and open the `/prmg/` path. Validate with `npm run lint` and `npm run build`. GitHub Actions builds and publishes the main branch to GitHub Pages.

## Supabase and authentication

Uses the existing **bnaimitzvah** Supabase project. Separate `prmg_*` tables have database-enforced owner access. The publishable key in `src/config.js` is public by design; no database password, service key, or login password is committed.

Sign in with the existing owner's Supabase **app account password**, not the Supabase dashboard or Postgres password. Only the owner listed in `prmg_private.owners` may access the workspace. Each request verifies that the real Supabase session exists and is less than 90 days old. This browser remembers its session until that limit or sign-out. Global Auth settings and existing apps are unchanged.

The private owners table deliberately has RLS enabled without client policies; only the narrowly scoped private session-check function reads it. This is an intentional deny-by-default design, which the database advisor reports as informational: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

Schema: `supabase/migrations/20260920144444_create_prmg_workspace.sql`. Saves check `updated_at` to reject stale edits. The workspace refreshes on focus and every minute. Failed saves keep the editor open. Edits require an internet connection.

Assignees are organizational labels, not invitations. Project deletion cascades to its tasks, pages and comments; archive to retain them. Settings exports all loaded records as JSON. Import, attachments, reminders, and calendar integrations are not included.

## Verification

Run `npx playwright install chromium`, `npm run build`, then `npx playwright test`. Browser tests use a mocked API and verify creation, task completion, subtasks, comments, Markdown preview, Gantt charts, failed-save recovery, export, mobile layout, sign-in errors, and expired sessions.

`tests/database-security.sql` runs administrator-only transaction tests against Supabase, then rolls back all fixtures. It checks real owner CRUD, activity triggers, optimistic concurrency, date constraints, cascade deletion, session expiry, non-owner isolation, and anonymous denial. No fixtures remain in the live database.
