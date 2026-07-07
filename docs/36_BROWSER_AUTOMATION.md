# 36 — Browser Automation

## Goal

Use websites safely through Playwright.

## Capabilities

- Open pages
- Extract text
- Click buttons
- Fill forms
- Upload files
- Screenshot pages
- Test web apps

## Use cases

- Job application assist
- Research webpages
- Testing user projects
- Filling basic forms
- Downloading allowed documents

## Safety

- Do not bypass CAPTCHA.
- Stop before final submit.
- Ask approval.
- Log every step.
- Avoid restricted websites.

## Browser task format

```json
{
  "goal": "Fill job application form",
  "url": "https://example.com",
  "steps": [],
  "stopBeforeSubmit": true
}
```
