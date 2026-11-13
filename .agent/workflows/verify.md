---
description: Run the full verification gate and report
---
1. Run `pnpm lint && pnpm typecheck`.
2. Run `pnpm test && pnpm test:int`.
3. Run `pnpm build`.
4. Run `gitleaks detect --no-banner` if installed (else `pnpm secrets:scan`).
5. Report each result; fix failures; repeat until all green. Do not claim success without output evidence.
