# Nour.OS Version 12 — Cloudflare production candidate

This repository keeps the approved **Version 11 public design** while replacing browser-only content with a Cloudflare D1-backed API and introducing a **separate, hosted Content Studio** under `/admin/`. Uploaded files live in a private R2 bucket.

**This is a production candidate, NOT a live deployment.** Do not publish until the Access app is configured, migrations are applied, and the security checklist below passes. No credentials or private reports are bundled. The original five certificate PDFs have deliberately been removed from publicly served assets; re-upload them through Content Studio after launch, with the desired permissions.

## 1. Create the resources

1. Create a **private** GitHub repository named `nour-os` and upload the *contents* of this folder, not the ZIP itself. Do not commit `.dev.vars`, secrets, private reports, or authentication tokens.
2. In Cloudflare, create a D1 database `nour-os-db` and an R2 Standard bucket `nour-os-files`. **Keep R2 private** (do not enable an `r2.dev` URL or public domain). R2 may require billing activation.
3. In the D1 dashboard, copy its database UUID and replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.jsonc`.
4. Configure Cloudflare Zero Trust / Access. Create a **Self-hosted** Access application for the exact Worker host and **path `/admin/*`**. Use an allow policy limited to **your own verified email address**, and require MFA at your identity provider. Make sure the Access application covers `/admin/api/*` as well as `/admin/` and `/admin/index.html`. Do not use a public `Everyone` allow rule. Test in a private browsing window.
5. From the Access app settings, copy the **Application AUD** and your **team domain** (e.g. `example.cloudflareaccess.com`). Set `ACCESS_AUD`, `ACCESS_TEAM_DOMAIN`, and `ADMIN_EMAIL` in `wrangler.jsonc` to the actual values. **The Worker verifies Access's signed JWT on every admin request, and refuses access when any value is missing or invalid.** The identity provider must include your verified email in the token.

**If Cloudflare Access cannot protect the exact `workers.dev` host/path on your account, do not bypass authentication.** Use a custom domain with Access, or wait to publish the admin until the host is supported. A public site may be published separately only after the admin routes are removed/disabled.

## 2. Local prerequisites and migrations

Install Node.js LTS and Git on your computer. In the project folder:

```bash
npm install
npx wrangler login
npx wrangler d1 migrations apply nour-os-db --remote
```

The first migration creates D1 tables. The second imports the **approved Version 11 seed data**. Do not run a destructive reset on an existing database. To update data after deployment, use the hosted Content Studio.

## 3. Deploy from GitHub

In Cloudflare Dashboard → Workers & Pages → Create → Import Git repository, select your **private** `nour-os` repo. Configure:

- Worker name: `nour-os`
- Production branch: `main`
- Root directory: `/`
- Build command: leave blank (static HTML/CSS/JS)
- Deploy command: `npx wrangler deploy`

Cloudflare can deploy when you push to `main`. You must complete the D1, R2, and Access configuration first; an incomplete placeholder config will fail or block admin access. `workers.dev` provides a free hostname (the exact account subdomain is assigned by Cloudflare).

## 4. What is dynamic

- `GET /api/content` returns the published content stored in D1, with only public file metadata.
- `/admin/` is the hosted Content Studio. It can edit profile, projects, experience, achievements, and standalone document records, with GitHub repository links.
- `PUT /admin/api/content` updates D1 after validating the Access JWT.
- `POST /admin/api/upload` stores PDFs/images in **private R2**, with private/public and download permissions. Maximum upload size in this starter is 20 MB per file.
- `PATCH /admin/api/files/:id` changes file permissions; `DELETE` removes an uploaded file.
- `GET /api/file/:id` streams a public file (or private file with a valid Access JWT). A `?download=1` request is denied unless download is permitted or the request is authorized as admin.

Files do not go into GitHub. Updating a project in Content Studio does not require a code redeployment.

## 5. Before inviting visitors

- [ ] Access denies `/admin/`, `/admin/index.html`, and `/admin/api/content` to a signed-out browser.
- [ ] Access permits **only your verified identity** and your MFA is enabled.
- [ ] No certificate or private report exists inside `public/`.
- [ ] Public `GET /api/content` does not include private file records.
- [ ] Private `GET /api/file/<id>` returns 404 when signed out.
- [ ] `?download=1` returns 403 for view-only public files.
- [ ] Uploaded files appear on the correct project or achievement after publishing.
- [ ] English, French, dark mode, light mode, navigation, and mobile layouts are checked in a real browser.
- [ ] Back up D1 and R2 before major content changes.

## Important limitations

This package is **not a completed security audit**. It has not been deployed or browser-tested against your Cloudflare account. Cloudflare Access setup and deployment must be completed by the account owner. `workers.dev`/Access route support and account-specific billing must be verified in the dashboard. Public view-only files can still be saved using browser functionality. The current Content Studio is a practical minimal editor, not a full-featured media management CMS. D1 content is stored as a JSON document in a row, which is sufficient for a personal portfolio but can be normalized later. Uploaded reports must be reviewed for personal/confidential information before making them public. Public asset files (avatar and portrait) remain publicly visible by design.
