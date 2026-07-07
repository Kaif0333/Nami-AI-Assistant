# 116 — Google OAuth Scopes

## Purpose

This document defines safe Google OAuth scope planning for Gmail, Calendar, Drive, and Sheets integrations.

## Principle

Use least privilege. Request only the scopes needed for the current phase.

## Gmail scopes

For reading/summarizing:
```text
gmail.readonly
```

For drafting:
```text
gmail.compose
```

For sending:
```text
gmail.send
```

Rule:
- Do not request send scope until email approval system is working.

## Calendar scopes

For reading:
```text
calendar.readonly
```

For creating/editing events:
```text
calendar.events
```

Rule:
- Calendar event creation requires approval.

## Google Drive scopes

Use only if document storage/export is needed.

Prefer limited file scopes where possible.

## Google Sheets scopes

Use for job tracker/client tracker automation.

## Codex rule

Do not add broad Google scopes early. Add scopes phase by phase.
