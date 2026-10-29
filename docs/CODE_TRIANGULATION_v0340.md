# Triangulation v0.34.0 — device setup (pair / join / setup file)

Source: Steve t36u, t38u, lock t39u; plan docs/SETUP_PAIRING_PLAN.md; mocks setuppair-mj1-*.

| Feature | Where | Tests written first |
|---|---|---|
| Bridge ping / pairStart / pairClaim / pairCancel + version in replies | apps-script/Code.js `route_`, `pairStart_`, `pairClaim_` | apps-script/test/pair.test.ts (token gate, hash-only storage, single use, 300 s expiry, 5-try lockout, bad-code no count, cancel, ping) |
| Setup file build/parse, URL check, mask, countdown, client calls + error words | src/sync/setupPair.ts | src/sync/setupPair.test.ts |
| Other devices card, Pair host, Join, Import sheet | src/more/SetupDevices.tsx, SyncPage.tsx (`view` state), more.css `.sp-*` | tests/e2e/setup-pair-probe.cjs (real touch, 412×915) |

Touches nothing in merge/pull/push paths: Join and Import only write `syncUrl` + `bridgeToken` (Import fills `sheetUrl` only if blank), then the existing Sync now runs.
