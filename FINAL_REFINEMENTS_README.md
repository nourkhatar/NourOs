# Nour.OS final refinements — latest NourOS.zip baseline

## Included
- Public: direct one-click full PDF/image overlay; events scroll fix; NK favicon; browser title; default English on each new page load; French only after user clicks FR.
- Content Studio: ONE source input for title/description/introduction; no separate French input; automatic source-language detection on save, normalization to canonical English, and generated French stored in D1. No client-side hardcoded project French fallback.
- Existing translations: no destructive migration. After making a D1 backup and exporting JSON, click **SYNC EXISTING TRANSLATIONS** ONCE in Content Studio to replace existing manually entered French fields from the English originals. This is the only time old content is retranslated. If translation fails, the sync does not save partial content.
- All other fields, CV versions, custom categories and Cloudflare Access remain unchanged.

## DeepL setup
1. Register at https://www.deepl.com/pro-api and obtain a DeepL API key (API Free or API Pro; pricing/eligibility may vary). This requires an API plan, not just a normal translator account.
2. In PowerShell, cd C:\Users\LUMEN\Downloads\NourOs
3. `npx wrangler secret put DEEPL_API_KEY --config wrangler.admin.jsonc` and paste the key when prompted. Never put the key in GitHub, a chat, or wrangler vars.
4. API Free endpoint is default (`https://api-free.deepl.com`). For a Pro key, set `DEEPL_API_ENDPOINT` to `https://api.deepl.com` as a Worker variable in wrangler.admin.jsonc.

## Safe installation
1. Back up your project and `npx wrangler d1 export nour-os-db --remote --output "$env:USERPROFILE\Downloads\NourOS-D1-before-translation.sql"`.
2. Extract this patch to a temporary directory and copy the included relative files into your existing NourOs folder. DO NOT replace wrangler configs, src/shared.js or database migrations.
3. Configure DeepL secret as above.
4. `npx wrangler deploy --config wrangler.admin.jsonc` then `npx wrangler deploy --config wrangler.jsonc`.
5. Open Content Studio and use **EXPORT CONTENT JSON ↓** before the one-time sync. Then click **SYNC EXISTING TRANSLATIONS** once. Test one new French text and one English text in the editor, verify EN/FR public switch, project attachments, events heading, favicon, and CV.
6. Do not commit `.env`, keys, SQL exports or backups. Push to GitHub only after testing.

## Notes
- Each changed title/description may use two DeepL translation requests (to English, then French). Translation is done only on admin edits or explicit one-time sync, never for public visitors.
- Technical terms and names may be altered by machine translation; review important wording. DeepL quotas/rate limits may affect the bulk sync. For a large dataset, the request may time out; no content is saved on a translation failure.
- Native PDF viewer controls depend on browser; the app's downloadable permission is enforced by the Worker for `?download=1`, but browser built-in PDF controls may vary.
- Automatic source-language detection may misidentify very short titles or proper names. Review those fields before publishing.
