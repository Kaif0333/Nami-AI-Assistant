# 94 — Error Handling

## Error principles

- Never fail silently.
- Show understandable error.
- Log details.
- Provide retry option.
- Protect secrets.

## Error response

```json
{
  "success": false,
  "error": {
    "code": "N8N_WEBHOOK_FAILED",
    "message": "The automation workflow could not be triggered.",
    "details": {}
  }
}
```

## UI error

Show:
- What failed
- Possible reason
- What user can do
- Retry button
- Log ID
