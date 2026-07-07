# 109 — SaaS Readiness Plan

## Purpose

Nami starts as Kaif's personal local assistant. Later it can become a SaaS if desired.

## Current priority

Build single-user local-first Nami first.

Do not overcomplicate V1 with SaaS features.

## SaaS features later

- Authentication
- User accounts
- Workspaces
- Multi-tenant data isolation
- Billing/subscriptions
- Usage limits
- Admin dashboard
- Team collaboration
- Cloud memory sync
- API key management per user
- Privacy policy
- Terms of service
- Data export/delete
- Audit logs
- Abuse prevention

## SaaS risks

- More security complexity
- Higher cost
- Data privacy requirements
- Billing support
- Infrastructure operations
- Legal/compliance

## Migration strategy

V1 local data model should be designed so it can later support:
- user_id
- workspace_id
- tenant isolation
- role-based access

But do not build SaaS prematurely.
