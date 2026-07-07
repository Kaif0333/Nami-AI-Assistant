# 62 — Safe Action Policy

## Low-risk actions

Allowed without approval:
- Answer questions
- Summarize text
- Draft content
- Search memory
- Create local note
- Show weather/time
- Create task

## Medium-risk actions

May require approval depending on context:
- Draft email
- Fill form without submitting
- Create calendar draft
- Generate resume
- Trigger safe n8n workflow

## High-risk actions

Always require approval:
- `send_email`
- `send_message`
- `submit_form`
- `submit_job_application`
- `delete_file`
- `modify_important_file`
- `run_risky_command`
- `install_global_package`
- `push_to_github`
- `deploy_app`
- `share_personal_data`
- `make_payment`
- `change_system_settings`
- `start_screen_control`
- `record_meeting`
- `trigger_external_send_workflow`

## Blocked actions

- `bypass_captcha`
- `steal_credentials`
- `secretly_record`
- `disable_approval_system`
- `interview_impersonation`
- `exfiltrate_secrets`

## Phase 3 implementation

- `SafeActionPolicyService.requiresApproval()` checks whether an action must create an approval request first.
- `SafeActionPolicyService.classifyRiskLevel()` returns `low`, `medium`, `high`, or `blocked`.
- Blocked actions cannot be approved.
- Safe demo actions may simulate approval flow but must not perform real external side effects.
