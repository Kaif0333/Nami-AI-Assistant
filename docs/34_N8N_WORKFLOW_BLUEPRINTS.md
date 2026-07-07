# 34 — n8n Workflow Blueprints

## Daily briefing

Trigger:
- Schedule every morning

Steps:
1. Trigger Nami daily briefing endpoint.
2. Fetch tasks/calendar/jobs.
3. Generate summary.
4. Notify user.

Approval:
- Not required unless sending to others.

## Gmail job tracker

Trigger:
- New email matching job keywords

Steps:
1. Extract sender, subject, body.
2. Send to Nami for classification.
3. Extract company/role/deadline.
4. Add to job tracker.
5. Notify user.

Approval:
- Required before replying.

## Client follow-up

Trigger:
- Schedule daily

Steps:
1. Check clients with follow-up date due.
2. Ask Nami to draft message.
3. Create approval request.
4. Send only after approval.

## Calendar scheduler

Trigger:
- Nami webhook request

Steps:
1. Receive meeting details.
2. Check availability.
3. Create draft event.
4. Ask approval.
5. Create event after approval.

## Research report automation

Trigger:
- Manual or scheduled

Steps:
1. Receive topic.
2. Ask Nami Research Agent.
3. Generate report.
4. Save document/log.
