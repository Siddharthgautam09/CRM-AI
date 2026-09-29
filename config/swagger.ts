import path from 'node:path';
import process from 'node:process';
import type { Options } from 'swagger-jsdoc';

import { env } from './env';

export const swaggerOptions: Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: `${env.appName} API`,
      version: '1.0.0',
      description: 'Enterprise-grade API template with modular architecture',
    },
    servers: [{ url: `http://localhost:${env.port}${env.apiPrefix}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
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
