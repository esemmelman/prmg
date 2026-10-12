# Folio â€” personal project manager

Live: https://esemmelman.github.io/prmg/

A responsive personal workspace with multiple projects, task boards and lists with saved drag ordering, priorities, dates, subtasks, comments, Markdown knowledge pages, a Gantt chart, activity history, search, project archiving, and JSON export.

## Local development

Requires Node.js 24 or later. Run `npm ci`, then `npm run dev` and open the `/prmg/` path. Validate with `npm run lint` and `npm run build`. GitHub Actions builds and publishes the main branch to GitHub Pages.

## Supabase and authentication

Uses the existing **bnaimitzvah** Supabase project. Separate `prmg_*` tables have database-enforced owner access. The publishable key in `src/config.js` is public by design; no database password, service key, or login password is committed.

Sign in with the existing owner's Supabase **app account password**, not the Supabase dashboard or Postgres password. Only the owner listed in `prmg_private.owners` may access the workspace. Each request verifies that the real Supabase session exists and is less than 90 days old. This browser remembers its session until that limit or sign-out. Global Auth settings and existing apps are unchanged.

The private owners table deliberately has RLS enabled without client policies; only the narrowly scoped private session-check function reads it. This is an intentional deny-by-default design, which the database advisor reports as informational: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

Schema migrations are in `supabase/migrations/`. Task lists open in Manual order; drag a row or its grip handle to rearrange tasks. Alt + Up/Down on a handle also moves a task. Order is saved to Supabase. Saves check `updated_at` to reject stale edits. The workspace refreshes on focus and every minute. Failed saves keep the editor open. Edits require an internet connection.

Assignees are organizational labels, not invitations. Project deletion cascades to its tasks, pages and comments; archive to retain them. Settings exports all loaded records as JSON. Import, attachments, reminders, and calendar integrations are not included.

## Verification

Run `npx playwright install chromium`, `npm run build`, then `npx playwright test`. Browser tests use a mocked API and verify creation, task completion, subtasks, comments, Markdown preview, Gantt charts, failed-save recovery, export, mobile layout, sign-in errors, and expired sessions.

`tests/database-security.sql` runs administrator-only transaction tests against Supabase, then rolls back all fixtures. It checks real owner CRUD, activity triggers, optimistic concurrency, date constraints, cascade deletion, session expiry, non-owner isolation, and anonymous denial. No fixtures remain in the live database.

Projects are selected from an alphabetical listbox above the workspace. The plus button above it adds a project. Right-click a project for Edit and Delete, or use Shift+F10 with its listbox option focused. Select a project and open Log (before Tasks) to add timestamped entries for that project. Log entries persist as project-linked documents in the reserved `Project log` category and are excluded from Knowledge base. Switching projects keeps the selected tab and shows only that project’s entries.

Selecting a project opens its existing logs first in the center pane. A small Add button opens the rich-text entry editor below the logs; saving or canceling closes it. The toolbar supports bold, italic, underline, and bulleted or numbered lists. Saved entries can be edited or deleted; legacy plain-text entries remain readable. Rich-text HTML is sanitized before saving and displaying.

In the Tasks grid, drag a row’s numbered grip to move it above or below another row. Choose Manual order to enable reordering. The order persists across reloads. Alt+Up/Down on the grip provides keyboard reordering.

Pages and Links appear after Gantt chart and before Knowledge base. Pages holds multiple titled rich-text topics for each project; Links holds named HTTP/HTTPS URLs that open in a new tab. Both support add, edit, delete, and search. They persist as project-linked documents in the reserved `Project pages` and `Project links` categories and are excluded from Knowledge base.

The built-in `_All` listbox item combines all projects, including archived projects, with alphabetical project headings. The combined Gantt view shows tasks only, sorted by start date then task name, with project names in parentheses beneath each task; undated tasks appear last. Counts show combined totals. Create or edit records within a project group to keep them attached to that project. `_All` is a view rather than a stored project and has no edit/delete menu.

Pages initially shows topic titles. Click a title to expand or collapse its content. Edit, Delete, and Print remain available on the title row.
