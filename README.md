# Mutiara Line Community Desk

This is the full-stack CMT322 Penang LRT Mutiara Line community platform. It supports English, Chinese and Malay, and stores notices, issue reports, response history and alert preferences in D1. Optional report photos are stored in R2.

The site is a student project. Do not publish unverified construction or traffic information as an official notice.

## Main flows

- Project team: sign in, open /admin, claim the first administrator account with the one-time setup key, create a notice in draft or published state, edit or archive notices, inspect reports and photos, and add status updates with optional Chinese and Malay translations.
- Community member: read and filter published notices, open mapped locations, choose alert categories, submit an issue with an optional image, then track it by reference number. The submitting account can track its own report without entering the one-time access code.
- Language: choose English, 中文 or Bahasa Melayu from the header. The interface preference is saved in the browser. Staff-authored content falls back to English when a translation is missing.

## Access and storage

Hosted private access uses Sites sign-in. Report creation and alert preferences require a signed-in account. Reports are visible to their owner or to someone holding the reference and access code. Project team operations require an administrator record. The first administrator must claim the role using ADMIN_SETUP_KEY, stored as a Sites secret.

The site uses DB for D1 and BUCKET for R2, declared in .openai/hosting.json. The first migration is in drizzle/. Local development can set a test key in an ignored .dev.vars file.

## Local development

Run npm ci, npm run db:generate after schema changes, npm run build, and apply pending local migrations with the Wrangler command in the starter guidance. Then run npm run dev. The portable local preview supports a mock sign-in at /signin-with-chatgpt?return_to=/.

Run node scripts/smoke-local.mjs to exercise the local authenticated flow, including notice publication, report upload, tracking, status update and alert preferences. It creates only local test records.

## Operational notes

This version provides in-app category alerts. Email or SMS delivery would require an external delivery provider and credentials. The site starts owner-private; access for additional project team members or the wider public must be configured separately before real use.
