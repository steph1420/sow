# STALL RULES — STRICT, NON-NEGOTIABLE (Steve, t54u + t67u)
A stalled/error-looping task once burned Steve's ENTIRE quota. These override everything.
1. **3-minute hard limit on ANY task/step/command.** Wrap every shell command in `timeout 180` (or less). Every subagent brief states the cap. Nothing runs unbounded.
2. **5-minute repeating stall check** while anything runs: a routine every 5 min (pause it when idle — empty checks waste quota) AND check progress first on every user message.
3. **Tasks must report.** Set work up so it constantly emits progress/error/running status (log lines, step markers, timestamps). A check looks for ACTUAL progress (new log lines, changed files, new step), not just "process alive".
4. **Same error twice = STOP.** Do not retry a third time. Reassess the approach, or stop and wait for Steve.
5. No progress in 5 min, repeating step, or cap exceeded → kill it, tell Steve in one line what stalled and what you did.
6. Long servers (vite preview) are fine; builds/tests/probes are not allowed to hang.
7. Watch quota: no polling loops, no idle watchdogs, small focused briefs.
