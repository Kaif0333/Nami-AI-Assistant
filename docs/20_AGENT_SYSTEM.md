# 20 — Agent System

## Agent architecture

Nami should use specialist agents coordinated by a Commander Agent.

## Agents

1. Commander Agent
2. Planner Agent
3. Memory Agent
4. Research Agent
5. Voice Agent
6. Automation Agent
7. Email Agent
8. Calendar Agent
9. Resume Agent
10. Job Agent
11. Browser Agent
12. Screen Agent
13. Coder Agent
14. Document Agent
15. Client Agent
16. Security Agent
17. Verifier Agent

## Agent communication

```text
Commander receives command
→ Planner breaks task
→ Security checks risk
→ Specialist agent acts
→ Verifier checks output
→ Approval if risky
→ Commander responds
```

## Rule

Agents do not directly execute high-risk actions. They create an approval request.
