# 74 — Manual Test Checklist

## Before every commit

- [ ] App starts
- [ ] No obvious console errors
- [ ] No secrets changed
- [ ] New feature tested
- [ ] Approval rules not bypassed
- [ ] Docs updated
- [ ] Changelog updated

## UI

- [ ] Sidebar works
- [ ] Pages load
- [ ] Buttons work
- [ ] Empty states exist
- [ ] Error states exist
- [ ] Loading states exist

## Safety

- [ ] Risky action creates approval
- [ ] Reject blocks action
- [ ] Approve executes action
- [ ] Logs are stored

## Phase 6 research

- [ ] `/research` page loads
- [ ] Fast research returns a structured answer with sources
- [ ] Deep research returns a structured answer with sources or clear partial warnings
- [ ] Public URL research works for an allowed HTTPS URL
- [ ] Local/private URL research is rejected
- [ ] Chat current-information request returns citations
- [ ] Reopened chat conversation still shows citations
- [ ] Research action logs contain no secrets or full copied pages
- [ ] `corepack pnpm smoke:research` prints only provider/model/source-count
