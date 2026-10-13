import path from 'node:path';
import process from 'node:process';
import type { Options } from 'swagger-jsdoc';
import swaggerJSDoc from 'swagger-jsdoc';

import { env } from './env';

const GETTING_STARTED = `
Backend for the mortgage CRM — every flow in the product's user-flow document.
Endpoints are grouped by area below; each says which roles may call it.

## 1. Get a token

Sign-in lives in the separate **auth service** (port 8102, its own Swagger at
\`http://localhost:8102/v1/docs\`):

| Who | Call |
| --- | --- |
| Tenant Admin, Team Lead, Broker, Assistant | \`POST http://localhost:8102/api/v1/modauth/login\` \`{ "email", "password", "acceptTerms": true }\` |
| Super Admin | \`POST http://localhost:8102/api/v1/auth/super-admin/login\` |

**Easiest:** sign in from the auth service's Swagger in this same browser. It sets an
\`access_token\` cookie for localhost, which this API reads too, so every request here is
signed in with nothing to paste. Signing in as someone else switches who you are here.

**Or paste a token:** run the auth service with \`AUTH_TOKENDELIVERYMODE=json\` to get
\`accessToken\` in the login response, then click **Authorize** and paste it into
**crmBearer** (CRM) or **superAdminBearer** (Platform). Tokens last 15 minutes; refresh with
\`POST http://localhost:8102/api/v1/auth/refresh\`. A refresh more than 30 minutes after the last
one is refused (signed out after inactivity), and sessions end after 7 days regardless.

## 2. Roles

**SA** Super Admin · **TA** Tenant Admin · **TL** Team Lead · **BR** Broker · **AS** Assistant.
A Broker works their own book; a Team Lead their own book plus every person on their team; an
Assistant their team's book (view/edit, never create/delete/reveal). A Tenant Admin must complete
the brokerage profile before any other Tenant Admin screen works. The full table is
\`docs/permission-matrix.md\`.

## 3. Conventions

- Success: \`{ "success": true, "data": … }\`. Errors: \`{ "success": false, "message": "…" }\`
  with 400 (validation), 401 (no/expired token), 403 (role, scope, suspended brokerage,
  AI switched off), 404, 409 (conflict), 429 (daily AI allowance used up).
- **AI endpoints are stubs**: real access checks, the user's AI switch and the brokerage's daily
  AI limit, but placeholder output marked \`"stub": true\` until the AI team connects a model.
- File uploads (documents, voice notes) send the **raw file as the request body** with its
  \`Content-Type\`; document type and file name go in the query string.
- **Public** endpoints need no login (borrower upload link, booking page).
  **Internal** ones are service-to-service only (\`X-Internal-Secret\` header).

## 4. A typical walk-through

1. Broker: \`POST /crm/ai/review-notes\` → review → \`POST /crm/leads\` with \`acceptedTasks\`/\`draftEmail\`.
2. \`PUT /crm/leads/{id}/documents/required\` → \`POST /crm/leads/{id}/documents/request\` → the
   borrower uploads at \`/crm/public/document-requests/{token}/files\` → \`POST /crm/documents/{id}/apply\`.
3. \`PATCH /crm/leads/{id}/stage\` … \`POST /crm/leads/{id}/fund\` (creates the mortgage; renewal
   reminders follow automatically) → \`GET /crm/notifications\`.
`;

