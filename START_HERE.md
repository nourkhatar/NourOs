# Nour.OS — GitHub-ready Cloudflare package

## What this is
This is the approved Nour.OS frontend with a Cloudflare Worker API, D1 schema,
private R2 storage binding, and Access-protected admin routes. **It is not yet
configured for public production deployment.** No live deployment or end-to-end
security testing has been performed.

## Push to GitHub (PowerShell)
Extract this ZIP. Open PowerShell **inside the extracted NourOS-GitHub-Ready folder**
(the directory containing `package.json` and `wrangler.jsonc`).

```powershell
git init
git branch -M main
git remote add origin https://github.com/nourkhatar/nour-os.git
git add .
git commit -m "Nour.OS Cloudflare production foundation"
git push -u origin main
```

If the GitHub repository is new and has a README or other commit already,
create a truly empty repository or reconcile the existing history first.

## Cloudflare setup — AFTER pushing
1. Create the `nour-os-db` D1 database and `nour-os-files` R2 bucket.
2. Replace `REPLACE_WITH_YOUR_D1_DATABASE_ID` in `wrangler.jsonc` with the
   actual D1 database UUID from Cloudflare.
3. Create a Cloudflare Access application protecting `/admin*` and `/admin/api/*`;
   configure Access team domain, application audience, and allowlisted admin
   email in `wrangler.jsonc`. Configure strong MFA. Access settings must match
   the Worker JWT validation. The backend rejects admin requests until valid.
4. Run migrations against D1, verify seed content, and test public/private file
   access and admin authorization before making the site public.
5. In GitHub repository Settings → Secrets and variables → Actions, add
   `CLOUDFLARE_API_TOKEN` (minimum necessary Workers/D1/R2 deployment permissions)
   and `CLOUDFLARE_ACCOUNT_ID`. Never commit tokens or credentials.
6. After all checks, use Actions → Deploy Nour.OS to Cloudflare → Run workflow.
   This uses GitHub Actions and does NOT need Cloudflare's broken Git connection.

**Important:** Do not enable automatic push deployment until this is tested.
No private reports or certificate PDFs are bundled in `public/`.

## Known limits
- Browser view-only is not DRM: public documents can still be saved by visitors.
- Authentication, D1, and R2 must be tested in the real Cloudflare account.
- File uploads are capped at 20 MB by this Worker; larger uploads need an
  alternative multipart/presigned upload flow.
- The user-facing frontend design is preserved; deployment requires configuration.
