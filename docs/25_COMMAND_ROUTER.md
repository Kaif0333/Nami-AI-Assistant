# 25 — Command Router

## Purpose

The command router decides what Nami should do with a user command.

## Intent categories

- chat.answer
- research.web
- utility.weather
- utility.time
- memory.save
- memory.search
- automation.trigger
- email.draft
- email.send_approval
- calendar.schedule
- resume.customize
- job.apply_assist
- browser.task
- screen.observe
- computer.control
- codex.build_task
- document.generate
- approval.respond

## Routing output

```json
{
  "intent": "resume.customize",
  "confidence": 0.91,
  "requiredAgent": "ResumeAgent",
  "riskLevel": "medium",
  "approvalRequired": false,
  "missingInputs": []
}
```

## Rule

If unsure, ask clarification or choose safe mode.
