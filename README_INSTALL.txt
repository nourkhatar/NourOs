Nour.OS small cleanup patch (based on NourOS_Localization_Direct_Media_Consolidated.zip)

Changes:
- Remove the PDF/browser-save explanatory line beneath embedded media.
- Make language toggle show the CURRENT selected language (EN for English, FR for French), with an accessible explanation of what clicking does. This addresses the screenshot where the button displayed EN while the page was French.
- Remove the one-time translation cleanup panel from Content Studio. The guarded maintenance handler remains in JS, but the button is not displayed. No D1 data is deleted.

BACK UP the project first. Copy only the two paths in this archive into your local NourOs project, preserving directories. Do not overwrite Wrangler files.

Deploy both Workers:
  npx wrangler deploy --config wrangler.jsonc
  npx wrangler deploy --config wrangler.admin.jsonc

Hard refresh both pages. Confirm EN shows English navigation and FR shows French navigation. This patch does not translate old D1 content or modify existing translations.
