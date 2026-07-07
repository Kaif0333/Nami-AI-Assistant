# 81 — Build Phases

## Phase rule

Each phase must be independently working before the next begins.

## Phase output format

Codex must report:

```text
Phase:
Files changed:
Commands run:
Tests run:
Result:
Known issues:
Next recommended phase:
```

## Stop rule

After finishing each phase, Codex must stop and wait for approval.
