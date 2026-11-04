# Nour.OS — NK identity and persistent language

This is an incremental patch intended to be applied AFTER the consolidated localization/media update and the navigation/media cleanup patch. Do not apply to the original baseline alone.

1. Back up your current project and export D1.
2. Copy the public/ and admin-public/ directories from this archive over the same paths in your project. Do not overwrite Wrangler configs.
3. Deploy both Workers:
   npx wrangler deploy --config wrangler.jsonc
   npx wrangler deploy --config wrangler.admin.jsonc
4. Hard refresh both pages. Test EN -> FR -> reload, FR -> EN -> reload, light/dark mode, public/admin favicons, and the sidebar logo.

The chosen NK image is used as the browser favicon and sidebar logo. Public interface language is persisted in localStorage; a first-time visitor defaults to English. Static navigation labels and a few sidebar labels are explicitly localized. Existing D1 English/French text is unchanged; any missing or inaccurate dynamic French translations must still be corrected through the translation sync/DeepL workflow. No database migration or API key changes are included.
