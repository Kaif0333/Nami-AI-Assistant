# 61 — Threat Model

## Assets

- API keys
- Email data
- Calendar data
- Resume data
- Client data
- Files
- GitHub token
- n8n credentials
- Personal memories
- Screen/mic data

## Threats

- Secret leakage
- Wrong email sent
- Wrong form submitted
- Malicious webpage prompt injection
- Browser automation abuse
- Screen data exposure
- Accidental deletion
- Cost abuse
- OAuth misuse

## Mitigations

- Approval gates
- Secret masking
- Allowlists
- Logs
- Sensitive-page blocker
- Human confirmation
- Limited permissions
- Error recovery
- No CAPTCHA bypass
- No hidden monitoring
