# Nour.OS — Two-Worker deployment

This package preserves the existing public frontend while splitting its backend into two Workers.

## Routes

- `nour-os`: public assets, GET `/api/content`, public GET `/api/file/:id`. All `/admin` and `/admin/*` requests return 404. No write API exists.
- `nour-os-admin`: separate Content Studio at `/admin/`, admin CRUD and R2 uploads, admin file previews. **Every request is denied unless a verified Cloudflare Access JWT is present.**
- Both Workers use existing `nour-os-db` D1 and private `nour-os-files` R2.

## Deploy carefully

1. From repository root run `npm install` if dependencies aren't installed.
2. Push the new files to the **same existing GitHub repository**. No new repo needed.
3. Deploy the public Worker: `npx wrangler deploy --config wrangler.jsonc`.
4. Verify public portfolio works; verify `/admin/` returns 404 and `/admin/api/content` returns 404.
5. Deploy the admin Worker with placeholders intact: `npx wrangler deploy --config wrangler.admin.jsonc`. All requests should return 401 until Access is configured.
6. In Zero Trust > Access controls > Applications > Add > Self-hosted, add a **Workers** destination for `nour-os-admin` with **A Worker's production and preview URLs**. Do NOT add `nour-os`.
7. Add Allow policy > Include > Emails > your exact owner email. Enable One-time PIN (or MFA-backed identity provider). Save the application.
8. Find the Access application **AUD** (Application Audience tag) in its details and the **team domain** in Zero Trust settings. Set `ACCESS_TEAM_DOMAIN`, `ACCESS_AUD`, `ADMIN_EMAIL` in `wrangler.admin.jsonc` only. These are not passwords. Never commit secrets or API tokens.
9. Deploy admin again. Test login and test unauthorized access in a separate/private browser. Test public Worker remains open without login.
10. Only then upload private reports. Verify public file visibility and download settings.

### Important limitations

- Preventing the *download button* or setting `Content-Disposition: inline` cannot prevent a visitor from saving a public file through browser tools. For genuinely non-downloadable material, do not make the original file public; publish a separate preview instead.
- This project has not been independently security audited or tested in your Cloudflare account.
- The GitHub Actions workflow is **manual** and requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets. Do not enable automatic deploys until both Workers have been configured and tested.
- Admin is intentionally fail-closed until Access settings are configured.
