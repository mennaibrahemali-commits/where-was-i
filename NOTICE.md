# Notice

**where was i?** is a modified version of **JumpyBrain**
(https://github.com/tanay9098/JumpyBrain, © JumpyBrain contributors).

- Modified by Menna Ali, October 2026.
- The whole work, including the modifications, is licensed under the
  GNU Affero General Public License v3.0 — see [LICENSE](./LICENSE).
- This program comes with ABSOLUTELY NO WARRANTY.

## What was changed (17 October 2026)

- Added a new local-first web app in `frontend/src/wwi/` and made it the app
  that `frontend/` builds (`frontend/src/main.jsx`, `frontend/index.html`,
  `frontend/vite.config.ts`, new icons in `frontend/public/wwi-*`).
- The "What next?" rules in `frontend/src/wwi/lib/whatNext.js` and the task
  categories in `frontend/src/wwi/lib/classify.js` are adapted from
  JumpyBrain's `backend/ml/priorityModel.js`.
- Added tests in `frontend/tests/`.
- The original JumpyBrain frontend (`frontend/src/App.jsx`,
  `frontend/src/components/`), backend, Chrome extension and ML service are
  kept unchanged in the repository but are not used by where was i?.

## Further changes (17 October 2026, later)

- Optional accounts and sync with Supabase (`frontend/src/wwi/lib/cloud.js`,
  `sync.js`, `supabase/setup.sql`), a separate Work pipeline board, a
  ringing alarm when focus time ends, reminders, and a simpler item screen.

## If you host it for other people (AGPL section 13)

Anyone who uses a hosted copy must be offered the source code of that exact
version. The app's **More → About** section links to the source. When you
publish your own copy, set `VITE_SOURCE_URL` to your own public repository so
that link points at your version.
