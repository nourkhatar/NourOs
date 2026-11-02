# Nour.OS: Dynamic CV and categories

This project is based on the current repository, with the V11 admin-only UI patch applied. Existing public content, assets, D1 content, and R2 files are not reset.

## BEFORE deploying (mandatory)

1. Back up D1 and your current project.
2. Keep **your existing local `wrangler.admin.jsonc`**. The supplied config may have placeholders; never overwrite working Access settings.
3. Run the additive migration **once**:

```powershell
npx wrangler d1 migrations apply nour-os-db --remote --config wrangler.jsonc
```

4. Deploy **both** Workers (the public API and frontend also change):

```powershell
npx wrangler deploy --config wrangler.jsonc
npx wrangler deploy --config wrangler.admin.jsonc
```

5. Test the admin: upload a PDF under CV VERSIONS, then click Activate. Both public CV buttons appear when the active CV is available; inactive CV files remain private.
6. Test adding a category, assigning an entry to it, and renaming it. Deletion is refused when entries still use the category.
7. Only after verifying, commit and push to GitHub.

## Security and behavior

- CV PDFs are stored in private R2, tracked in D1; only the active PDF is exposed by the public `/api/cv` endpoint.
- The public `/api/content` response exposes only the active CV link, never older CV versions.
- CV upload requires Cloudflare Access; files are uploaded private and are only made public upon activation.
- Category management requires Cloudflare Access and uses D1.
- Existing content and categories are not deleted by the migration.
- Do not run `0002_seed.sql` again.
- Test the public Worker and admin Worker before considering deployment complete.
