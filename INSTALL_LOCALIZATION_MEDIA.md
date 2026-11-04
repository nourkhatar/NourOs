# Nour.OS — localization and direct media integration

This patch combines the previous clean EN/FR translation update and the incremental sync/admin favicon correction, then adds full in-place project/experience/achievement attachments and category/role translation coverage. Apply to the latest NourOS project, not over an unknown newer revision.

## Before installing
1. Back up the project folder and export the remote D1 database (`npx wrangler d1 export nour-os-db --remote --output "$env:USERPROFILE\Downloads\NourOS-D1-before-localization.sql"`).
2. In Content Studio export Content JSON as a second backup. Do not delete manual French values from D1 before a successful sync. The new editor has only one set of editable content fields; generated `*Fr` fields are stored for the public FR switch.
3. Extract this archive and copy its `public`, `admin-public`, and `src` files to the corresponding project paths. It intentionally contains no Wrangler configuration or migrations.
4. Configure DeepL API: sign up for an API plan at https://www.deepl.com/pro-api, obtain an API authentication key from the account dashboard, then run `npx wrangler secret put DEEPL_API_KEY --config wrangler.admin.jsonc` and paste it at the hidden prompt. For an API Pro account, set the `DEEPL_API_ENDPOINT` admin Worker variable to `https://api.deepl.com` (Free uses `https://api-free.deepl.com`). Do not commit keys.
5. Deploy admin: `npx wrangler deploy --config wrangler.admin.jsonc`.
6. Deploy public: `npx wrangler deploy --config wrangler.jsonc`.
7. Hard-refresh both pages. In Content Studio, export JSON again and run **Sync Existing Translations**. Keep the tab open; progress is saved between batches. If a previous sync was interrupted, clear `sessionStorage` key `nour-sync-cursor` before this expanded sync so it starts at the first field.
8. Verify the FR switch on projects, experiences, achievements, categories and role descriptions, and verify English on a fresh browser session. Test an attached PDF and image in project details; they should be displayed immediately in the same details modal without another preview click. Verify the NK favicon in both public and admin tabs.

## Important limitations
- Translation requires the DeepL API and network access; it is not offline. Proper names, code, URLs and technical terms may need review. Some static UI strings are translated locally in the frontend and are not DeepL-generated.
- The English original is preserved during the one-time sync. French fields are overwritten only when DeepL returns a successful translation. Existing translations are not destructively removed from D1: they are replaced safely, and no separate French input is shown in Content Studio.
- The embedded PDF viewer is the browser's native viewer. A browser may expose its own download/print controls even when a file is marked view-only. This is not a DRM mechanism.
- This package was syntax-checked, but not live-tested against Cloudflare or the user's database. Test before pushing to GitHub.
