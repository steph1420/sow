# Setup file + device pairing — plan (PROPOSED, mock setuppair-mj1, not built)

Goal: set up a second device without retyping the Apps Script URL + bridge token. Steve asked for both (t36u setup file, t38u Pairdrop-style pairing).

## UI (Settings › Sync, mocks in /workspace/sow-mockups/setuppair-mj1-*)
- a-sync: URL + masked Bridge token; "Other devices" card: Pair a device ›, Join with a code ›, Setup file [Export] [Import].
- b-pair-code: host shows 6-digit code, 5:00 countdown + bar, "One use · expires in 5 min", Cancel (calls pairCancel).
- c-join: Bridge URL + 6 digit boxes, Pair; success "Paired, syncing…" then auto Sync now.
- d-import: bottom sheet showing URL, masked token (last 4 only), export time; Apply / Cancel.

## Setup file `.sowsetup` (JSON, UTF-8)
```json
{ "kind": "sow-setup", "v": 1, "syncUrl": "https://script.google.com/macros/s/…/exec",
  "token": "<bridge token>", "sheetUrl": "<optional>", "exportedAt": "2026-10-29T17:40:00Z", "appVersion": "0.34.0" }
```
- Import validates: kind, v==1, syncUrl matches `^https://script.google.com/macros/s/[\w-]+/exec$`, token non-empty. Unknown keys ignored. Never auto-applies; always shows sheet d.
- After Apply: save to local prefs, call bridge `ping` with token; show error if rejected (nothing kept on failure).
- Export via Web Share (file) where available, else download. Filename `sow-setup.sowsetup`.

## Bridge actions (Code.gs, POST JSON)
- `pairStart {token}` → requires valid token. Generates 6 random digits (Utilities.getUuid-derived / crypto-quality), stores in Script Properties `PAIR` = `{hash: SHA-256(salt+code), salt, exp: now+300s, tries: 0}`. Only one active code; new pairStart replaces the old. Returns `{code, exp}`.
- `pairClaim {code}` → no token. Uses LockService. If no PAIR, or now>exp → `expired`. Compare hash; on mismatch tries++ and if tries>=5 delete PAIR → `locked`. On match: delete PAIR first (single use), return `{token}`.
- `pairCancel {token}` → deletes PAIR.
- Optional global throttle: max 20 pairClaim calls/hour in Script Properties counter.

## Security notes
- Code entropy is 10^6; 5 tries per code + 5 min expiry → ≤ 5e-6 guess chance per code issued. Codes only exist while Steve is showing one.
- Only a hash + salt is stored; plaintext code lives on the host screen only.
- Token transits only over HTTPS to script.google.com; never logged in the sheet, never in repo/CHANGELOG.
- The .sowsetup file IS the token: treat like a password; Export shows that warning. Rotating the token (menu "Reset token") invalidates all files/devices.
- Join requires the bridge URL too, so the code alone is useless.
- Tests first: pairStart without token rejected; claim after expiry; 5th bad try locks; second claim of same code fails; import rejects bad URL.
