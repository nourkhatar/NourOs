# Nour.OS single-button embedded CV viewer

This patch was built from the uploaded NourOS(1).rar project. It changes only public/app.js and public/styles.css.

Changes:
- One View CV button in the existing homepage and Contact positions.
- Opens the active PDF inside the existing on-page window modal.
- Native browser PDF toolbar handles downloading, printing, and zooming.
- Existing hover glow remains.
- No admin, R2, D1, or Worker backend changes.

Install:
1. Back up your current public/app.js and public/styles.css.
2. Copy the two public/ files from this ZIP into your NourOs/public/ directory.
3. Run `npx wrangler deploy --config wrangler.jsonc` from your project root.
4. Hard-refresh the homepage and Contact page and test the CV viewer.

Note: Embedded PDF toolbar support varies by browser; in browsers that do not support inline PDF, a fallback may be needed.
