# Permission matrix

Generated from the actual guard code (not hand-written) — every row below is traced to a
specific `requireX` call, a route-level `requireModAuthRole(...)`, or an internal-secret
check. SOW deliverable **2.D1**. Roles: **SA** = Super Admin, **TA** = Tenant Admin,
**TL** = Team Lead, **BR** = Broker, **AS** = Assistant.

Legend: ✅ allowed · ✅\* allowed, scoped to the caller's own data/team/tenant · 🚫 blocked

## Auth & sessions (`modules/auth`, gen-auth-starter)

| Action                        | SA   | TA   | TL   | BR   | AS   | Guard                                                             |
| ----------------------------- | ---- | ---- | ---- | ---- | ---- | ----------------------------------------------------------------- |
| Log in, forgot/reset password | ✅   | ✅   | ✅   | ✅   | ✅   | Public — no role gate                                             |
| Accept an invitation          | ✅   | ✅   | ✅   | ✅   | ✅   | Token-gated, not role-gated (`InvitationServiceImpl.accept`)      |
| List / revoke my own sessions | ✅\* | ✅\* | ✅\* | ✅\* | ✅\* | `SessionController` — any authenticated caller, own sessions only |

## Invitations (`modauth_invitations`)

| Action                                   | SA   | TA   | TL  | BR  | AS  | Guard                                                                                    |
| ---------------------------------------- | ---- | ---- | --- | --- | --- | ---------------------------------------------------------------------------------------- |
| Invite a Tenant Admin                    | ✅   | 🚫   | 🚫  | 🚫  | 🚫  | `InvitationServiceImpl.requireCanInvite`                                                 |
| Invite a Team Lead, Broker, or Assistant | 🚫   | ✅   | 🚫  | 🚫  | 🚫  | same                                                                                     |
| Invite a Broker (only)                   | 🚫   | 🚫   | ✅  | 🚫  | 🚫  | same                                                                                     |
| Resend / cancel an invitation            | ✅\* | ✅\* | 🚫  | 🚫  | 🚫  | `requireManageableInvitation` — same tenant, or Super Admin for a brokerage-owner invite |

## People & Teams (`modauth_user_roles`, `modauth_teams`) — Tenant Admin only

| Action                                     | SA  | TA   | TL   | BR  | AS  | Guard                                                                                                                                 |
| ------------------------------------------ | --- | ---- | ---- | --- | --- | ------------------------------------------------------------------------------------------------------------------------------------- |
| List people in the brokerage               | 🚫  | ✅\* | 🚫   | 🚫  | 🚫  | `RoleResolver.requireTenantAdmin`                                                                                                     |
| Deactivate a person                        | 🚫  | ✅\* | 🚫   | 🚫  | 🚫  | same — 🚫 on a Tenant Admin target; blocked (409) while they still have assigned leads (SOW 2.11, checked live against `modules/crm`) |
| Create / list / delete a team              | 🚫  | ✅\* | 🚫   | 🚫  | 🚫  | same                                                                                                                                  |
| Add/remove a Broker or Assistant on a team | 🚫  | ✅\* | 🚫   | 🚫  | 🚫  | same                                                                                                                                  |
| View one team's detail                     | 🚫  | ✅\* | ✅\* | 🚫  | 🚫  | `TeamServiceImpl.get` — Tenant Admin (any team), or that team's own Team Lead                                                         |

## Super Admin console (`modules/platform` + `modules/tenant`)

| Action                                                   | SA  | Everyone else | Guard                                                                |
| -------------------------------------------------------- | --- | ------------- | -------------------------------------------------------------------- |
| Create/list/suspend/reactivate/cancel a brokerage tenant | ✅  | 🚫            | `requireSuperAdmin` (Node) / internal-secret (Java `modules/tenant`) |
| View tenant usage, AI cost, activity log, "my settings"  | ✅  | 🚫            | `requireSuperAdmin`                                                  |

## CRM — own book (`modules/crm`, Broker + Team Lead)

| Action                                                                 | TA  | TL   | BR   | AS  | Guard                                      |
| ---------------------------------------------------------------------- | --- | ---- | ---- | --- | ------------------------------------------ |
| Create/list/view own leads & clients, change stage, fund, add mortgage | 🚫  | ✅\* | ✅\* | —   | `requireModAuthRole('BROKER','TEAM_LEAD')` |
| Person panel, affordability, notes, tags, reveal (own book)            | 🚫  | ✅\* | ✅\* | —   | same                                       |
| Create/list/complete own tasks                                         | 🚫  | ✅\* | ✅\* | —   | same                                       |
| Connect/disconnect Google, send email, create appointment              | 🚫  | ✅\* | ✅\* | —   | same                                       |

_Assistant has no CRM-side route yet — the role exists and can join a team (this phase), but
per-endpoint view/edit access ("sees and edits permitted team clients, cannot delete" — SOW
2.13) is wired in as each relevant module (Drawer, Documents, Tasks) is built, not retrofitted
speculatively ahead of those modules existing. Tracked in `scope.md` Phase 3+._

## CRM — team-scoped (`modules/crm`, Team Lead only)

| Action                                               | TA  | TL   | BR  | Guard                                            |
| ---------------------------------------------------- | --- | ---- | --- | ------------------------------------------------ |
| Team dashboard, team book, team tasks, team calendar | 🚫  | ✅\* | 🚫  | `requireModAuthRole('TEAM_LEAD')`                |
| Open any lead/panel/affordability in the team's book | 🚫  | ✅\* | 🚫  | same, 403 outside the team (`getLeadWithAccess`) |
| Reassign a lead to another broker on the team        | 🚫  | ✅\* | 🚫  | same, 400 if the target isn't on the team        |

## CRM — tenant-wide (`modules/crm`, Tenant Admin only)

| Action                                                                     | TA   | TL   | BR  | Guard                                                                                              |
| -------------------------------------------------------------------------- | ---- | ---- | --- | -------------------------------------------------------------------------------------------------- |
| Reports (pipeline/renewals/team-performance/AI-usage) + export             | ✅\* | ✅\* | 🚫  | `requireModAuthRole('TENANT_ADMIN','TEAM_LEAD')` — Tenant Admin tenant-wide, Team Lead team-scoped |
| Brokerage profile, booking settings, tenant-wide book, self-service export | ✅\* | 🚫   | 🚫  | `requireModAuthRole('TENANT_ADMIN')`                                                               |

## Internal, service-to-service (no JWT — `X-Internal-Secret` only)

| Caller → Callee                                                            | Purpose                                                               |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `modules/crm` → `modules/auth` `GET /internal/modauth/users/{userId}`      | Resolve a modauth Role from a user id (JWT has no role claim)         |
| `modules/auth` → `modules/crm` `GET /internal/brokers/{userId}/lead-count` | Deactivation gate (SOW 2.11) — "do they still have clients assigned?" |
| `modules/auth` → `modules/platform` `POST /webhooks/owner-accepted`        | Flip a brokerage's onboarding status from Pending to Active           |
| `modules/platform`/`modules/crm` → `modules/tenant`                        | Tenant registry CRUD (Gen_TNT)                                        |

All four are gated by the same shared secret convention (`X-Internal-Secret` header, compared
against `INTERNAL_SERVICE_SECRET`), never a JWT — these are calls between this app's own
services, not something a browser or a CRM user ever reaches directly.
