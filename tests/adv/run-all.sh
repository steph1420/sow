#!/bin/bash
# Re-runs every SoW test in docs/TEST_CATALOG.md. TEST copy only; token from SOW_TEST_BRIDGE_TOKEN (never printed).
# Usage: tests/adv/run-all.sh [unit|probes|bridge|browser|all]   (default all). Needs `npx vite preview --port 4179` for probes/browser.
# Loop rule (t24u): bugs are logged, never a stop reason; each part runs once; 3-min no-progress watchdogs live inside each script.
set -u; cd "$(dirname "$0")/../.."; L=/workspace/sow-build/progress.log; O=/workspace/sow-build/adv; mkdir -p $O
URL=${SOW_URL:-http://localhost:4179/sow/}; WHAT=${1:-all}
log() { echo "$(date '+%F %T') run-all $*" | tee -a $L; }
log "start $WHAT"
if [[ $WHAT == all || $WHAT == unit ]]; then timeout 300 npx vitest run > $O/unit.log 2>&1; log "unit rc=$? $(grep -E 'Tests ' $O/unit.log | tail -1)"; fi
if [[ $WHAT == all || $WHAT == bridge ]]; then
  [ -z "${SOW_TEST_BRIDGE_TOKEN:-}" ] && { log "no token, skipping bridge"; } || {
  timeout 900 node tests/adv/bridge-adversarial.mjs > $O/bridge-run1.log 2>&1; log "bridge run1 rc=$? $(grep -c '^PASS' $O/bridge-run1.log) pass $(grep -c '^FAIL' $O/bridge-run1.log) fail"
  timeout 900 node tests/adv/bridge-adv2.mjs > $O/bridge-run2.log 2>&1; log "bridge run2 rc=$? $(tail -2 $O/bridge-run2.log | grep -o 'adv2 done.*')"; }
fi
if [[ $WHAT == all || $WHAT == probes ]]; then
  for p in offline-sync-probe.cjs sync-flow-probe.cjs submitted-derived-probe.cjs reload-probe.cjs swipe-confirm-probe.cjs swipe-path-probe.cjs swipe-single-probe.cjs name-swipe-setting-probe.cjs topic-sync-probe.cjs az-tween-probe.cjs sw-update-probe.cjs; do
    timeout 170 node tests/e2e/$p $URL > $O/probe-$p.log 2>&1; log "probe $p rc=$? $(grep -c '^PASS' $O/probe-$p.log) pass $(grep -c '^FAIL' $O/probe-$p.log) fail"; done
fi
if [[ $WHAT == all || $WHAT == browser ]]; then
  timeout 900 node tests/adv/browser-adv.cjs $URL > $O/browser-run.log 2>&1; log "browser-adv rc=$? $(grep -o 'advB done.*' $O/browser-run.log)"
  timeout 900 node tests/adv/browser-adv2.cjs $URL > $O/browser2-run.log 2>&1; log "browser-adv2 rc=$? $(grep -o 'advB2 done.*' $O/browser2-run.log)"
fi
log "finished $WHAT"
