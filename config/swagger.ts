import path from 'node:path';
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
  apis: [
    path.join(__dirname, '../docs/swagger/*.yaml'),
    path.join(__dirname, '../modules/**/*.ts'),
  ],
};
