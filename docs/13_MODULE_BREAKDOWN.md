# 13 — Module Breakdown

## Dashboard Module
Purpose: Main UI command center.

Includes:
- Home
- Chat
- Tasks
- Projects
- Automations
- Approvals
- Logs
- Settings

## Chat Module
Purpose: Text interaction with Nami.

Includes:
- Chat input
- Conversation list
- AI response
- Tool/action status

## Voice Module
Purpose: Speech input/output.

V1:
- Push-to-talk
- STT abstraction
- TTS abstraction

Later:
- Realtime voice
- Wake word
- Offline fallback

## Memory Module
Purpose: Store and retrieve useful context.

Includes:
- Profile memory
- Project memory
- Job memory
- Client memory
- Preference memory

## Research Module
Purpose: Web research and summaries.

Includes:
- Search
- Webpage reading
- Source extraction
- Report generation

## n8n Automation Module
Purpose: Trigger and monitor automations.

Includes:
- Webhook config
- Workflow runs
- Logs
- Approval hooks

## Email/Calendar Module
Purpose: Communication and scheduling.

Includes:
- Draft emails
- Meeting creation
- Calendar availability
- Approval gates

## Resume/Job Module
Purpose: Job application support.

Includes:
- Resume customization
- Cover letters
- JD analysis
- Application tracker

## Browser Automation Module
Purpose: Use websites with Playwright.

Includes:
- Browser tasks
- Form filling
- Page extraction
- Approval before submit

## Screen/Computer Module
Purpose: Observe and later control screen.

Includes:
- Observe mode
- Guide mode
- Control mode later
- Emergency stop

## Codex Builder Module
Purpose: Turn project goals into Codex tasks.

Includes:
- PRD generator
- Task splitter
- Codex prompt generator
- Test tracker

## Approval Module
Purpose: Gate risky actions.

Includes:
- Approval requests
- Approve/reject
- Risk levels
- Logs

## Logs Module
Purpose: Trace everything.

Includes:
- Command logs
- Action logs
- Error logs
- Automation logs
