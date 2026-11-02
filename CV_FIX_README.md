# Nour.OS — CV preview and inactive-version deletion

This is a **four-file patch** for the previously installed Dynamic CV & Categories update. It does not replace Wrangler configuration, database migrations, or other project files.

## Changes
- Homepage and Contact: View CV (opens the active PDF in a new browser tab) and Download CV (downloads the active PDF), both retaining `cv-glow` styling.
- `/api/cv` returns the active PDF inline; `/api/cv?download=1` forces download.
- Admin Content Studio: View for every CV version, Delete for inactive versions, and an explicit confirmation before deleting. The active CV cannot be deleted.
- Deleting an inactive version deletes its R2 object and database records. Deactivate it or activate another CV first.

## Installation
1. Back up your current project and export your D1 database.
2. Extract this ZIP over the project root, replacing only the four listed source files.
3. Deploy the public Worker: `npx wrangler deploy --config wrangler.jsonc`
4. Deploy the admin Worker: `npx wrangler deploy --config wrangler.admin.jsonc`
5. Refresh both sites using Ctrl+Shift+R. Test View, Download, activation and deletion with a disposable inactive CV first.

No D1 migration is needed. The patch has not been deployed to your Cloudflare account.
