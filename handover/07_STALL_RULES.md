# STALL RULES — STRICT, NON-NEGOTIABLE (Steve, t54u + t67u)
A stalled/error-looping task once burned Steve's ENTIRE quota. These override everything.
1. **3-minute self-check, NOT a cap (Steve t1u, 2026-11-01: "the 3 minute rule says the function needs to check itself for moving progress instead of stalling or looping indefinitely. Not to cap.").** A task may run as long as it needs, but must check itself for real progress at least every 3 minutes (new log line / step / output) and abort itself when stuck or repeating the same step. Long work runs in the background and writes timestamped progress to a log.
2. **5-minute repeating stall check** while anything runs: a routine every 5 min (pause it when idle — empty checks waste quota) AND check progress first on every user message.
3. **Tasks must report.** Set work up so it constantly emits progress/error/running status (log lines, step markers, timestamps). A check looks for ACTUAL progress (new log lines, changed files, new step), not just "process alive".
4. **Loop rule (Steve t24u, 2026-11-01).** Finding a bug is NOT a stop reason: log it (test, expected, actual, root cause) and continue. Each step gets at most ONE retry, and only after something changed (code, test, data, approach). STOP only on a loop: the same test/step failing with the same error with nothing changed in between, or no new log progress for 3 minutes. Then reassess, or stop and wait for Steve. See agent-common for the method.
5. No progress since the last check, or a repeating step → kill it, tell Steve in one line what stalled and what you did.
6. Long servers (vite preview) are fine; builds/tests/probes are not allowed to hang.
7. Watch quota: no polling loops, no idle watchdogs, small focused briefs.
