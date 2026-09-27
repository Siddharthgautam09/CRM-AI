"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerOptions = void 0;
const node_path_1 = __importDefault(require("node:path"));
const env_1 = require("./env");
exports.swaggerOptions = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: `${env_1.env.appName} API`,
            version: '1.0.0',
            description: 'Enterprise-grade API template with modular architecture',
        },
        servers: [{ url: `http://localhost:${env_1.env.port}${env_1.env.apiPrefix}` }],
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
    apis: [node_path_1.default.join(__dirname, '../docs/swagger/*.yaml'), node_path_1.default.join(__dirname, '../modules/**/*.ts')],
};