/** Area tags, in the order Swagger UI shows them. First matching rule wins. */
const TAGS: { name: string; description: string; match: RegExp }[] = [
  { name: 'Health', description: 'Liveness check', match: /^\/health/ },
  {
    name: 'Public (no login)',
    description: 'Borrower document-upload link and the brokerage booking page',
    match: /^\/crm\/public\//,
  },
  {
    name: 'Internal (service-to-service)',
    description: 'Called by the other services with X-Internal-Secret — not for browsers',
    match: /^\/(crm\/internal|platform\/webhooks)\//,
  },
  {
    name: 'Platform — Brokerages',
    description: 'SA: create, suspend, reactivate, cancel brokerages; exports',
    match: /^\/platform\/(brokerages(?!\/\{id\}\/usage)|exports)/,
  },
  {
    name: 'Platform — Usage & AI cost',
    description: 'SA: daily AI cost per brokerage, "allow extra for today"',
    match: /^\/platform\/brokerages\/\{id\}\/usage/,
  },
  {
    name: 'Platform — Activity log',
    description: 'SA: everything recorded, filter and export',
    match: /^\/platform\/activity-log/,
  },
  { name: 'Platform — My settings', description: 'SA: own account', match: /^\/platform\/me/ },
  {
    name: 'AI (stubs)',
    description: 'BR/TL/AS: voice notes, note review, email drafts, suggested tasks, AI Assistant',
    match: /^\/crm\/(ai\/|voice-notes|leads\/\{id\}\/ai\/)/,
  },
  {
    name: 'Dashboard & search',
    description: 'BR/TL/AS: broker dashboard and search',
    match: /^\/crm\/(dashboard|search)$/,
  },
  {
    name: 'Leads & clients',
    description: 'BR/TL (AS view/edit): create, list, stage, fund, mortgages, delete',
    match: /^\/crm\/(leads(\/\{id\}(\/(stage|fund|mortgages))?)?|clients)$/,
  },
  {
    name: 'Client intake',
    description: 'Applicants, employment, income, debts, properties, funds, follow-ups',
    match: /^\/crm\/leads\/\{id\}\/(intake|applicants|debts|properties|funds-sources|follow-ups)/,
  },
  {
    name: 'Person panel',
    description: 'The same panel everywhere: profile, affordability, notes, tags, reveal',
    match: /^\/crm\/leads\/(\{id\}\/(panel|affordability|notes|tags|profile|reveal)|affordability)/,
  },
  {
    name: 'Documents',
    description: 'Checklist, borrower request link, uploads, review read values',
    match: /^\/crm\/(leads\/\{id\}\/documents|documents\/)/,
  },
  {
    name: 'Email',
    description: 'Send from your own inbox; saved drafts',
    match: /^\/crm\/(emails|email-drafts|leads\/\{id\}\/email-drafts)/,
  },
  {
    name: 'Calendar & Google',
    description: 'Connect Google, appointments, team calendar',
    match: /^\/crm\/(integrations\/google|appointments|team\/calendar)/,
  },
  {
    name: 'Tasks',
    description: 'Tasks, suggested and unlinked tasks',
    match: /^\/crm\/(team\/)?tasks/,
  },
  {
    name: 'Contacts',
    description: 'Centres of influence (realtors, lawyers, …)',
    match: /^\/crm\/(team\/)?contacts/,
  },
  {
    name: 'Team Lead',
    description: 'TL: team dashboard, team book, reassign',
    match: /^\/crm\/team\//,
  },
  {
    name: 'Tenant Admin',
    description: 'TA: brokerage dashboard, profile, booking page, book, export, reassign',
    match: /^\/crm\/tenant\//,
  },
  {
    name: 'Reports',
    description: 'TA (tenant-wide) / TL (team): reports and CSV',
    match: /^\/crm\/reports/,
  },
  {
    name: 'Notifications',
    description: 'Reminders, the 9am digest and "you were notified" events',
    match: /^\/crm\/notifications/,
  },
  { name: 'My settings', description: 'AI features on or off', match: /^\/crm\/settings/ },
];

const ERROR = { $ref: '#/components/schemas/Error' };
const errorResponse = (description: string) => ({
  description,
  content: { 'application/json': { schema: ERROR } },
});

type Operation = {
  tags?: string[];
  security?: unknown[];
  parameters?: { in?: string }[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
};

/**
 * Tags every operation by area and gives every one the standard error
 * responses that apply to it, so the docs stay uniform as routes are added
 * (tests/unit/swagger-coverage.spec.ts fails on any undocumented route).
 */
function enrich(spec: Record<string, unknown>) {
  const paths = spec.paths as Record<string, Record<string, Operation>>;
  for (const [route, ops] of Object.entries(paths)) {
    const tag = TAGS.find((t) => t.match.test(route))?.name;
    for (const op of Object.values(ops)) {
      if (tag) op.tags = [tag];
      const responses = (op.responses ??= {});
      const add = (code: string, text: string) => {
        responses[code] ??= errorResponse(text);
      };
      const isInternal = /^\/(crm\/internal|platform\/webhooks)\//.test(route);
      if (isInternal) op.security = [{ internalSecret: [] }];
      if (op.requestBody || route.includes('{') || op.parameters?.some((p) => p.in === 'query')) {
        add('400', 'Validation failed — the message names each bad field');
      }
      if (op.security?.length || isInternal) {
        add(
          '401',
          isInternal ? 'Missing or wrong X-Internal-Secret' : 'Missing, invalid or expired token',
        );
      }
      if (op.security?.length) {
        add('403', 'Not allowed — wrong role, outside your scope, or your brokerage is suspended');
      }
      if (route.includes('{')) add('404', 'Not found');
      if (tag === 'AI (stubs)') add('429', "Your brokerage's daily AI allowance is used up");
      add('500', 'Something failed on the server');
    }
  }
  spec.tags = TAGS.map(({ name, description }) => ({ name, description }));
  return spec;
}

export const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: `${env.appName} API`,
      version: '1.0.0',
      description: GETTING_STARTED,
    },
    servers: [{ url: `http://localhost:${env.port}${env.apiPrefix}`, description: 'Local' }],
    components: {
      securitySchemes: {
        internalSecret: {
          type: 'apiKey',
          in: 'header',
          name: 'X-Internal-Secret',
          description: 'Shared INTERNAL_SERVICE_SECRET — service-to-service calls only',
        },
      },
    },
  },
  // process.cwd() (always the repo root — dev's `tsx watch server.ts` and
  // prod's `node dist/server.js` both run from /app), not __dirname: __dirname
  // shifts to dist/config once compiled, silently resolving to a docs/
  // directory that doesn't exist there and never surfacing as an error —
  // just an empty spec (confirmed: /docs rendered a valid but path-less
  // Swagger UI in the built image before this fix).
  apis: [
    path.join(process.cwd(), 'docs/swagger/*.yaml'),
    path.join(process.cwd(), 'modules/**/*.ts'),
  ],
};

export function buildSwaggerSpec() {
  return enrich(swaggerJSDoc(swaggerOptions) as Record<string, unknown>);
}
