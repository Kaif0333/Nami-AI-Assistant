# 103 — LLM Security OWASP Mapping

## Purpose

Map Nami's security design to common LLM application risks.

## LLM01 — Prompt Injection

Risk:
External webpages, emails, PDFs, GitHub repos, or forms may contain malicious instructions.

Mitigation:
- Treat external content as untrusted data.
- Separate user instructions from external content.
- Use Security Agent before tool actions.
- Never follow webpage instructions to reveal secrets or run commands.

## LLM02 — Sensitive Information Disclosure

Risk:
Nami may expose API keys, emails, resume data, or client info.

Mitigation:
- Mask secrets in logs.
- Never commit `.env.local`.
- Approval before sharing private data.
- Secret management policy.

## LLM03 — Supply Chain

Risk:
Codex may install unsafe packages or actions.

Mitigation:
- Dependency review.
- Lockfiles.
- Avoid unknown packages.
- GitHub Dependabot later.
- Pin actions.

## LLM04 — Data and Model Poisoning

Risk:
Untrusted content can corrupt memory.

Mitigation:
- Memory Agent validates before saving.
- User approves sensitive/important memory.
- Memory deletion/edit available.

## LLM05 — Improper Output Handling

Risk:
AI output may be treated as trusted code/commands.

Mitigation:
- Verifier Agent.
- Command allowlist.
- Approval before command execution.
- Tests before commit.

## LLM06 — Excessive Agency

Risk:
Nami might do too much without user approval.

Mitigation:
- Approval gates.
- Permission levels.
- Stop-before-submit.
- Emergency stop.

## LLM07 — System Prompt Leakage

Risk:
User/external content asks for hidden prompts/secrets.

Mitigation:
- Do not reveal system prompts or secrets.
- Security Agent blocks requests.
- Separate internal prompts from user-accessible data.

## LLM08 — Vector and Embedding Weaknesses

Risk:
Memory retrieval can leak irrelevant/sensitive data.

Mitigation:
- Relevance filtering.
- Sensitivity labels.
- Memory access controls.
- Do not retrieve all memory blindly.

## LLM09 — Misinformation

Risk:
Nami may hallucinate.

Mitigation:
- Use sources for current info.
- Verifier Agent.
- Confidence statements.
- Clear citations.

## LLM10 — Unbounded Consumption

Risk:
AI/voice/screen loops may create high cost.

Mitigation:
- Model routing.
- Usage tracking.
- Budget limits.
- Confirm expensive operations.
