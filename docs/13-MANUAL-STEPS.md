# 13 — Manual Steps for the Human (things the agent cannot or must not do)

Legend: 🔴 needed before the milestone shown · 🟡 needed before pilot/launch · 🟢 optional. Never paste secrets into chat/prompt; put them only in `.env.local` files (gitignored) or provider dashboards.

## A. Local machine (before M0) 🔴
1. Install: Git, Node.js 22 LTS, pnpm (`corepack enable`), Docker Desktop, VS Code (optional), Android Studio (emulator) or a physical Android phone with **Expo Go**, GitHub CLI (`gh`) (optional), gitleaks (optional).
2. Create an empty GitHub repo `campusride` (private). Create a fine-grained personal access token or log in with `gh auth login`.
3. Create a folder, copy this plan package into it (contents of `campusride-plan/` at repo root, keeping `.agent/`, `docs/`, `AGENTS.md`), `git init`, commit, push.

## B. Antigravity setup 🔴
(UI labels may change between versions — if something differs, check Antigravity's in-app docs.)
1. Install Antigravity, sign in, **open the repo folder as the workspace**.
2. Settings → choose **Planning** mode (agent plans and produces artifacts) for the build; keep review policy on *request review* for terminal commands that delete, push, or touch databases; set browser access to allow only `localhost` + your staging URLs.
3. Confirm Antigravity picked up workspace rules (`.agent/rules`) and workflows (`.agent/workflows`: `/verify`, `/next-milestone`, `/stuck`) and `AGENTS.md`. If your version doesn't, paste the rule text into its Rules UI manually.
4. Pick the strongest available model for planning/architecture work; faster model for routine edits if offered.
5. Open the Agent Manager, start a new conversation, paste the master prompt (`ANTIGRAVITY_PROMPT.md`).
6. Review artifacts (task list, plan, walkthrough) at each milestone; approve/comment. Don't let it run milestones back-to-back without you reading the PROGRESS.md summary.

## C. Connectors / MCP servers (optional but helpful) 🟢
Add via Antigravity's MCP/agent tools settings (name may be "MCP Store" or "Manage MCP servers"):
- **GitHub MCP** — lets the agent open PRs/issues (use a token with minimal repo scope).
- **Postgres/Neon MCP** — read-only against **dev/staging only**, never production.
- **Context7 (docs lookup)** or similar docs MCP — current library docs (Expo, Drizzle).
- **Sentry MCP** — after Sentry is set up, for reading errors.
- **Figma MCP** — only if you make designs in Figma.
Principle: least privilege, read-only where possible, dev/staging only, rotate tokens after the project.

## D. Accounts & keys (create progressively; put values in `.env.local` and in provider secret stores)
| When | Service | What to create | Notes |
|---|---|---|---|
| M0 🔴 | GitHub | repo, Actions enabled, branch protection on `main` | |
| M3 🔴 | Cloudflare R2 | bucket `campusride-private`, API token (Object RW), CORS for web origin | Private bucket; note account id, endpoint |
| M2 🟡 | Email provider (Resend/Brevo) | API key, verified sending domain (SPF/DKIM) | Needed for real OTP emails; console adapter until then |
| M3 🟡 | SMS/Phone OTP | Decide D-04: Firebase Auth Phone / MSG91 / Twilio Verify | India SMS needs **DLT registration** (entity, sender ID, template) — start early, takes days |
| M4 🔴 | Google Cloud | project, **billing with budget alert + hard quota caps**, enable Places API, Routes/Directions API, Maps JavaScript API, Maps SDK for Android; create separate restricted keys (web: HTTP referrer, Android: package+SHA-1, server: IP/none+quota) | Agent uses fake provider until keys exist |
| M6 🟡 | Expo / EAS | `expo.dev` account, `eas login`, create project, get `projectId`; Firebase project for Android FCM credentials (push) | Push requires physical device |
| M12 🟡 | Neon | project in nearest region with PostGIS, pooled + direct connection strings, enable PITR | |
| M12 🟡 | Render | account, create API (Docker) + optional worker service, env vars, health check `/readyz` | |
| M12 🟡 | Vercel | import repo `apps/web`, env vars, custom domain | |
| M12 🟡 | Sentry | org + 3 projects (api, web, mobile), DSNs | |
| M12 🟡 | Uptime monitor | UptimeRobot/Better Stack check on `/readyz` + alert contacts | |
| M12 🟡 | Domain | buy/choose domain, DNS for web/api/email | |
Generate secrets locally: `openssl rand -base64 48` (JWT/HMAC pepper), `openssl rand -hex 32` (FIELD_ENC_KEY). Store them in a password manager.

## E. Decisions & inputs only you can supply 🔴🟡
1. Answer docs/12 §C questions (college name/domain, safety admin + on-call, trans/non-binary policy, legal review, budgets, Power BI need).
2. Provide real **hub coordinates** (ISBT, airport, railway station, college gates) for `db/seeds/hubs.json`.
3. Approve rate-per-km config and cap multiplier (D-07).
4. Final project name + logo (optional).
5. Review safety copy (SOS disclaimer), privacy policy, ToS, grievance officer details; get college/legal sign-off.

## F. Real-world safety & compliance work (cannot be automated) 🟡
- Written permission from college authority; define who is the **safety administrator**, on-call schedule, escalation to local police/college security; train them on the SOS console.
- Check insurance position for drivers/passengers and the legal stance on cost-sharing and two-wheeler pillion rides.
- Data protection: appoint grievance officer, publish notice, decide retention; breach response owner.
- Recruit 20–30 pilot users incl. women students for usability and safety feedback **before** wider launch; run a closed pilot (2–4 weeks).
- Perform the on-device SOS test with real phones and real trusted contacts.

## G. At each milestone (your review routine, 10 minutes)
Read the walkthrough artifact → open `docs/PROGRESS.md` → run `pnpm verify` yourself once → try the feature in the browser/emulator → reply "approved, proceed to M(n+1)" or give changes.

## H. Build & distribute mobile 🟡
`eas build -p android --profile preview` → share APK link with pilot users; Play Store later (developer account fee, privacy declarations, data-safety form, test-track review).
